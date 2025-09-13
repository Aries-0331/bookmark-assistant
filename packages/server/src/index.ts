// 🔐 Secure OAuth Token Exchange Server
// This server handles OAuth flows for the Bookmark Notion Sync Chrome extension

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type definitions
interface UserData {
  userId: string;
  notionAccessToken: string;
  notionRefreshToken?: string;
  databases?: any[];
  templateDatabaseId?: string;
  lastActivity: Date;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

interface BookmarkItem {
  title: string;
  url: string;
  folder?: string;
  tags?: string[];
  dateAdded?: string;
  syncId?: string;
}

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

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/oauth', authLimiter);
app.use('/notion', apiLimiter);
app.use('/bookmarks', apiLimiter);

// 🔐 Extension validation middleware
const validateExtension = (req: Request, res: Response, next: NextFunction) => {
  const extensionId = req.headers['x-extension-id'] as string;
  
  if (!extensionId || extensionId !== process.env.ALLOWED_EXTENSION_ID) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid extension identity'
    });
  }
  
  next();
};

// 🔐 Middleware to validate JWT sessions
const validateSession = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | ${action} | User: ${userId} | ${JSON.stringify(details)}`);
};

// 🗄️ In-memory user storage (replace with database in production)
const userStore = new Map<string, UserData>();

// ⏰ Session cleanup (every hour)
setInterval(() => {
  const now = new Date();
  const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [userId, userData] of userStore.entries()) {
    if (now.getTime() - userData.lastActivity.getTime() > expiredThreshold) {
      userStore.delete(userId);
      auditLog('session_expired', userId);
    }
  }
}, 60 * 60 * 1000);

// 🎯 Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 🔄 OAuth Token Exchange Endpoint
app.post('/oauth/exchange', validateExtension, async (req: Request, res: Response) => {
  try {
    const { code, extensionUserId, templateDatabaseId } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required'
      });
    }

    // Exchange code for tokens with Notion
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}/oauth-callback.html`
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Notion token exchange failed:', errorData);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Failed to exchange code for token'
      });
    }

    const tokenData = await tokenResponse.json();
    const userId = extensionUserId || `user_${Date.now()}`;

    // Store user data securely on server
    const userData: UserData = {
      userId,
      notionAccessToken: tokenData.access_token,
      notionRefreshToken: tokenData.refresh_token,
      templateDatabaseId,
      databases: [],
      lastActivity: new Date()
    };

    userStore.set(userId, userData);

    // Create JWT session token
    const sessionToken = jwt.sign(
      { userId, timestamp: Date.now() },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    auditLog('oauth_exchange_success', userId, {
      hasRefreshToken: !!tokenData.refresh_token,
      templateDatabaseId
    });

    res.json({
      success: true,
      sessionToken,
      userId,
      templateDatabaseId: templateDatabaseId || null,
      message: 'OAuth exchange successful'
    });
    
  } catch (error) {
    console.error('OAuth exchange error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('oauth_exchange_error', req.body.extensionUserId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process OAuth exchange'
    });
  }
});

// 🔄 Token Refresh Endpoint
app.post('/oauth/refresh', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    
    if (!userData || !userData.notionRefreshToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User session not found or no refresh token available'
      });
    }

    // Refresh the access token
    const refreshResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64')}`,
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: userData.notionRefreshToken
      })
    });

    if (!refreshResponse.ok) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Failed to refresh access token'
      });
    }

    const newTokenData = await refreshResponse.json();
    
    // Update stored tokens
    userData.notionAccessToken = newTokenData.access_token;
    if (newTokenData.refresh_token) {
      userData.notionRefreshToken = newTokenData.refresh_token;
    }
    userData.lastActivity = new Date();
    
    userStore.set(userId, userData);
    auditLog('token_refresh_success', userId);

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('token_refresh_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
});

// 🔄 Retry wrapper for Notion API requests
const notionApiRequest = async (url: string, options: any, maxRetries = 3) => {
  let attempt = 1;
  
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || '1';
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        attempt++;
        continue;
      }
      
      return response;
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      attempt++;
      console.log(`Request failed (attempt ${attempt}), retrying...`, error instanceof Error ? error.message : error);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
};

// 📊 Enhanced Database Query with Upsert Logic
app.post('/notion/query-database', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    const { databaseId, filter, sorts } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    const response = await notionApiRequest(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter,
        sorts,
        page_size: 100
      })
    });

    if (!response!.ok) {
      const errorData = await response!.text();
      return res.status(response!.status).json({
        error: 'Notion API Error',
        message: errorData
      });
    }

    const data = await response!.json();
    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    res.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('database_query_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to query database'
    });
  }
});

