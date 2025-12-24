/**
 * Admin routes for cache management and monitoring
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { descriptionCache } from '../services/description-cache';

const router: import('express').Router = Router();

/**
 * GET /api/admin/cache/stats
 * Get description cache statistics
 */
router.get('/cache/stats', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await descriptionCache.getStats();

    res.json({
      success: true,
      stats: {
        totalEntries: stats.totalEntries,
        hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
        avgHitsPerEntry: stats.avgHits.toFixed(2),
        oldestEntry: stats.oldestEntry,
        newestEntry: stats.newestEntry,
      },
    });
  } catch (error) {
    console.error('[Admin] Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
    });
  }
});

/**
 * POST /api/admin/cache/cleanup
 * Manually trigger cache cleanup
 */
router.post('/cache/cleanup', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deletedCount = await descriptionCache.cleanExpired();

    res.json({
      success: true,
      deletedCount,
      message: `Successfully cleaned ${deletedCount} expired cache entries`,
    });
  } catch (error) {
    console.error('[Admin] Failed to cleanup cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup cache',
    });
  }
});

/**
 * DELETE /api/admin/cache/:url
 * Invalidate cache entry for specific URL
 */
router.delete('/cache/:url', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = decodeURIComponent(req.params.url);

    const success = await descriptionCache.invalidate(url);

    if (success) {
      res.json({
        success: true,
        message: `Cache invalidated for ${url}`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Cache entry not found',
      });
    }
  } catch (error) {
    console.error('[Admin] Failed to invalidate cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache',
    });
  }
});

/**
 * DELETE /api/admin/cache
 * Clear all cache entries (use with caution)
 */
router.delete('/cache', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Safety check: require confirmation
    const { confirm } = req.body;

    if (confirm !== 'CLEAR_ALL_CACHE') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Send { "confirm": "CLEAR_ALL_CACHE" } in request body.',
      });
    }

    const deletedCount = await descriptionCache.clearAll();

    res.json({
      success: true,
      deletedCount,
      message: `Successfully cleared all ${deletedCount} cache entries`,
    });
  } catch (error) {
    console.error('[Admin] Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

export default router;
