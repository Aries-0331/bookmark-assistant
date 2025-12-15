// 📚 Bookmark Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, BookmarkSyncRequest, BookmarkItem } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError, validateBookmark, createBatches, sleep } from '../utils';

const router: import('express').Router = Router();

type DiffOutcome = {
  toCreate: BookmarkItem[];
  skippedExisting: number;
  stats: {
    requestTotal: number;
    existingIndexSize: number;
  };
};

function diffBookmarks(accepted: BookmarkItem[], urls: string[]): DiffOutcome {
  let count = 0;

  const toCreate: BookmarkItem[] = [];
  for (const b of accepted) {
    if (urls.includes(b.url)) {
      count++;
    } else {
      toCreate.push(b);
    }
  }

  const skippedExisting = accepted.length - toCreate.length;
  return {
    toCreate,
    skippedExisting,
    stats: {
      requestTotal: accepted.length,
      existingIndexSize: count,
    },
  };
}

// Result type definitions
type SyncResult =
  | { success: true; bookmark: string; action: 'created'; syncId?: string }
  | {
      success: true;
      bookmark: string;
      action: 'skipped';
      reason: 'duplicate_exists';
      syncId?: string;
    }
  | { success: false; bookmark: string; error: string; syncId?: string };

/**
 * Enhanced Bookmark Sync Endpoint
 * High-level sync with smart batching and duplicate handling
 */
router.post('/sync', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await userPrisma.find(userId);
    console.log('[Bookmark Sync] User data fetched:', userData);
    const { dataSourceId, bookmarks, options = {} }: BookmarkSyncRequest = req.body;
    console.log('[Bookmark Sync] Sync request received:', {
      dataSourceId,
      bookmarkCount: Array.isArray(bookmarks) ? bookmarks.length : 'invalid',
      options,
    });
    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
    }

    if (!Array.isArray(bookmarks)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Bookmarks must be an array',
      });
    }

    // Check plan limits
    const isPro = userData.plan === 'pro';
    const syncLimit = isPro ? config.limits.pro.syncBatchLimit : config.limits.free.syncBatchLimit;
    
    if (bookmarks.length > syncLimit) {
      return res.status(403).json({
        error: 'Sync Limit Exceeded',
        message: `Free plan is limited to ${config.limits.free.syncBatchLimit} bookmarks per sync. You're trying to sync ${bookmarks.length}. Upgrade to Pro for unlimited syncing.`,
        limit: syncLimit,
        attempted: bookmarks.length,
        isPro,
      });
    }

    const effectiveDataSourceId = userData.notionDataSourceId;
    if (!effectiveDataSourceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message:
          'dataSourceId is required for sync. Please complete OAuth and share the template/database with the integration so the server can resolve it.',
      });
    }

    // Validate and enrich bookmarks
    const enrichedBookmarks = bookmarks.map((bookmark: any, index: number) =>
      validateBookmark(bookmark, index)
    );
    // Query existing bookmarks to build sync map
    const urls = await notionService.existingBookmarkUrls(
      effectiveDataSourceId,
      userData.notionAccessToken
    );
    // Compute diff (by syncId primarily, with URL fallback)
    const diff = diffBookmarks(enrichedBookmarks as BookmarkItem[], urls);
    console.log('[Bookmark Sync] Diff result:', diff.stats);

    const results: SyncResult[] = [];
    const batchSize = options.batchSize || config.batchDefaults.size;
    const toProcess = diff.toCreate;

    const batches = createBatches(toProcess, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
        try {
          const properties = await notionService.buildPropertiesFromDataSource(
            effectiveDataSourceId!,
            userData.notionAccessToken,
            bookmark
          );

          // Create new page (incremental create-only)
          await notionService.createPage(
            { type: 'data_source_id', data_source_id: effectiveDataSourceId },
            properties,
            userData.notionAccessToken
          );
          return {
            success: true,
            bookmark: bookmark.title,
            action: 'created',
            syncId: bookmark.syncId,
          };
        } catch (error) {
          return {
            success: false,
            bookmark: bookmark.title,
            error: sanitizeError(error),
          };
        }
      });

      const batchResults = (await Promise.all(batchPromises)) as SyncResult[];
      results.push(...batchResults);

      // Rate limiting between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await sleep(config.batchDefaults.delayMs);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const summary = {
      total: enrichedBookmarks.length,
      success: successCount,
      failed: results.length - successCount,
      batchSize,
      skippedExisting: diff.skippedExisting,
    };

    auditLog('bookmark_sync_success', userId, summary);

    res.json({
      success: true,
      results,
      summary,
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('bookmark_sync_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Bookmark sync error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync bookmarks',
    });
  }
});

/**
 * Get Bookmark Statistics
 * Returns statistics about user's synced bookmarks
 */
router.get(
  '/stats/:databaseId',
  validateSession,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userData = await userPrisma.find(userId);
      const { databaseId } = req.params;

      if (!userData) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User data not found',
        });
      }

      // Resolve to data source and query for statistics
      const dataSourceId = await notionService.getPrimaryDataSourceId(
        databaseId,
        userData.notionAccessToken
      );
      const data = await notionService.queryDataSource(
        dataSourceId,
        userData.notionAccessToken,
        undefined,
        [{ property: 'Created', direction: 'descending' }]
      );

      const bookmarks = data.results || [];
      const folderCounts = new Map<string, number>();
      const tagCounts = new Map<string, number>();

      bookmarks.forEach((bookmark: any) => {
        // Count folders
        const folder = bookmark.properties?.Folder?.rich_text?.[0]?.text?.content || 'Default';
        folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);

        // Count tags
        const tags = bookmark.properties?.Tags?.multi_select || [];
        tags.forEach((tag: any) => {
          tagCounts.set(tag.name, (tagCounts.get(tag.name) || 0) + 1);
        });
      });

      // lastActivity is updated by DB writes elsewhere; no-op here

      const stats = {
        total: bookmarks.length,
        folders: Object.fromEntries(folderCounts),
        tags: Object.fromEntries(tagCounts),
        lastSync: bookmarks[0]?.created_time || null,
        oldestBookmark: bookmarks[bookmarks.length - 1]?.created_time || null,
      };

      auditLog('bookmark_stats_fetch', userId, {
        databaseId,
        totalBookmarks: stats.total,
        folderCount: folderCounts.size,
        tagCount: tagCounts.size,
      });

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      const errorMessage = sanitizeError(error);
      auditLog('bookmark_stats_error', req.user?.userId || 'unknown', {
        error: errorMessage,
      });

      console.error('Bookmark stats error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch bookmark statistics',
      });
    }
  }
);

export default router;
