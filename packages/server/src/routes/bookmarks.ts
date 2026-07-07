// 📚 Bookmark Management Routes

import { Router, Response } from 'express';
import type {
  BookmarkSyncRequest,
  BookmarkSyncResult,
  LinkItem as BookmarkItem,
} from '@bookmark-assistant/contracts';
import {
  buildGoogleS2FaviconUrl,
  diffBookmarks,
  extractNotionPageFolderAndTags,
  extractNotionPageTimestamps,
  mergeRetryResults,
  normalizeBookmarkForSyncPlanning,
  selectRetryableSyncFailures,
  selectUnsyncedDescribedBookmarks,
} from '@bookmark-assistant/server-core';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError, validateBookmark, createBatches, sleep } from '../utils';
import { descriptionExtractor } from '../services/description-extractor';

const router: import('express').Router = Router();

/**
 * Sync a single batch of bookmarks to Notion
 * Returns the results of the sync operation for this batch
 */
async function syncBatchToNotion(
  batch: BookmarkItem[],
  verifiedDatabaseId: string,
  verifiedDataSourceId: string,
  userData: { notionAccessToken: string }
): Promise<BookmarkSyncResult[]> {
  const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
    try {
      const properties = await notionService.buildPropertiesFromDataSource(
        verifiedDataSourceId,
        userData.notionAccessToken,
        bookmark
      );

      const iconUrl = bookmark.url ? buildGoogleS2FaviconUrl(bookmark.url) : undefined;

      // Create new page (incremental create-only)
      // Use verifiedDatabaseId - NOT data_source_id. data_source_id is for data source queries only.
      await notionService.createPage(
        { type: 'database_id', database_id: verifiedDatabaseId },
        properties,
        userData.notionAccessToken,
        undefined, // children
        iconUrl
      );
      return {
        success: true,
        bookmark: bookmark.title,
        action: 'created' as const,
        syncId: bookmark.syncId,
      };
    } catch (error) {
      return {
        success: false,
        bookmark: bookmark.title,
        error: sanitizeError(error),
        syncId: bookmark.syncId,
        retryCount: 0, // Track retry attempts
      };
    }
  });

  let batchResults = (await Promise.all(batchPromises)) as (BookmarkSyncResult & {
    retryCount?: number;
  })[];

  // Single retry pass for failed items (max 1 retry per item)
  const retryableFailures = selectRetryableSyncFailures(batchResults);

  if (retryableFailures.length > 0) {
    console.log(
      `[Bookmark Sync] 🔄 Retrying ${retryableFailures.length} failed bookmarks (1 attempt each)...`
    );

    // Retry with delay
    await sleep(1500);

    const retryPromises = retryableFailures.map(async (failed) => {
      // Find the original bookmark by syncId first, then title as a last-resort fallback.
      const originalBookmark = batch.find(
        (b) => (failed.syncId && b.syncId === failed.syncId) || b.title === failed.bookmark
      );
      if (!originalBookmark) return { ...failed, retryCount: 1 };

      try {
        const properties = await notionService.buildPropertiesFromDataSource(
          verifiedDataSourceId,
          userData.notionAccessToken,
          originalBookmark
        );
        const iconUrl = originalBookmark.url
          ? buildGoogleS2FaviconUrl(originalBookmark.url)
          : undefined;

        await notionService.createPage(
          { type: 'database_id', database_id: verifiedDatabaseId },
          properties,
          userData.notionAccessToken,
          undefined,
          iconUrl
        );
        return {
          success: true as const,
          bookmark: originalBookmark.title,
          action: 'created' as const,
          syncId: originalBookmark.syncId,
          retryCount: 1,
        };
      } catch (retryError) {
        console.warn(
          `[Bookmark Sync] ❌ Retry failed for "${failed.bookmark}"`,
          retryError instanceof Error ? retryError.message : String(retryError)
        );
        return { ...failed, retryCount: 1 }; // Mark as retried
      }
    });

    const retryResults = await Promise.all(retryPromises);

    batchResults = mergeRetryResults(batchResults, retryResults);

    const newSuccesses = retryResults.filter((r) => r.success).length;
    if (newSuccesses > 0) {
      console.log(`[Bookmark Sync] ✅ Retry recovered ${newSuccesses} bookmarks`);
    }
  }

  // Log failures for debugging
  const batchFailures = batchResults.filter((r) => !r.success);
  if (batchFailures.length > 0) {
    console.warn(
      `[Bookmark Sync] ⚠️ ${batchFailures.length} failed in this batch:`,
      batchFailures.map((f) => ({ bookmark: f.bookmark, error: f.error }))
    );
  }

  return batchResults;
}

