// 🛤️ Routes Index - Consolidated Route Exports

import { Router } from 'express';
import oauthRoutes from './oauth';
import notionRoutes from './notion';
import bookmarkRoutes from './bookmarks';
import userRoutes from './user';

const router = Router();

// Mount all route modules
router.use('/oauth', oauthRoutes);
router.use('/notion', notionRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/user', userRoutes);

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

export default router;
