// 🛤️ Routes Index - Consolidated Route Exports

import { Router } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { paddlePricingService } from '../services';
import oauthRoutes from './oauth';
import notionRoutes from './notion';
import bookmarkRoutes from './bookmarks';
import userRoutes from './user';
import entitlementsRoutes from './entitlements';
import paddleRoutes from './paddle';

const router: import('express').Router = Router();

// Mount all route modules
router.use('/oauth', oauthRoutes);
router.use('/notion', notionRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/user', userRoutes);
router.use('/entitlements', entitlementsRoutes);
router.use('/paddle', paddleRoutes); // Paddle routes: /api/paddle/checkout-url and /api/paddle/webhooks/paddle

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
// Pricing is fetched from Paddle API to ensure consistency with actual payment prices
router.get('/v1/public-config', async (req, res) => {
  try {
    // Fetch current pricing from Paddle (with caching)
    const pricing = await paddlePricingService.getPricing();

    const body = {
      pricing: {
        monthly: pricing.monthly,
        yearlyDiscount: pricing.yearlyDiscount,
      },
      limits: {
        free: {
          dailyLimit: config.limits.free.dailyLimit,
          minIntervalHours: config.limits.free.minIntervalHours,
        },
        pro: {
          dailyLimit: config.limits.pro.dailyLimit,
          minIntervalHours: config.limits.pro.minIntervalHours,
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
  } catch (error) {
    console.error('❌ Error fetching public config:', error);
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
  } catch {
    res.status(400).json({ success: false });
  }
});

export default router;
