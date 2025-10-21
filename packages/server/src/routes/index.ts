// 🛤️ Routes Index - Consolidated Route Exports

import { Router } from 'express';
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
    // eslint-disable-next-line no-console
    console.log('[CLIENT LOG]', JSON.stringify(payload));
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false });
  }
});

export default router;
