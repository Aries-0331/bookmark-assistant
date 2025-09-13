// 🔐 Secure OAuth Token Exchange Server
// This server handles OAuth flows for the Bookmark Notion Sync Chrome extension

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS - Only allow your Chrome extension
const allowedOrigins = [
  `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}`,
  'http://localhost:3000', // For development
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`Blocked CORS request from: ${origin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth endpoints
app.use('/oauth', authLimiter);

// 🗄️ In-memory storage (replace with proper database in production)
const userStore = new Map();

// 🔐 Middleware to validate extension requests
const validateExtension = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const extensionId = req.headers['x-extension-id'];
  const expectedId = process.env.ALLOWED_EXTENSION_ID;
  
  if (!extensionId || extensionId !== expectedId) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid extension ID' 
    });
  }
  
  next();
};

// 🔐 Middleware to validate JWT sessions
const validateSession = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Session token required' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid session token' 
    });
  }
};

// 📝 Audit logging
const auditLog = (action: string, userId: string, details: any = {}) => {
  console.log(`[AUDIT] ${new Date().toISOString()} - ${action}`, {
    userId,
    ...details
  });
};

// 🎯 OAuth Token Exchange Endpoint
app.post('/oauth/exchange', validateExtension, async (req, res) => {
  try {
    const { code, redirectUri, extensionUserId } = req.body;
    
    // Validate input
    if (!code || !redirectUri || !extensionUserId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: code, redirectUri, extensionUserId'
      });
    }
    
    auditLog('oauth_exchange_start', extensionUserId, { redirectUri });
    
    // Exchange code for tokens with Notion
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      auditLog('oauth_exchange_failed', extensionUserId, { 
        status: tokenResponse.status,
        error: errorData 
      });
      
      return res.status(400).json({
        error: 'OAuth Exchange Failed',
        message: errorData.error_description || 'Failed to exchange authorization code',
        details: errorData
      });
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store user data securely
    const userData = {
      extensionUserId,
      notionAccessToken: tokenData.access_token,
      notionRefreshToken: tokenData.refresh_token,
      notionBotId: tokenData.bot_id,
      notionWorkspaceId: tokenData.workspace_id,
      duplicatedTemplateId: tokenData.duplicated_database_id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    userStore.set(extensionUserId, userData);
    
    // Generate session JWT (don't include sensitive tokens)
    const sessionToken = jwt.sign(
      { 
        userId: extensionUserId,
        workspaceId: tokenData.workspace_id,
        botId: tokenData.bot_id,
        hasTemplate: !!tokenData.duplicated_database_id
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    auditLog('oauth_exchange_success', extensionUserId, {
      workspaceId: tokenData.workspace_id,
      hasTemplate: !!tokenData.duplicated_database_id
    });
    
    // Return session info (no sensitive tokens)
    res.json({
      success: true,
      sessionToken,
      user: {
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name,
        workspaceIcon: tokenData.workspace_icon,
        duplicatedTemplateId: tokenData.duplicated_database_id || null,
        hasTemplate: !!tokenData.duplicated_database_id
      }
    });
    
  } catch (error) {
    console.error('OAuth exchange error:', error);
    auditLog('oauth_exchange_error', req.body.extensionUserId || 'unknown', { error: error.message });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process OAuth exchange'
    });
  }
});

// 🔄 Token Refresh Endpoint
app.post('/oauth/refresh', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    
    if (!userData || !userData.notionRefreshToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found or no refresh token available'
      });
    }
    
    // Refresh tokens with Notion
    const refreshResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: userData.notionRefreshToken,
      }),
    });
    
    if (!refreshResponse.ok) {
      auditLog('token_refresh_failed', userId, { status: refreshResponse.status });
      return res.status(400).json({
        error: 'Token Refresh Failed',
        message: 'Failed to refresh access token'
      });
    }
    
    const refreshData = await refreshResponse.json();
    
    // Update stored tokens
    userData.notionAccessToken = refreshData.access_token;
    if (refreshData.refresh_token) {
      userData.notionRefreshToken = refreshData.refresh_token;
    }
    userData.updatedAt = new Date().toISOString();
    
    userStore.set(userId, userData);
    
    auditLog('token_refresh_success', userId);
    
    res.json({
      success: true,
      message: 'Tokens refreshed successfully'
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh tokens'
    });
  }
});

// � Automatic Token Refresh & Retry Helper
const makeNotionRequest = async (userData: any, url: string, options: any = {}) => {
  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${userData.notionAccessToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
          ...options.headers,
        },
      });
      
      // If unauthorized and we have a refresh token, try to refresh
      if (response.status === 401 && userData.notionRefreshToken && attempt === 0) {
        console.log('Access token expired, attempting refresh...');
        
        const refreshResponse = await fetch('https://api.notion.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: userData.notionRefreshToken,
          }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          userData.notionAccessToken = refreshData.access_token;
          if (refreshData.refresh_token) {
            userData.notionRefreshToken = refreshData.refresh_token;
          }
          userData.updatedAt = new Date().toISOString();
          userStore.set(userData.extensionUserId, userData);
          
          console.log('Token refreshed successfully, retrying request...');
          attempt++;
          continue; // Retry with new token
        }
      }
      
      return response;
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      attempt++;
      console.log(`Request failed (attempt ${attempt}), retrying...`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
  
  throw new Error('Max retries exceeded');
};

// 📊 Enhanced Database Query with Upsert Logic
app.post('/notion/query-database', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    const { databaseId, filter, sorts } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    const queryPayload = {
      ...(filter && { filter }),
      ...(sorts && { sorts }),
      page_size: 100
    };
    
    const response = await makeNotionRequest(
      userData,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify(queryPayload)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: 'Notion API Error',
        message: 'Failed to query database',
        details: errorData
      });
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      results: data.results,
      nextCursor: data.next_cursor,
      hasMore: data.has_more
    });
    
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to query database'
    });
  }
});

// 🔄 Smart Bookmark Upsert (Create or Update)
app.post('/bookmarks/upsert', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    const { bookmarks, databaseId } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    const targetDatabaseId = databaseId || userData.duplicatedTemplateId;
    if (!targetDatabaseId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No database ID provided and no template database found'
      });
    }
    
    auditLog('bookmark_upsert_start', userId, { 
      bookmarkCount: bookmarks.length,
      databaseId: targetDatabaseId 
    });
    
    // Step 1: Query existing bookmarks to check for duplicates
    const existingBookmarksResponse = await makeNotionRequest(
      userData,
      `https://api.notion.com/v1/databases/${targetDatabaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          filter: {
            property: '_sync_id',
            rich_text: {
              is_not_empty: true
            }
          }
        })
      }
    );
    
    const existingBookmarks = new Map();
    if (existingBookmarksResponse.ok) {
      const existingData = await existingBookmarksResponse.json();
      existingData.results.forEach((page: any) => {
        const syncId = page.properties._sync_id?.rich_text?.[0]?.text?.content;
        if (syncId) {
          existingBookmarks.set(syncId, page.id);
        }
      });
    }
    
    // Step 2: Process bookmarks with upsert logic
    const results = [];
    const batchSize = 3;
    
    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (bookmark) => {
        try {
          const syncId = bookmark.syncId || `${bookmark.url}-${Date.now()}`;
          const existingPageId = existingBookmarks.get(syncId);
          
          const properties = {
            'Title': {
              title: [{ text: { content: bookmark.title || 'Untitled' } }]
            },
            'URL': {
              url: bookmark.url
            },
            'Description': {
              rich_text: [{ text: { content: bookmark.description || '' } }]
            },
            'Created': {
              date: { start: bookmark.dateAdded || new Date().toISOString() }
            },
            'Path': {
              rich_text: [{ text: { content: bookmark.path || 'Bookmarks' } }]
            },
            '_sync_id': {
              rich_text: [{ text: { content: syncId } }]
            }
          };
          
          let response;
          let operation;
          
          if (existingPageId) {
            // Update existing page
            operation = 'updated';
            response = await makeNotionRequest(
              userData,
              `https://api.notion.com/v1/pages/${existingPageId}`,
              {
                method: 'PATCH',
                body: JSON.stringify({ properties })
              }
            );
          } else {
            // Create new page
            operation = 'created';
            response = await makeNotionRequest(
              userData,
              'https://api.notion.com/v1/pages',
              {
                method: 'POST',
                body: JSON.stringify({
                  parent: {
                    type: 'database_id',
                    database_id: targetDatabaseId
                  },
                  properties
                })
              }
            );
          }
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Notion API error: ${errorData.message || response.statusText}`);
          }
          
          const pageData = await response.json();
          return {
            success: true,
            operation,
            bookmark: bookmark.title,
            pageId: pageData.id,
            url: pageData.url,
            syncId
          };
          
        } catch (error) {
          return {
            success: false,
            bookmark: bookmark.title,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting
      if (i + batchSize < bookmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const created = results.filter(r => r.success && r.operation === 'created');
    const updated = results.filter(r => r.success && r.operation === 'updated');
    const failed = results.filter(r => !r.success);
    
    auditLog('bookmark_upsert_complete', userId, {
      total: bookmarks.length,
      created: created.length,
      updated: updated.length,
      failed: failed.length
    });
    
    res.json({
      success: true,
      summary: {
        total: bookmarks.length,
        created: created.length,
        updated: updated.length,
        failed: failed.length
      },
      results: results
    });
    
  } catch (error) {
    console.error('Bookmark upsert error:', error);
    auditLog('bookmark_upsert_error', req.user?.userId || 'unknown', { error: error.message });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upsert bookmarks'
    });
  }
});

// 🗄️ Get User's Notion Databases
app.get('/notion/databases', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    const response = await makeNotionRequest(
      userData,
      'https://api.notion.com/v1/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            value: 'database',
            property: 'object'
          }
        })
      }
    );
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Notion API Error',
        message: 'Failed to fetch databases'
      });
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      databases: data.results.map((db: any) => ({
        id: db.id,
        title: db.title?.[0]?.plain_text || 'Untitled',
        url: db.url,
        createdTime: db.created_time,
        lastEditedTime: db.last_edited_time
      }))
    });
    
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch databases'
    });
  }
});

// 📊 Get User Profile & Status
app.get('/user/profile', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        userId: userData.extensionUserId,
        workspaceId: userData.notionWorkspaceId,
        hasTemplate: !!userData.duplicatedTemplateId,
        databaseId: userData.duplicatedTemplateId,
        databaseName: userData.bookmarkDatabaseName || 'Chrome Bookmarks DB',
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      }
    });
    
  } catch (error) {
    console.error('User profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

// 🎯 Server-First: Sync Bookmarks (High-Level Endpoint)
app.post('/bookmarks/sync', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    const { bookmarks, databaseId } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    if (!bookmarks || !Array.isArray(bookmarks)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing or invalid bookmarks array'
      });
    }
    
    auditLog('bookmark_sync_start', userId, { 
      bookmarkCount: bookmarks.length,
      databaseId 
    });
    
    const results = [];
    const errors = [];
    
    // Process bookmarks in batches to respect Notion API rate limits
    const batchSize = 3; // Notion allows 3 requests per second
    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (bookmark) => {
        try {
          const properties = {
            'Title': {
              title: [{ text: { content: bookmark.title || 'Untitled' } }]
            },
            'URL': {
              url: bookmark.url
            },
            'Description': {
              rich_text: [{ text: { content: bookmark.description || '' } }]
            },
            'Created': {
              date: { start: bookmark.dateAdded || new Date().toISOString() }
            },
            'Path': {
              rich_text: [{ text: { content: bookmark.path || 'Bookmarks' } }]
            },
            '_sync_id': {
              rich_text: [{ text: { content: bookmark.syncId || `${bookmark.url}-${Date.now()}` } }]
            }
          };
          
          const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userData.notionAccessToken}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({
              parent: {
                type: 'database_id',
                database_id: databaseId || userData.duplicatedTemplateId
              },
              properties
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Notion API error: ${errorData.message || response.statusText}`);
          }
          
          const pageData = await response.json();
          return {
            success: true,
            bookmark: bookmark.title,
            pageId: pageData.id,
            url: pageData.url
          };
          
        } catch (error) {
          return {
            success: false,
            bookmark: bookmark.title,
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting: wait 1 second between batches
      if (i + batchSize < bookmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    auditLog('bookmark_sync_complete', userId, {
      total: bookmarks.length,
      successful: successful.length,
      failed: failed.length
    });
    
    res.json({
      success: true,
      summary: {
        total: bookmarks.length,
        successful: successful.length,
        failed: failed.length
      },
      results: results
    });
    
  } catch (error) {
    console.error('Bookmark sync error:', error);
    auditLog('bookmark_sync_error', req.user?.userId || 'unknown', { error: error.message });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync bookmarks'
    });
  }
});

