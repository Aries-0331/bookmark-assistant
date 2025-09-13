// 🔐 Secure OAuth Token Exchange Server (JavaScript Version for Testing)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 🛡️ Security middleware
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS - Only allow your Chrome extension
const allowedOrigins = [
  `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}`,
  'http://localhost:3000', // For development
  'http://localhost:3001', // For local testing
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`Blocked CORS request from: ${origin}`);
    return callback(null, true); // Allow all for testing
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
const validateExtension = (req, res, next) => {
  const extensionId = req.headers['x-extension-id'];
  
  if (!extensionId || extensionId !== process.env.ALLOWED_EXTENSION_ID) {
    console.log(`Extension validation - Expected: ${process.env.ALLOWED_EXTENSION_ID}, Got: ${extensionId}`);
    // Allow for testing
    // return res.status(403).json({
    //   error: 'Forbidden',
    //   message: 'Invalid extension identity'
    // });
  }
  
  next();
};

// 🔐 Middleware to validate JWT sessions
const validateSession = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Session token required' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
const auditLog = (action, userId, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | ${action} | User: ${userId} | ${JSON.stringify(details)}`);
};

// 🗄️ In-memory user storage (replace with database in production)
const userStore = new Map();

// 🎯 Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 🔄 OAuth Token Exchange Endpoint
app.post('/oauth/exchange', validateExtension, async (req, res) => {
  try {
    const { code, extensionUserId, templateDatabaseId } = req.body;
    
    console.log('OAuth exchange request:', { code: !!code, extensionUserId, templateDatabaseId });
    
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
    const userData = {
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
      process.env.JWT_SECRET,
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
    auditLog('oauth_exchange_error', req.body.extensionUserId || 'unknown', { 
      error: error.message || error.toString() 
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process OAuth exchange'
    });
  }
});

// 📋 Get Notion Databases
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

    const response = await fetch('https://api.notion.com/v1/search', {
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

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({
        error: 'Notion API Error',
        message: errorData
      });
    }

    const data = await response.json();
    userData.databases = data.results;
    userData.lastActivity = new Date();
    userStore.set(userId, userData);

    res.json(data);

  } catch (error) {
    auditLog('databases_fetch_error', req.user?.userId || 'unknown', { 
      error: error.message || error.toString() 
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch databases'
    });
  }
});

// 👤 User Profile & Status
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
    auditLog('profile_fetch_error', req.user?.userId || 'unknown', { 
      error: error.message || error.toString() 
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile'
    });
  }
});

// 🎨 Template Duplication Endpoint
app.post('/template/duplicate', validateSession, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userData = userStore.get(userId);
    
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found'
      });
    }

    const templateId = '257d872b594c805a9f580037c0162612'; // Template page ID
    
    // Duplicate the template page
    const response = await fetch('https://api.notion.com/v1/pages', {
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Template duplication failed:', errorData);
      
      return res.status(response.status).json({
        error: 'Template Duplication Failed',
        message: 'Could not duplicate the bookmark template',
        details: errorData
      });
    }

    const duplicatedPage = await response.json();
    
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
    auditLog('template_duplicate_error', req.user?.userId || 'unknown', { 
      error: error.message || error.toString() 
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to duplicate template'
    });
  }
});

// 🚫 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /oauth/exchange',
      'GET /notion/databases',
      'GET /user/profile',
      'POST /template/duplicate'
    ]
  });
});

// 🎯 Start server
app.listen(PORT, () => {
  console.log(`🚀 Bookmark Notion Sync Server running on port ${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`🎨 Notion Client ID: ${process.env.NOTION_CLIENT_ID ? 'SET' : 'NOT SET'}`);
  console.log(`🔐 Notion Client Secret: ${process.env.NOTION_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`🎯 Extension ID: ${process.env.ALLOWED_EXTENSION_ID || 'NOT SET'}`);
  
  auditLog('server_start', 'system', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    allowedExtensionId: process.env.ALLOWED_EXTENSION_ID
  });
});

module.exports = app;
