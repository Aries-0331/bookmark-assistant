// 🛤️ Routes Index - Consolidated Route Exports

import { Router } from 'express';
import crypto from 'crypto';
import oauthRoutes from './oauth';
import notionRoutes from './notion';
import bookmarkRoutes from './bookmarks';
import userRoutes from './user';
import entitlementsRoutes from './entitlements';

const router: import('express').Router = Router();

// Mount all route modules
router.use('/oauth', oauthRoutes);
router.use('/notion', notionRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/user', userRoutes);
router.use('/entitlements', entitlementsRoutes);

// Health check endpoint (kept at root level)
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Public, cacheable configuration for client display and soft limits
router.get('/v1/public-config', (req, res) => {
  try {
    const body = {
      pricing: {
        currency: 'USD',
        monthly: 10,
        yearlyDiscount: 0.4,
      },
      limits: {
        free: {
          dailyLimit: 50,
          minIntervalHours: 12,
        },
        pro: {
          dailyLimit: 1000,
          minIntervalHours: 0.5,
        },
      },
    };

    const etag = 'W/"' + crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex') + '"';
    const inm = req.headers['if-none-match'];
    if (inm && inm === etag) {
      return res.status(304).end();
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json(body);
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// Optional lightweight client log endpoint to capture non-critical client events (e.g., request timeouts)
router.post('/client-log', (req, res) => {
  try {
    const { level = 'info', message, meta } = req.body || {};
    const safeLevel = String(level).toLowerCase();
    const payload = {
      level: safeLevel,
      message: message || 'client-log',
      meta: meta || {},
      at: new Date().toISOString(),
    };

    console.log('[CLIENT LOG]', JSON.stringify(payload));
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false });
  }
});

export default router;