/**
 * Enhanced Bookmark Sync Endpoint
 * High-level sync with smart batching and duplicate handling
 */
router.post('/sync', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await userPrisma.find(userId);
    console.debug('[Bookmark Sync] User data fetched:', userData);
    const { dataSourceId, bookmarks, options = {} }: BookmarkSyncRequest = req.body;
    console.debug('[Bookmark Sync] Sync request received:', {
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

    // Check if notionDatabaseId exists
    if (!userData.notionDatabaseId) {
      console.error('[Bookmark Sync] ❌ No notionDatabaseId found in user data');

      // Attempt recovery if we have duplicatedTemplateId
      if (userData.duplicatedTemplateId) {
        console.log('[Bookmark Sync] 🔄 Attempting database recovery from duplicatedTemplateId...');
        try {
          const resolved = await notionService.resolveDatabaseFromTemplate(
            userData.duplicatedTemplateId,
            userData.notionAccessToken
          );

          // Update user record with recovered database
          await userPrisma.update(userData.id!, {
            notionDatabaseId: resolved.databaseId,
            notionDataSourceId: resolved.dataSourceId,
            templateDatabaseId: resolved.databaseId, // Keep in sync
          });

          // Update local userData for this request
          userData.notionDatabaseId = resolved.databaseId;
          userData.notionDataSourceId = resolved.dataSourceId;

          console.log('[Bookmark Sync] ✅ Database recovered successfully');
          console.log('[Bookmark Sync]   Recovered DB:', resolved.databaseId);
          console.log('[Bookmark Sync]   Data Source:', resolved.dataSourceId);
        } catch (recoveryError) {
          console.error('[Bookmark Sync] ❌ Database recovery failed:', recoveryError);
          return res.status(400).json({
            error: 'Database Not Configured',
            message:
              'No database ID found and recovery failed. Please reconnect your Notion integration.',
            suggestion: 'Go to Settings → Disconnect → Reconnect to reconfigure database',
            recoveryAttempted: true,
            recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
          });
        }
      } else {
        // No template ID available for recovery
        return res.status(400).json({
          error: 'Database Not Configured',
          message: 'No database ID found. Please reconnect your Notion integration.',
          suggestion: 'Go to Settings → Disconnect → Reconnect to reconfigure database',
        });
      }
    }

    // Verify database access and recover if needed
    let verifiedDatabaseId = userData.notionDatabaseId;
    let verifiedDataSourceId = effectiveDataSourceId;

    console.log('[Bookmark Sync] 🔍 Verifying database access...');
    console.log('[Bookmark Sync]   Database ID:', verifiedDatabaseId);
    console.log('[Bookmark Sync]   Data Source ID:', verifiedDataSourceId);

    try {
      const verification = await notionService.verifyDatabaseAccess(
        userData.notionDatabaseId,
        userData.notionAccessToken
      );
      verifiedDatabaseId = verification.databaseId;
      verifiedDataSourceId = verification.dataSourceId;
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

    // Query existing bookmarks to build sync map
    // Limit to 50 pages (5000 bookmarks) to avoid rate limits
    // For larger databases, we'll sync what we can and accept some duplicates
    // NOTE: This is called BEFORE description extraction so we can sync each batch immediately
    const { urls, syncIds } = await notionService.existingBookmarkUrls(
      verifiedDataSourceId,
      userData.notionAccessToken,
      {
        maxPages: 50, // Reduced from 100 to avoid rate limits
        timeoutMs: 45000, // 45 second timeout
      }
    );

    // Initialize results array for tracking sync outcomes
    const results: BookmarkSyncResult[] = [];

    // Generate descriptions for bookmarks without them (if enabled)
    const generateDescriptions = options.generateDescriptions !== false; // Default: true
    if (generateDescriptions) {
      console.log('[Bookmark Sync] Generating descriptions for bookmarks without them...');

      // Filter bookmarks that need description extraction
      const bookmarksNeedingDescriptions = enrichedBookmarks.filter(
        (bookmark) => !bookmark.description?.trim() && bookmark.url
      );

      if (bookmarksNeedingDescriptions.length > 0) {
        console.log(
          `[Bookmark Sync] Extracting descriptions for ${bookmarksNeedingDescriptions.length} bookmarks in batches...`
        );

        // Process descriptions in batches to prevent connection pool exhaustion
        const batchSize = config.descriptionExtraction.batchSize;
        const batchDelay = config.descriptionExtraction.batchDelayMs;
        const descriptionBatches = createBatches(bookmarksNeedingDescriptions, batchSize);

        // Create a map to track updated bookmarks by their identifier
        const updatedBookmarksMap = new Map<string, BookmarkItem>();

        // Helper function to get a unique key for a bookmark
        const getBookmarkKey = (bookmark: BookmarkItem): string => {
          return (
            bookmark.url || bookmark.syncId || `bookmark-${Math.random().toString(36).substr(2, 9)}`
          );
        };

        // Process each batch sequentially
        for (let i = 0; i < descriptionBatches.length; i++) {
          const batch = descriptionBatches[i];
          console.debug(
            `[Bookmark Sync] Processing description batch ${i + 1}/${descriptionBatches.length} (${batch.length} bookmarks)...`
          );

          // Process batch items concurrently (but limit batch size)
          const batchPromises = batch.map(async (bookmark: BookmarkItem) => {
            try {
              // Extract description from URL
              const result = await descriptionExtractor.extractFromUrl(bookmark.url!);
              if (result.success && result.description) {
                console.debug(
                  `[Bookmark Sync] Generated description for ${bookmark.title}: "${result.description.substring(0, 50)}..."`
                );
                // Store updated bookmark in map
                const updated = normalizeBookmarkForSyncPlanning({
                  ...bookmark,
                  description: result.description,
                });
                updatedBookmarksMap.set(getBookmarkKey(bookmark), updated);
                return updated;
              } else {
                console.debug(
                  `[Bookmark Sync] Failed to generate description for ${bookmark.url}: ${result.error || 'No description found'}`
                );
              }
            } catch (error) {
              console.debug(
                `[Bookmark Sync] Error generating description for ${bookmark.url}:`,
                error
              );
            }
            return normalizeBookmarkForSyncPlanning(bookmark);
          });

          const batchWithDescriptions = await Promise.all(batchPromises);

          // IMMEDIATELY sync this batch to Notion after description extraction completes
          const batchDiff = diffBookmarks(batchWithDescriptions, urls, syncIds);

          if (batchDiff.toCreate.length > 0) {
            console.debug(
              `[Bookmark Sync] Syncing batch ${i + 1}: ${batchDiff.toCreate.length} new bookmarks to Notion...`
            );
            const batchResults = await syncBatchToNotion(
              batchDiff.toCreate,
              verifiedDatabaseId,
              verifiedDataSourceId,
              userData
            );
            results.push(...batchResults);

            // Update urls/syncIds with newly synced bookmarks to prevent duplicate syncs in subsequent batches
            for (const bookmark of batchDiff.toCreate) {
              if (bookmark.url) urls.push(bookmark.url);
              if (bookmark.syncId) syncIds.push(bookmark.syncId);
            }
          } else {
            console.debug(
              `[Bookmark Sync] Batch ${i + 1}: all bookmarks already exist in Notion, skipping sync`
            );
          }

          // Add delay between batches to prevent overwhelming the connection pool
          if (i < descriptionBatches.length - 1) {
            await sleep(batchDelay);
          }
        }

        // Update enrichedBookmarks with extracted descriptions
        enrichedBookmarks = enrichedBookmarks.map((bm) => {
          const updated = updatedBookmarksMap.get(getBookmarkKey(bm));
          return updated
            ? normalizeBookmarkForSyncPlanning(updated)
            : normalizeBookmarkForSyncPlanning(bm);
        });

        console.log('[Bookmark Sync] Description generation completed');

        // After description extraction, sync bookmarks that were NOT in bookmarksNeedingDescriptions
        // (they already had descriptions and were not processed in the batch loop)
        const bookmarksWithDescriptions = selectUnsyncedDescribedBookmarks(
          enrichedBookmarks,
          urls,
          syncIds
        );

        if (bookmarksWithDescriptions.length > 0) {
          console.debug(
            `[Bookmark Sync] Syncing ${bookmarksWithDescriptions.length} bookmarks that already had descriptions...`
          );
          const remainingDiff = diffBookmarks(bookmarksWithDescriptions, urls, syncIds);
          if (remainingDiff.toCreate.length > 0) {
            const remainingResults = await syncBatchToNotion(
              remainingDiff.toCreate,
              verifiedDatabaseId,
              verifiedDataSourceId,
              userData
            );
            results.push(...remainingResults);

            // Update urls/syncIds with newly synced bookmarks
            for (const bookmark of remainingDiff.toCreate) {
              if (bookmark.url) urls.push(bookmark.url);
              if (bookmark.syncId) syncIds.push(bookmark.syncId);
            }
          }
        }
      } else {
        console.log('[Bookmark Sync] All bookmarks already have descriptions, skipping extraction');
        // Sync all bookmarks immediately since no description extraction was needed
        const diff = diffBookmarks(enrichedBookmarks as BookmarkItem[], urls, syncIds);
        if (diff.toCreate.length > 0) {
          const batchResults = await syncBatchToNotion(
            diff.toCreate,
            verifiedDatabaseId,
            verifiedDataSourceId,
            userData
          );
          results.push(...batchResults);

          // Update urls/syncIds with newly synced bookmarks to prevent duplicate detection in diff stats
          for (const bookmark of diff.toCreate) {
            if (bookmark.url) urls.push(bookmark.url);
            if (bookmark.syncId) syncIds.push(bookmark.syncId);
          }
        }
      }
    }

    // Compute diff stats for summary (only for bookmarks that needed description extraction)
    // For the summary, we compute what would be created vs skipped
    const diff = diffBookmarks(enrichedBookmarks as BookmarkItem[], urls, syncIds);
    console.log('[Bookmark Sync] Diff result:', diff.stats);
    console.log(
      `[Bookmark Sync] Processing: ${diff.toCreate.length} new (out of ${enrichedBookmarks.length} received, ${diff.skippedExisting} duplicates)`
    );

    const successCount = results.filter((r) => r.success).length;
    const batchSize = options.batchSize || config.batchDefaults.size;
    const summary = {
      total: enrichedBookmarks.length,
      success: successCount,
      failed: results.length - successCount,
      batchSize,
      skippedExisting: diff.skippedExisting,
      duplicatesBySyncId: diff.stats.matchedBySyncId,
      duplicatesByUrl: diff.stats.matchedByUrl,
    };

    console.log(
      `[Bookmark Sync] ✅ Sync completed: ${successCount} new, ${diff.skippedExisting} duplicates (${diff.stats.matchedBySyncId} by syncId, ${diff.stats.matchedByUrl} by URL), ${results.length - successCount} failed`
    );

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
        const { folder, tags } = extractNotionPageFolderAndTags(bookmark);
        folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);

        tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      // lastActivity is updated by DB writes elsewhere; no-op here

      const stats = {
        total: bookmarks.length,
        folders: Object.fromEntries(folderCounts),
        tags: Object.fromEntries(tagCounts),
        lastSync: extractNotionPageTimestamps(bookmarks[0]).createdTime || null,
        oldestBookmark:
          extractNotionPageTimestamps(bookmarks[bookmarks.length - 1]).createdTime || null,
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
