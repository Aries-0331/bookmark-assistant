/**
 * Unit tests for Bookmark Sync batch parallelization
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { diffBookmarks } from '@bookmark-assistant/server-core';

// Mock dependencies before importing bookmarks
vi.mock('../services/notion', () => ({
  notionService: {
    verifyDatabaseAccess: vi.fn().mockResolvedValue({
      databaseId: 'verified-db-id',
      dataSourceId: 'verified-ds-id',
    }),
    existingBookmarkUrls: vi.fn().mockResolvedValue({
      urls: [] as string[],
      syncIds: [] as string[],
    }),
    buildPropertiesFromDataSource: vi.fn().mockResolvedValue({}),
    createPage: vi.fn().mockResolvedValue({ id: 'page-id' }),
  },
}));

vi.mock('../services/userPrisma', () => ({
  userPrisma: {
    find: vi.fn().mockResolvedValue({
      id: 'user-1',
      userId: 'user-1',
      notionAccessToken: 'test-token',
      notionDatabaseId: 'test-db-id',
      notionDataSourceId: 'test-ds-id',
    }),
    update: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/description-extractor', () => ({
  descriptionExtractor: {
    extractFromUrl: vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        success: true,
        description: `Description for ${url}`,
        source: 'meta_description',
      })
    ),
  },
}));

vi.mock('../utils', () => ({
  validateBookmark: vi.fn().mockImplementation((bookmark: any) => bookmark),
  createBatches: vi.fn().mockImplementation((array: any[], size: number) => {
    const batches: any[] = [];
    for (let i = 0; i < array.length; i += size) {
      batches.push(array.slice(i, i + size));
    }
    return batches;
  }),
  sleep: vi.fn().mockResolvedValue(undefined),
  sanitizeError: vi.fn().mockImplementation((err) => String(err)),
  auditLog: vi.fn(),
  hasProEntitlements: vi.fn().mockReturnValue(true),
}));

vi.mock('../config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret',
    limits: {
      free: { minIntervalHours: 24 },
      pro: { minIntervalHours: 6 },
    },
    batchDefaults: {
      size: 3,
      delayMs: 100,
    },
    descriptionExtraction: {
      batchSize: 2,
      batchDelayMs: 50,
      timeoutMs: 5000,
    },
  },
}));

describe('Bookmark Sync Batch Parallelization', () => {
  describe('Code structure verification for Issue fixes', () => {
    it('should have syncBatchToNotion function defined', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      expect(content).toContain('syncBatchToNotion');
    });

    it('should have correct function signature with required parameters', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      expect(content).toMatch(/async function syncBatchToNotion\(\s*batch: BookmarkItem\[\],/);
      expect(content).toMatch(/verifiedDatabaseId: string,/);
      expect(content).toMatch(/verifiedDataSourceId: string,/);
      expect(content).toMatch(/userData: \{ notionAccessToken: string \}/);
    });

    it('should call existingBookmarkUrls before description batch loop', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      const existingBookmarkUrlsPos = content.indexOf('notionService.existingBookmarkUrls');
      const descriptionBatchesPos = content.indexOf('descriptionBatches');

      expect(existingBookmarkUrlsPos).toBeLessThan(descriptionBatchesPos);
    });

    it('should update urls and syncIds after batch sync', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      // Find multiple occurrences of urls.push and syncIds.push
      const firstSyncCall = content.indexOf('syncBatchToNotion(');
      const firstUrlsPush = content.indexOf('urls.push(');
      const firstSyncIdsPush = content.indexOf('syncIds.push(');

      // At least one push should occur after first sync call
      expect(firstUrlsPush).toBeGreaterThan(firstSyncCall);
      expect(firstSyncIdsPush).toBeGreaterThan(firstSyncCall);
    });

    it('should have url/syncId update after "all have descriptions" path sync (Issue 1 fix)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      // Find the "all have descriptions" section
      const allHaveDescriptionsPos = content.indexOf('All bookmarks already have descriptions');
      expect(allHaveDescriptionsPos).toBeGreaterThan(0);

      // After that section, there should be urls.push and syncIds.push
      // We look for urls.push and syncIds.push AFTER the allHaveDescriptions section
      const urlsPushAfterAllHave = content.indexOf('urls.push(', allHaveDescriptionsPos);
      const syncIdsPushAfterAllHave = content.indexOf('syncIds.push(', allHaveDescriptionsPos);

      expect(urlsPushAfterAllHave).toBeGreaterThan(allHaveDescriptionsPos);
      expect(syncIdsPushAfterAllHave).toBeGreaterThan(allHaveDescriptionsPos);
    });

    it('should sync remaining bookmarks after batch loop (Issue 2 fix)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      // After the batch loop, there should be a section that syncs remaining bookmarks
      // Look for "bookmarksWithDescriptions" which is used in Issue 2 fix
      expect(content).toContain('bookmarksWithDescriptions');

      // There should be a syncBatchToNotion call after filtering bookmarksWithDescriptions
      const bookmarksWithDescriptionsPos = content.indexOf('bookmarksWithDescriptions');
      const syncCallAfterBookmarksWithDescriptions = content.indexOf(
        'syncBatchToNotion(',
        bookmarksWithDescriptionsPos
      );

      expect(syncCallAfterBookmarksWithDescriptions).toBeGreaterThan(bookmarksWithDescriptionsPos);
    });

    it('should have correct batch loop structure for description extraction', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      // Verify the batch loop calls syncBatchToNotion for each batch
      // This is the core of the batch parallelization

      // Find the for loop that processes description batches
      const forLoopPos = content.indexOf('for (let i = 0; i < descriptionBatches.length');
      expect(forLoopPos).toBeGreaterThan(0);

      // Within that loop, syncBatchToNotion should be called
      const syncInLoop = content.indexOf('await syncBatchToNotion(', forLoopPos);
      expect(syncInLoop).toBeGreaterThan(forLoopPos);

      // After syncBatchToNotion in the loop, urls and syncIds should be updated
      // Find urls.push after the sync call in loop
      const urlsPushInLoop = content.indexOf('urls.push(', syncInLoop);
      const syncIdsPushInLoop = content.indexOf('syncIds.push(', syncInLoop);

      expect(urlsPushInLoop).toBeGreaterThan(syncInLoop);
      expect(syncIdsPushInLoop).toBeGreaterThan(syncInLoop);
    });
  });

  describe('diffBookmarks function behavior', () => {
    it('should correctly identify duplicates by syncId', () => {
      const diff = diffBookmarks(
        [{ title: 'Existing sync ID', url: 'https://new.example.com', syncId: 'existing-id' }],
        [],
        ['existing-id']
      );

      expect(diff.toCreate).toEqual([]);
      expect(diff.skippedExisting).toBe(1);
      expect(diff.stats.matchedBySyncId).toBe(1);
    });

    it('should correctly identify duplicates by URL', () => {
      const diff = diffBookmarks(
        [{ title: 'Existing URL', url: 'https://existing.example.com', syncId: 'new-id' }],
        ['https://existing.example.com'],
        []
      );

      expect(diff.toCreate).toEqual([]);
      expect(diff.skippedExisting).toBe(1);
      expect(diff.stats.matchedByUrl).toBe(1);
    });

    it('should track stats for both syncId and URL matches', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const bookmarksPath = path.resolve(__dirname, './bookmarks.ts');
      const content = fs.readFileSync(bookmarksPath, 'utf-8');

      // Verify the diff outcome includes stats
      expect(content).toContain('duplicatesBySyncId');
      expect(content).toContain('duplicatesByUrl');
    });
  });
});
