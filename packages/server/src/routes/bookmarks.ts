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

    // Check plan limits
    const isPro = userData.plan === 'pro';
    const syncLimit = isPro ? config.limits.pro.syncBatchLimit : config.limits.free.syncBatchLimit;
    let bookmarksToSync = bookmarks;

    // For free users, limit to syncLimit and return partial success
    if (!isPro && bookmarks.length > syncLimit) {
      console.log(
        `[Bookmark Sync] ⚠️ Free user attempting to sync ${bookmarks.length} bookmarks, limiting to ${syncLimit}`
      );
      bookmarksToSync = bookmarks.slice(0, syncLimit);

      // Continue with limited bookmarks, will report partial sync in response
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
            message: 'No database ID found and recovery failed. Please reconnect your Notion integration.',
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

    // Validate and enrich bookmarks (use limited bookmarks for free users)
    let enrichedBookmarks = bookmarksToSync.map((bookmark: any, index: number) =>
      validateBookmark(bookmark, index)
    );

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
          return bookmark.url || bookmark.syncId || `bookmark-${Math.random().toString(36).substr(2, 9)}`;
        };

        // Helper function to normalize bookmark to ensure all properties are present
        const normalizeBookmark = (bookmark: BookmarkItem): BookmarkItem => {
          return {
            title: bookmark.title,
            url: bookmark.url,
            path: bookmark.path,
            description: bookmark.description,
            tags: bookmark.tags,
            dateAdded: bookmark.dateAdded,
            syncId: bookmark.syncId,
          };
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
                const updated = normalizeBookmark({
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
              console.debug(`[Bookmark Sync] Error generating description for ${bookmark.url}:`, error);
            }
            return normalizeBookmark(bookmark);
          });
          
          await Promise.all(batchPromises);
          
          // Add delay between batches to prevent overwhelming the connection pool
          if (i < descriptionBatches.length - 1) {
            await sleep(batchDelay);
          }
        }
        
        // Update enrichedBookmarks with extracted descriptions
        enrichedBookmarks = enrichedBookmarks.map((bm) => {
          const updated = updatedBookmarksMap.get(getBookmarkKey(bm));
          return updated ? normalizeBookmark(updated) : normalizeBookmark(bm);
        });
        
        console.log('[Bookmark Sync] Description generation completed');
      } else {
        console.log('[Bookmark Sync] All bookmarks already have descriptions, skipping extraction');
      }
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
    console.log(
      `[Bookmark Sync] Processing: ${diff.toCreate.length} new (out of ${enrichedBookmarks.length} received, ${diff.skippedExisting} duplicates)`
    );

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
            retryCount: 0, // Track retry attempts
          };
        }
      });

      let batchResults = (await Promise.all(batchPromises)) as (SyncResult & { retryCount?: number })[];

      // Single retry pass for failed items (max 1 retry per item)
      const retryableFailures = batchResults.filter((r) => {
        if (!r.success && r.retryCount === 0) {
          const error = (r.error || '').toLowerCase();
          // Retry if it's a network/fetch error, but not if it's a Notion API error
          const isRetryable = error.includes('fetch failed') || error.includes('econnreset');
          return isRetryable;
        }
        return false;
      });

      if (retryableFailures.length > 0) {
        console.log(`[Bookmark Sync] 🔄 Retrying ${retryableFailures.length} failed bookmarks (1 attempt each)...`);
        
        // Retry with delay
        await sleep(1500);
        
        const retryPromises = retryableFailures.map(async (failed) => {
          // Find the original bookmark
          const originalBookmark = batch.find((b) => b.title === failed.bookmark);
          if (!originalBookmark) return { ...failed, retryCount: 1 };

          try {
            const properties = await notionService.buildPropertiesFromDataSource(
              verifiedDataSourceId,
              userData.notionAccessToken,
              originalBookmark
            );
            const iconUrl = originalBookmark.url
              ? `https://www.google.com/s2/favicons?domain=${new URL(originalBookmark.url).hostname}&sz=64`
              : undefined;

            await notionService.createPage(
              { type: 'data_source_id', data_source_id: verifiedDataSourceId },
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
            console.warn(`[Bookmark Sync] ❌ Retry failed for "${failed.bookmark}"`, retryError instanceof Error ? retryError.message : String(retryError));
            return { ...failed, retryCount: 1 }; // Mark as retried
          }
        });

        const retryResults = await Promise.all(retryPromises);
        
        // Update results with retry results
        for (const retryResult of retryResults) {
          const index = batchResults.findIndex((r) => r.bookmark === retryResult.bookmark);
          if (index >= 0) {
            batchResults[index] = retryResult;
          }
        }
        
        const newSuccesses = retryResults.filter((r) => r.success).length;
        if (newSuccesses > 0) {
          console.log(`[Bookmark Sync] ✅ Retry recovered ${newSuccesses} bookmarks`);
        }
      }

      results.push(...batchResults);

      // Log failures for debugging
      const batchFailures = batchResults.filter((r) => !r.success);
      if (batchFailures.length > 0) {
        console.warn(
          `[Bookmark Sync] ⚠️ ${batchFailures.length} failed in this batch:`,
          batchFailures.map((f) => ({ bookmark: f.bookmark, error: f.error }))
        );
      }

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
      duplicatesBySyncId: diff.stats.matchedBySyncId,
      duplicatesByUrl: diff.stats.matchedByUrl,
    };

    console.log(
      `[Bookmark Sync] ✅ Sync completed: ${successCount} new, ${diff.skippedExisting} duplicates (${diff.stats.matchedBySyncId} by syncId, ${diff.stats.matchedByUrl} by URL), ${results.length - successCount} failed`
    );

    auditLog('bookmark_sync_success', userId, summary);

    // Check if this was a partial sync due to free tier limits
    const isPartialSync = !isPro && bookmarks.length > syncLimit;

    res.json({
      success: true,
      results,
      summary,
      ...(isPartialSync && {
        partialSync: {
          applied: true,
          requested: bookmarks.length,
          processed: syncLimit,
          skipped: bookmarks.length - syncLimit,
          message: `Free plan limited to ${syncLimit} bookmarks. ${bookmarks.length - syncLimit} bookmarks were skipped. Upgrade to Pro for unlimited syncing.`,
        },
      }),
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
