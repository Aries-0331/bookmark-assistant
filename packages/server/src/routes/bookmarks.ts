// 📚 Bookmark Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, BookmarkSyncRequest, BookmarkItem } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userStorage } from '../services/userStorage';
import { config } from '../config';
import { auditLog, sanitizeError, validateBookmark, createBatches, sleep } from '../utils';

const router = Router();

// Result type definitions to avoid implicit never[] inference
type UpsertResult =
  | { success: true; bookmark: string; action: 'updated' | 'created'; syncId: string }
  | { success: false; bookmark: string; error: string };

type SyncResult =
  | { success: true; bookmark: string; action: 'updated' | 'created'; syncId?: string }
  | { success: true; bookmark: string; action: 'skipped'; reason: string; syncId?: string }
  | { success: false; bookmark: string; error: string; syncId?: string };

/**
 * Bookmark Upsert Endpoint (Legacy)
 * Insert or update bookmarks with duplicate prevention
 */
router.post('/upsert', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
  const userData = userStorage.getUser(userId);
  const { dataSourceId, databaseId, bookmarks } = req.body;

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
    }

    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Bookmarks array is required and cannot be empty',
      });
    }

    // Determine effective data source ID
    let effectiveDataSourceId = dataSourceId as string | undefined;
    if (!effectiveDataSourceId && databaseId) {
      try {
        effectiveDataSourceId = await notionService.getPrimaryDataSourceId(
          databaseId,
          userData.notionAccessToken
        );
      } catch (e) {
        console.warn('Failed to resolve data source from databaseId:', e);
      }
    }
    if (!effectiveDataSourceId && userData.templateDatabaseId) {
      try {
        effectiveDataSourceId = await notionService.getPrimaryDataSourceId(
          userData.templateDatabaseId,
          userData.notionAccessToken
        );
      } catch (e) {
        console.warn('Failed to resolve data source from template database:', e);
      }
    }
    if (!effectiveDataSourceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dataSourceId (preferred) or a resolvable databaseId is required',
      });
    }

    // Get existing bookmarks to prevent duplicates
    const existingBookmarks = await notionService.getExistingBookmarks(
      effectiveDataSourceId,
      userData.notionAccessToken
    );

    // Process bookmarks in batches
  const results: UpsertResult[] = [];
    const batches = createBatches(bookmarks, config.batchDefaults.size);

    for (const batch of batches) {
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
        try {
          const syncId = bookmark.syncId || `${bookmark.url}-${Date.now()}`;
          const existingPageId = existingBookmarks.get(syncId)?.pageId;

          const properties = notionService.createBookmarkProperties({
            ...bookmark,
            syncId,
          });

          if (existingPageId) {
            // Update existing page
            await notionService.updatePage(existingPageId, properties, userData.notionAccessToken);

            return {
              success: true,
              bookmark: bookmark.title,
              action: 'updated',
              syncId,
            };
          } else {
            // Create new page
            await notionService.createPage(
              { type: 'data_source_id', data_source_id: effectiveDataSourceId },
              properties,
              userData.notionAccessToken
            );

            return {
              success: true,
              bookmark: bookmark.title,
              action: 'created',
              syncId,
            };
          }
        } catch (error) {
          return {
            success: false,
            bookmark: bookmark.title,
            error: sanitizeError(error),
          };
        }
      });

  const batchResults = (await Promise.all(batchPromises)) as UpsertResult[];
  results.push(...batchResults);

      // Rate limiting between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await sleep(config.batchDefaults.delayMs);
      }
    }

    userStorage.updateLastActivity(userId);

    const successCount = results.filter((r) => r.success).length;
    auditLog('bookmark_upsert_success', userId, {
      total: bookmarks.length,
      success: successCount,
      failed: results.length - successCount,
    });

    res.json({
      success: true,
      results,
      summary: {
        total: bookmarks.length,
        success: successCount,
        failed: results.length - successCount,
      },
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('bookmark_upsert_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Bookmark upsert error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process bookmark upsert',
    });
  }
});

/**
 * Enhanced Bookmark Sync Endpoint
 * High-level sync with smart batching and duplicate handling
 */
router.post('/sync', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStorage.getUser(userId);
  const { dataSourceId, databaseId, bookmarks, options = {} }: BookmarkSyncRequest = req.body;

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

    // Determine effective data source ID
    let effectiveDataSourceId = dataSourceId as string | undefined;
    if (!effectiveDataSourceId && databaseId) {
      try {
        effectiveDataSourceId = await notionService.getPrimaryDataSourceId(
          databaseId,
          userData.notionAccessToken
        );
      } catch (e) {
        console.warn('Failed to resolve data source from databaseId:', e);
      }
    }
    if (!effectiveDataSourceId && userData.templateDatabaseId) {
      try {
        effectiveDataSourceId = await notionService.getPrimaryDataSourceId(
          userData.templateDatabaseId,
          userData.notionAccessToken
        );
      } catch (e) {
        console.warn('Failed to resolve data source from template database:', e);
      }
    }
    if (!effectiveDataSourceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dataSourceId (preferred) or a resolvable databaseId is required',
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
    const duplicateHandling = options.duplicateHandling || 'update';
    const batches = createBatches(enrichedBookmarks, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
        try {
          const existing = existingBookmarks.get(bookmark.syncId!);

          // Handle duplicates based on strategy
          if (existing) {
            if (duplicateHandling === 'skip') {
              return {
                success: true,
                bookmark: bookmark.title,
                action: 'skipped',
                reason: 'duplicate_exists',
                syncId: bookmark.syncId,
              };
            }

            if (duplicateHandling === 'create_new') {
              bookmark.syncId = `${bookmark.syncId}_new_${Date.now()}`;
            }
          }

          const properties = notionService.createBookmarkProperties(bookmark);

          if (existing && duplicateHandling === 'update') {
            // Update existing page
            await notionService.updatePage(existing.pageId, properties, userData.notionAccessToken);

            return {
              success: true,
              bookmark: bookmark.title,
              action: 'updated',
              syncId: bookmark.syncId,
            };
          } else {
            // Create new page
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
          }
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

    userStorage.updateLastActivity(userId);

    const successCount = results.filter((r) => r.success).length;
    const summary = {
      total: enrichedBookmarks.length,
      success: successCount,
      failed: results.length - successCount,
      duplicateHandling,
      batchSize,
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
      const userData = userStorage.getUser(userId);
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

      userStorage.updateLastActivity(userId);

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