// 🎨 Template Duplication & Setup
app.post('/template/duplicate', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    const { templateId } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    const defaultTemplateId = '2659466d-e76d-8071-b304-f2e6654873bd';
    const templateToDuplicate = templateId || defaultTemplateId;
    
    auditLog('template_duplicate_start', userId, { templateId: templateToDuplicate });
    
    // Step 1: Get the template database structure
    const templateResponse = await fetch(`https://api.notion.com/v1/databases/${templateToDuplicate}`, {
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });
    
    if (!templateResponse.ok) {
      return res.status(400).json({
        error: 'Template Access Failed',
        message: 'Could not access the bookmark template. Please ensure it\'s shared with your integration.'
      });
    }
    
    const templateData = await templateResponse.json();
    
    // Step 2: Create a new database with the same structure
    const newDatabasePayload = {
      parent: {
        type: 'page_id',
        page_id: userData.notionWorkspaceId // Create in workspace root
      },
      title: [
        {
          type: 'text',
          text: { content: '� Chrome Bookmarks DB' }
        }
      ],
      properties: templateData.properties,
      // Copy view configurations if available
      ...(templateData.description && { description: templateData.description })
    };
    
    const createResponse = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(newDatabasePayload),
    });
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return res.status(400).json({
        error: 'Database Creation Failed',
        message: errorData.message || 'Failed to create bookmark database',
        details: errorData
      });
    }
    
    const newDatabase = await createResponse.json();
    
    // Step 3: Update user data with new database
    userData.duplicatedTemplateId = newDatabase.id;
    userData.bookmarkDatabaseName = '📚 Chrome Bookmarks DB';
    userData.updatedAt = new Date().toISOString();
    userStore.set(userId, userData);
    
    auditLog('template_duplicate_success', userId, {
      newDatabaseId: newDatabase.id,
      databaseName: newDatabase.title?.[0]?.plain_text
    });
    
    res.json({
      success: true,
      database: {
        id: newDatabase.id,
        name: newDatabase.title?.[0]?.plain_text || '📚 Chrome Bookmarks DB',
        url: newDatabase.url,
        createdTime: newDatabase.created_time
      },
      message: 'Template duplicated successfully! Your Chrome Bookmarks DB is ready.'
    });
    
  } catch (error) {
    console.error('Template duplication error:', error);
    auditLog('template_duplicate_error', req.user?.userId || 'unknown', { error: error.message });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to duplicate template'
    });
  }
});

// �📄 Create Individual Notion Page (Bookmark) - Legacy Support
app.post('/notion/create-page', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    const { databaseId, properties } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }
    
    if (!databaseId || !properties) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: databaseId, properties'
      });
    }
    
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: {
          type: 'database_id',
          database_id: databaseId
        },
        properties
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: 'Notion API Error',
        message: 'Failed to create page',
        details: errorData
      });
    }
    
    const pageData = await response.json();
    
    auditLog('page_created', userId, { 
      pageId: pageData.id,
      databaseId 
    });
    
    res.json({
      success: true,
      page: {
        id: pageData.id,
        url: pageData.url,
        createdTime: pageData.created_time
      }
    });
    
  } catch (error) {
    console.error('Page creation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create page'
    });
  }
});

// 🔍 Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🔐 OAuth Server running on port ${PORT}`);
  console.log(`🛡️ Allowed extension ID: ${process.env.ALLOWED_EXTENSION_ID}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// 🏗️ Type definitions for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        workspaceId: string;
        botId: string;
        hasTemplate: boolean;
      };
    }
  }
}

export default app;
