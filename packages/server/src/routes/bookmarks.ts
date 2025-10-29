// 📚 Bookmark Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, BookmarkSyncRequest, BookmarkItem } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError, validateBookmark, createBatches, sleep } from '../utils';

const router: import('express').Router = Router();

// Per-user sync guards to prevent spammy manual triggers
const syncGuards = new Map<string, { inProgress: boolean; lastStart: number }>();
// Per-user daily counters (UTC day); for production scale, persist in a store (Redis/DB)
const syncDailyCounters = new Map<string, { date: string; count: number }>();
const FREE_DAILY_SYNC_LIMIT = 50;

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
    // Throttle rapid re-clicks and block concurrent syncs per user
    const now = Date.now();
    const guard = syncGuards.get(userId) || { inProgress: false, lastStart: 0 };
    const isProEdition = config.edition === 'pro';
    const minCooldownMs = isProEdition ? 5000 : 30000; // 5s for Pro, 30s for Free

    if (guard.inProgress) {
      auditLog('sync_already_in_progress', userId, {});
      return res.status(409).json({
        error: 'Conflict',
        message: 'A sync is already in progress. Please wait for it to finish.',
      });
    }
    // Daily cap for Free users
    if (!isProEdition) {
      const dayKey = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
      const today = syncDailyCounters.get(userId);
      if (!today || today.date !== dayKey) {
        syncDailyCounters.set(userId, { date: dayKey, count: 0 });
      }
      const entry = syncDailyCounters.get(userId)!;
      if (entry.count >= FREE_DAILY_SYNC_LIMIT) {
        const msTillMidnight = (() => {
          const d = new Date();
          const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
          return t.getTime() - d.getTime();
        })();
        const retryAfter = Math.ceil(msTillMidnight / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        auditLog('sync_daily_limit_exceeded', userId, {
          count: entry.count,
          limit: FREE_DAILY_SYNC_LIMIT,
        });
        return res.status(429).json({
          error: 'Too Many Requests',
          message:
            'Daily sync limit reached for Free plan. Please try again tomorrow or upgrade to Pro.',
          retryAfter,
        });
      }
    }
    const elapsed = now - guard.lastStart;
    if (elapsed < minCooldownMs) {
      const retryAfter = Math.ceil((minCooldownMs - elapsed) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      auditLog('sync_cooldown', userId, { retryAfter });
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Please wait ${retryAfter}s before starting another sync.`,
        retryAfter,
      });
    }
    guard.inProgress = true;
    guard.lastStart = now;
    syncGuards.set(userId, guard);
    // Count this sync start against the daily cap for Free users
    if (!isProEdition) {
      const entry = syncDailyCounters.get(userId)!;
      entry.count += 1;
      syncDailyCounters.set(userId, entry);
    }
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

    // lastActivity is updated by DB writes elsewhere; no-op here

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
  } finally {
    const userId = req.user?.userId;
    if (userId) {
      const guard = syncGuards.get(userId);
      if (guard) {
        guard.inProgress = false;
        syncGuards.set(userId, guard);
      }
    }
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
