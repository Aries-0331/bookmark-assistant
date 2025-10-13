// 📚 Bookmark Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, BookmarkSyncRequest, BookmarkItem } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError, validateBookmark, createBatches, sleep } from '../utils';

const router = Router();

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
    const { dataSourceId, bookmarks, options = {} }: BookmarkSyncRequest = req.body;

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

    // Determine effective data source ID (required)
    const effectiveDataSourceId = (dataSourceId as string) || userData.notionDataSourceId;
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
    const existingBookmarks = await notionService.getExistingBookmarks(
      effectiveDataSourceId,
      userData.notionAccessToken
    );

    // Smart batching with duplicate detection
    const results: SyncResult[] = [];
    const batchSize = options.batchSize || config.batchDefaults.size;

    // If strategy is 'skip', pre-filter bookmarks that already exist to reduce API calls
    let preSkipped = 0;
    const toProcess = enrichedBookmarks.filter((b: BookmarkItem) => {
      const bySync = b.syncId ? existingBookmarks.get(b.syncId) : undefined;
      const byUrl = b.url ? existingBookmarks.get(b.url) : undefined;
      const exists = !!(bySync || byUrl);
      if (exists) preSkipped++;
      return !exists;
    });

    const batches = createBatches(toProcess, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
        try {
          const existing =
            (bookmark.syncId && existingBookmarks.get(bookmark.syncId)) ||
            (bookmark.url && existingBookmarks.get(bookmark.url));
          if (existing) {
            return {
              success: true,
              bookmark: bookmark.title,
              action: 'skipped',
              reason: 'duplicate_exists',
              syncId: bookmark.syncId,
            };
          }

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

    // lastActivity is updated by DB writes elsewhere; no-op here

    const successCount = results.filter((r) => r.success).length;
    const summary = {
      total: enrichedBookmarks.length,
      success: successCount,
      failed: results.length - successCount,
      batchSize,
      skippedExisting: preSkipped,
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