// 🚀 Enhanced Bookmark Upsert with Duplicate Prevention
app.post('/bookmarks/upsert', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    const { databaseId, bookmarks } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Bookmarks array is required and cannot be empty'
      });
    }

    // Step 1: Query existing bookmarks to prevent duplicates
    const existingResponse = await notionApiRequest(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ property: 'Created', direction: 'descending' }]
      })
    });

    const existingData = await existingResponse!.json();
    const existingBookmarks = new Map();
    
    if (existingData.results) {
      existingData.results.forEach((page: any) => {
        const syncId = page.properties['Sync ID']?.rich_text?.[0]?.text?.content;
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
      
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
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
            'Folder': {
              rich_text: [{ text: { content: bookmark.folder || 'Default' } }]
            },
            'Tags': {
              multi_select: (bookmark.tags || []).map((tag: string) => ({ name: tag }))
            },
            'Date Added': {
              date: { start: bookmark.dateAdded || new Date().toISOString() }
            },
            'Sync ID': {
              rich_text: [{ text: { content: syncId } }]
            }
          };

          let response;
          if (existingPageId) {
            // Update existing page
            response = await notionApiRequest(`https://api.notion.com/v1/pages/${existingPageId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${userData.notionAccessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
              },
              body: JSON.stringify({ properties })
            });
          } else {
            // Create new page
            response = await notionApiRequest('https://api.notion.com/v1/pages', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${userData.notionAccessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
              },
              body: JSON.stringify({
                parent: { database_id: databaseId },
                properties
              })
            });
          }

          if (!response!.ok) {
            throw new Error(`Notion API error: ${response!.status}`);
          }

          return {
            success: true,
            bookmark: bookmark.title,
            action: existingPageId ? 'updated' : 'created',
            syncId
          };
          
        } catch (error) {
          return {
            success: false,
            bookmark: bookmark.title,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting
      if (i + batchSize < bookmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 334)); // ~3 requests per second
      }
    }

    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    const successCount = results.filter(r => r.success).length;
    auditLog('bookmark_upsert_success', userId, {
      total: bookmarks.length,
      success: successCount,
      failed: results.length - successCount
    });

    res.json({
      success: true,
      results,
      summary: {
        total: bookmarks.length,
        success: successCount,
        failed: results.length - successCount
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('bookmark_upsert_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process bookmark upsert'
    });
  }
});

// 📋 Get Notion Databases
app.get('/notion/databases', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    const response = await notionApiRequest('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        },
        page_size: 100
      })
    });

    if (!response!.ok) {
      const errorData = await response!.text();
      return res.status(response!.status).json({
        error: 'Notion API Error',
        message: errorData
      });
    }

    const data = await response!.json();
    userData.databases = data.results;
    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    res.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('databases_fetch_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch databases'
    });
  }
});

// 👤 User Profile & Status
app.get('/user/profile', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    res.json({
      userId,
      templateDatabaseId: userData.templateDatabaseId,
      databaseCount: userData.databases?.length || 0,
      lastActivity: userData.lastActivity,
      hasNotionAccess: !!userData.notionAccessToken
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('profile_fetch_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

// 🔄 High-Level Bookmark Sync with Smart Batching
app.post('/bookmarks/sync', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    const { databaseId, bookmarks, options = {} } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    if (!Array.isArray(bookmarks)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Bookmarks must be an array'
      });
    }

    // Validate and enrich bookmarks
    const enrichedBookmarks = bookmarks.map((bookmark: any, index: number) => ({
      title: bookmark.title || bookmark.name || 'Untitled Bookmark',
      url: bookmark.url,
      folder: bookmark.folder || bookmark.parentTitle || 'Default',
      tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
      dateAdded: bookmark.dateAdded || bookmark.dateCreated || new Date().toISOString(),
      syncId: bookmark.syncId || `bookmark_${bookmark.url || index}_${Date.now()}`
    }));

    // Query existing bookmarks to build sync map
    const existingResponse = await notionApiRequest(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        page_size: 100,
        filter: {
          property: 'Sync ID',
          rich_text: { is_not_empty: true }
        }
      })
    });

    const existingData = await existingResponse!.json();
    const existingBookmarks = new Map();
    
    if (existingData.results) {
      existingData.results.forEach((page: any) => {
        const syncId = page.properties['Sync ID']?.rich_text?.[0]?.text?.content;
        if (syncId) {
          existingBookmarks.set(syncId, {
            pageId: page.id,
            url: page.properties['URL']?.url
          });
        }
      });
    }

    // Smart batching with duplicate detection
    const results = [];
    const batchSize = options.batchSize || 3;
    const duplicateHandling = options.duplicateHandling || 'update'; // 'update', 'skip', 'create_new'
    
    for (let i = 0; i < enrichedBookmarks.length; i += batchSize) {
      const batch = enrichedBookmarks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
        try {
          const existing = existingBookmarks.get(bookmark.syncId);
          
          // Handle duplicates based on strategy
          if (existing) {
            if (duplicateHandling === 'skip') {
              return {
                success: true,
                bookmark: bookmark.title,
                action: 'skipped',
                reason: 'duplicate_exists',
                syncId: bookmark.syncId
              };
            }
            
            if (duplicateHandling === 'create_new') {
              bookmark.syncId = `${bookmark.syncId}_new_${Date.now()}`;
            }
          }

          const properties = {
            'Title': {
              title: [{ text: { content: bookmark.title } }]
            },
            'URL': {
              url: bookmark.url
            },
            'Folder': {
              rich_text: [{ text: { content: bookmark.folder || 'Default' } }]
            },
            'Tags': {
              multi_select: (bookmark.tags || []).map((tag: string) => ({ name: tag }))
            },
            'Date Added': {
              date: { start: bookmark.dateAdded }
            },
            'Sync ID': {
              rich_text: [{ text: { content: bookmark.syncId! } }]
            }
          };

          let response;
          if (existing && duplicateHandling === 'update') {
            // Update existing page
            response = await notionApiRequest(`https://api.notion.com/v1/pages/${existing.pageId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${userData.notionAccessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
              },
              body: JSON.stringify({ properties })
            });
          } else {
            // Create new page
            response = await notionApiRequest('https://api.notion.com/v1/pages', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${userData.notionAccessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
              },
              body: JSON.stringify({
                parent: { database_id: databaseId },
                properties
              })
            });
          }

          if (!response!.ok) {
            const errorData = await response!.text();
            throw new Error(`Notion API error: ${response!.status} - ${errorData}`);
          }

          return {
            success: true,
            bookmark: bookmark.title,
            action: existing && duplicateHandling === 'update' ? 'updated' : 'created',
            syncId: bookmark.syncId
          };
          
        } catch (error) {
          return {
            success: false,
            bookmark: bookmark.title,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting between batches
      if (i + batchSize < enrichedBookmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 334)); // ~3 requests per second
      }
    }

    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    const successCount = results.filter(r => r.success).length;
    const summary = {
      total: enrichedBookmarks.length,
      success: successCount,
      failed: results.length - successCount,
      duplicateHandling,
      batchSize
    };

    auditLog('bookmark_sync_success', userId, summary);

    res.json({
      success: true,
      results,
      summary
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('bookmark_sync_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync bookmarks'
    });
  }
});

