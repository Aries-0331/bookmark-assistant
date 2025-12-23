// 📚 Bookmark Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, BookmarkSyncRequest, BookmarkItem } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError, validateBookmark, createBatches, sleep } from '../utils';
import { descriptionExtractor } from '../services/description-extractor';

const router: import('express').Router = Router();

type DiffOutcome = {
  toCreate: BookmarkItem[];
  skippedExisting: number;
  stats: {
    requestTotal: number;
    existingIndexSize: number;
    matchedBySyncId: number;
    matchedByUrl: number;
  };
};

function diffBookmarks(accepted: BookmarkItem[], urls: string[], syncIds: string[]): DiffOutcome {
  let count = 0;
  let matchedBySyncId = 0;
  let matchedByUrl = 0;

  const toCreate: BookmarkItem[] = [];
  for (const b of accepted) {
    let isDuplicate = false;

    // Prefer syncId matching (most reliable)
    if (b.syncId && syncIds.includes(b.syncId)) {
      isDuplicate = true;
      matchedBySyncId++;
    }
    // Fallback to URL matching
    else if (b.url && urls.includes(b.url)) {
      isDuplicate = true;
      matchedByUrl++;
    }

    if (isDuplicate) {
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
      matchedBySyncId,
      matchedByUrl,
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

    // Check if notionDatabaseId exists
    if (!userData.notionDatabaseId) {
      console.error('[Bookmark Sync] ❌ No notionDatabaseId found in user data');
      return res.status(400).json({
        error: 'Database Not Configured',
        message: 'No database ID found. Please reconnect your Notion integration.',
        suggestion: 'Reconnect Notion integration to reconfigure database',
      });
    }

    // Verify database access and recover if needed
    let verifiedDatabaseId = userData.notionDatabaseId;
    let verifiedDataSourceId = effectiveDataSourceId;

    console.log('[Bookmark Sync] 🔍 Verifying database access...');
    console.log('[Bookmark Sync]   Database ID:', verifiedDatabaseId);
    console.log('[Bookmark Sync]   Data Source ID:', verifiedDataSourceId);
    console.log('[Bookmark Sync]   Duplicated Template ID:', userData.duplicatedTemplateId);

    try {
      const verification = await notionService.verifyDatabaseAccess(
        userData.notionDatabaseId,
        userData.notionAccessToken,
        userData.duplicatedTemplateId // Use duplicatedTemplateId (page ID) not templateDatabaseId
      );
      verifiedDatabaseId = verification.databaseId;
      verifiedDataSourceId = verification.dataSourceId;

      // Update user record if database changed (recovery successful)
      if (
        verifiedDatabaseId !== userData.notionDatabaseId ||
        verifiedDataSourceId !== userData.notionDataSourceId
      ) {
        console.log('[Bookmark Sync] 🔄 Database recovered, updating user record');
        console.log('[Bookmark Sync]   Old DB:', userData.notionDatabaseId);
        console.log('[Bookmark Sync]   New DB:', verifiedDatabaseId);
        await userPrisma.update(userData.id!, {
          notionDatabaseId: verifiedDatabaseId,
          notionDataSourceId: verifiedDataSourceId,
          templateDatabaseId: verifiedDatabaseId, // Update templateDatabaseId to match
        });
      }
    } catch (error) {
      console.error('[Bookmark Sync] ❌ Database verification failed:', error);
      return res.status(400).json({
        error: 'Database Not Accessible',
        message: error instanceof Error ? error.message : 'Failed to verify database access',
        suggestion:
          'Please ensure the database is shared with your Notion integration. Go to your Notion database → ••• menu → Add connections → Select your integration.',
        databaseId: userData.notionDatabaseId,
      });
    }

    // Validate and enrich bookmarks
    let enrichedBookmarks = bookmarks.map((bookmark: any, index: number) =>
      validateBookmark(bookmark, index)
    );

    // Generate descriptions for bookmarks without them (if enabled)
    const generateDescriptions = options.generateDescriptions !== false; // Default: true
    if (generateDescriptions) {
      console.log('[Bookmark Sync] Generating descriptions for bookmarks without them...');
      const descriptionPromises = enrichedBookmarks.map(async (bookmark: BookmarkItem) => {
        // Skip if description already exists
        if (bookmark.description && bookmark.description.trim()) {
          return bookmark;
        }

        // Skip if no URL
        if (!bookmark.url) {
          return bookmark;
        }

        try {
          // Extract description from URL
          const result = await descriptionExtractor.extractFromUrl(bookmark.url);
          if (result.success && result.description) {
            console.log(
              `[Bookmark Sync] Generated description for ${bookmark.title}: "${result.description.substring(0, 50)}..."`
            );
            return {
              ...bookmark,
              description: result.description,
            };
          } else {
            console.debug(
              `[Bookmark Sync] Failed to generate description for ${bookmark.url}: ${result.error || 'No description found'}`
            );
          }
        } catch (error) {
          console.warn(`[Bookmark Sync] Error generating description for ${bookmark.url}:`, error);
        }

        return bookmark;
      });

      // Wait for all descriptions to be generated (with timeout)
      enrichedBookmarks = (await Promise.all(descriptionPromises)) as typeof enrichedBookmarks;
      console.log('[Bookmark Sync] Description generation completed');
    }
    // Query existing bookmarks to build sync map
    // Limit to 50 pages (5000 bookmarks) to avoid rate limits
    // For larger databases, we'll sync what we can and accept some duplicates
    const { urls, syncIds } = await notionService.existingBookmarkUrls(
      verifiedDataSourceId,
      userData.notionAccessToken,
      {
        maxPages: 50, // Reduced from 100 to avoid rate limits
        timeoutMs: 45000, // 45 second timeout
      }
    );
    // Compute diff (by syncId primarily, with URL fallback)
    const diff = diffBookmarks(enrichedBookmarks as BookmarkItem[], urls, syncIds);
    console.log('[Bookmark Sync] Diff result:', diff.stats);

    const results: SyncResult[] = [];
    const batchSize = options.batchSize || config.batchDefaults.size;
    const toProcess = diff.toCreate;

    const batches = createBatches(toProcess, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
        try {
          const properties = await notionService.buildPropertiesFromDataSource(
            verifiedDataSourceId,
            userData.notionAccessToken,
            bookmark
          );

          // Generate favicon URL from bookmark URL
          const iconUrl = bookmark.url
            ? `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`
            : undefined;

          // Create new page (incremental create-only)
          // In API version 2025-09-03, use data_source_id for inline databases
          await notionService.createPage(
            { type: 'data_source_id', data_source_id: verifiedDataSourceId },
            properties,
            userData.notionAccessToken,
            undefined, // children
            iconUrl
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