// 🎨 Template Duplication Endpoint
app.post('/template/duplicate', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    const templateId = '257d872b594c805a9f580037c0162612'; // Template page ID
    
    // Duplicate the template page
    const response = await notionApiRequest('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: templateId },
        properties: {
          title: {
            title: [{ text: { content: '📚 Chrome Bookmarks DB' } }]
          }
        }
      })
    });

    if (!response!.ok) {
      const errorData = await response!.text();
      console.error('Template duplication failed:', errorData);
      
      return res.status(response!.status).json({
        error: 'Template Duplication Failed',
        message: 'Could not duplicate the bookmark template',
        details: errorData
      });
    }

    const duplicatedPage = await response!.json();
    
    // Store the template database ID
    userData.templateDatabaseId = duplicatedPage.id;
    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    auditLog('template_duplicate_success', userId, {
      templateId: duplicatedPage.id,
      title: '📚 Chrome Bookmarks DB'
    });

    res.json({
      success: true,
      databaseId: duplicatedPage.id,
      title: '📚 Chrome Bookmarks DB',
      url: duplicatedPage.url,
      message: 'Template duplicated successfully'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('template_duplicate_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to duplicate template'
    });
  }
});

// 📝 Create Notion Page (Generic endpoint)
app.post('/notion/create-page', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStore.get(userId);
    const { parent, properties, children } = req.body;
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    const response = await notionApiRequest('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData.notionAccessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent,
        properties,
        children
      })
    });

    if (!response!.ok) {
      const errorData = await response!.text();
      return res.status(response!.status).json({
        error: 'Notion API Error',
        message: errorData
      });
    }

    const data = await response!.json();
    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    auditLog('page_create_success', userId, {
      pageId: data.id,
      parentType: parent.type
    });

    res.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    auditLog('page_create_error', req.user?.userId || 'unknown', { error: errorMessage });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create page'
    });
  }
});

// 🚫 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /oauth/exchange',
      'POST /oauth/refresh',
      'POST /notion/query-database',
      'POST /bookmarks/upsert',
      'GET /notion/databases',
      'GET /user/profile',
      'POST /bookmarks/sync',
      'POST /template/duplicate',
      'POST /notion/create-page'
    ]
  });
});

// 🎯 Start server
app.listen(PORT, () => {
  console.log(`🚀 Bookmark Notion Sync Server running on port ${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Health check: http://localhost:${PORT}/health`);
  
  auditLog('server_start', 'system', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    allowedExtensionId: process.env.ALLOWED_EXTENSION_ID
  });
});

export default app;
