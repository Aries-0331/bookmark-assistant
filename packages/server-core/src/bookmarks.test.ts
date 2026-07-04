import { describe, expect, it } from 'vitest';
import * as publicApi from './index';
import {
  diffBookmarks,
  isFetchableHttpUrl,
  isValidUrl,
  normalizeUrlForSync,
  normalizeBookmarkForSyncPlanning,
  selectUnsyncedDescribedBookmarks,
  validateBookmarkInput,
  validateLinkItemInput,
} from './index';

describe('server bookmark core', () => {
  it('exposes the stable public runtime API', () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      'diffBookmarks',
      'extractContentFromStructuredElements',
      'extractDescriptionFromHtml',
      'buildBookmarkPropertiesFromNotionSchema',
      'isFetchableHttpUrl',
      'isValidDescription',
      'isValidUrl',
      'looksLikeDescription',
      'normalizeBookmarkForSyncPlanning',
      'normalizeUrlForSync',
      'sanitizeDescription',
      'selectUnsyncedDescribedBookmarks',
      'isReadOnlyNotionPropertyType',
      'validateBookmarkInput',
      'validateLinkItemInput',
    ].sort());
  });

  it('diffs bookmarks by sync ID before URL', () => {
    const itemBySyncId = {
      title: 'By sync ID',
      url: 'https://new.example.com',
      syncId: 'existing-sync-id',
    };
    const itemByUrl = {
      title: 'By URL',
      url: 'https://existing.example.com',
      syncId: 'new-sync-id',
    };
    const newItem = {
      title: 'New',
      url: 'https://new.example.com/2',
      syncId: 'new-sync-id-2',
    };

    const diff = diffBookmarks(
      [itemBySyncId, itemByUrl, newItem],
      ['https://existing.example.com'],
      ['existing-sync-id']
    );

    expect(diff.toCreate).toEqual([newItem]);
    expect(diff.skippedExisting).toBe(2);
    expect(diff.stats).toEqual({
      requestTotal: 3,
      existingIndexSize: 2,
      matchedBySyncId: 1,
      matchedByUrl: 1,
    });
  });

  it('handles empty diff inputs without creating false positives', () => {
    expect(diffBookmarks([], ['https://existing.example.com'], ['sync-1'])).toEqual({
      toCreate: [],
      skippedExisting: 0,
      stats: {
        requestTotal: 0,
        existingIndexSize: 0,
        matchedBySyncId: 0,
        matchedByUrl: 0,
      },
    });
  });

  it('does not double-count URL duplicates when sync ID already matched', () => {
    const diff = diffBookmarks(
      [
        {
          title: 'Both duplicate keys',
          url: 'https://existing.example.com',
          syncId: 'existing-sync-id',
        },
      ],
      ['https://existing.example.com'],
      ['existing-sync-id']
    );

    expect(diff).toEqual({
      toCreate: [],
      skippedExisting: 1,
      stats: {
        requestTotal: 1,
        existingIndexSize: 1,
        matchedBySyncId: 1,
        matchedByUrl: 0,
      },
    });
  });

  it('preserves shared link fields for reading list items', () => {
    const item = validateBookmarkInput(
      {
        title: 'Reading List Item',
        url: 'https://example.com/article',
        path: 'Reading List',
        description: 'Saved article',
        tags: ['reading', 123],
        dateAdded: '2026-01-01T00:00:00.000Z',
        syncId: 'reading-list-1',
        type: 'reading_list',
        readState: 'UNREAD',
        source: 'reading_list',
      },
      {
        createSyncId: () => 'fallback-id',
      }
    );

    expect(item).toEqual({
      title: 'Reading List Item',
      url: 'https://example.com/article',
      path: 'Reading List',
      description: 'Saved article',
      tags: ['reading'],
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'reading-list-1',
      type: 'reading_list',
      readState: 'UNREAD',
      source: 'reading_list',
    });
  });

  it('fills defaults and drops invalid discriminators', () => {
    const item = validateBookmarkInput(
      {
        name: 'Fallback title',
        type: 'web_clipper',
        readState: 'ARCHIVED',
        source: 'full_page_clip',
      },
      {
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        createSyncId: () => 'generated-id',
      }
    );

    expect(item).toEqual({
      title: 'Fallback title',
      url: '',
      path: undefined,
      description: '',
      tags: [],
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'generated-id',
    });
  });

  it('validates generic link item input through the public alias', () => {
    const item = validateLinkItemInput(
      {
        title: 'Saved Link',
        url: 'https://example.com/link',
        source: 'current_page',
      },
      {
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        createSyncId: () => 'link-1',
      }
    );

    expect(item).toEqual({
      title: 'Saved Link',
      url: 'https://example.com/link',
      path: undefined,
      description: '',
      tags: [],
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'link-1',
      source: 'current_page',
    });
  });

  it('normalizes bookmarks for sync planning while preserving shared metadata', () => {
    const item = normalizeBookmarkForSyncPlanning({
      title: 'Reading List Item',
      url: 'https://example.com/article',
      path: 'Reading List',
      description: 'Saved article',
      tags: ['reading', 'research'],
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'reading-list-1',
      type: 'reading_list',
      readState: 'UNREAD',
      source: 'reading_list',
    });

    expect(item).toEqual({
      title: 'Reading List Item',
      url: 'https://example.com/article',
      path: 'Reading List',
      description: 'Saved article',
      tags: ['reading', 'research'],
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'reading-list-1',
      type: 'reading_list',
      readState: 'UNREAD',
      source: 'reading_list',
    });
  });

  it('does not share the tags array when normalizing for sync planning', () => {
    const tags = ['one'];
    const item = normalizeBookmarkForSyncPlanning({
      title: 'Bookmark',
      url: 'https://example.com',
      tags,
    });

    tags.push('two');

    expect(item.tags).toEqual(['one']);
  });

  it('supports minimal bookmark normalization for sync planning', () => {
    expect(
      normalizeBookmarkForSyncPlanning({
        title: 'Bookmark',
        url: 'https://example.com',
      })
    ).toEqual({
      title: 'Bookmark',
      url: 'https://example.com',
    });
  });

  it('selects described bookmarks that are not already synced by URL or sync ID', () => {
    const unsynced = {
      title: 'Unsynced described bookmark',
      url: 'https://example.com/new',
      syncId: 'new-sync-id',
      description: 'A useful page description',
    };

    expect(
      selectUnsyncedDescribedBookmarks(
        [
          {
            title: 'Missing description',
            url: 'https://example.com/missing-description',
            syncId: 'missing-description',
            description: '   ',
          },
          {
            title: 'Existing by URL',
            url: 'https://example.com/existing-url',
            syncId: 'new-sync-id-by-url',
            description: 'Already synced by URL',
          },
          {
            title: 'Existing by sync ID',
            url: 'https://example.com/new-url',
            syncId: 'existing-sync-id',
            description: 'Already synced by sync ID',
          },
          unsynced,
        ],
        ['https://example.com/existing-url'],
        ['existing-sync-id']
      )
    ).toEqual([unsynced]);
  });

  it('keeps described bookmarks without URL or sync ID when they are not otherwise known', () => {
    const item = {
      title: 'Title-only described bookmark',
      url: '',
      description: 'Description from import',
    };

    expect(selectUnsyncedDescribedBookmarks([item], [], [])).toEqual([item]);
  });
});

describe('server URL core', () => {
  it('normalizes URLs for stable sync keys', () => {
    expect(normalizeUrlForSync('https://example.com/path/?b=2&a=1#fragment')).toBe(
      'https://example.com/path?a=1&b=2'
    );
  });

  it('preserves root trailing slash while removing non-root trailing slash', () => {
    expect(normalizeUrlForSync('https://example.com/')).toBe('https://example.com/');
    expect(normalizeUrlForSync('https://example.com/page/')).toBe('https://example.com/page');
  });

  it('preserves invalid URL input for callers to validate separately', () => {
    expect(normalizeUrlForSync('not-a-valid-url')).toBe('not-a-valid-url');
  });

  it('validates URL syntax without restricting protocol', () => {
    expect(isValidUrl('https://example.com/page')).toBe(true);
    expect(isValidUrl('file:///local/file.html')).toBe(true);
    expect(isValidUrl('not-a-valid-url')).toBe(false);
  });

  it('recognizes only HTTP and HTTPS URLs as fetchable', () => {
    expect(isFetchableHttpUrl('https://example.com/page')).toBe(true);
    expect(isFetchableHttpUrl('http://example.com/page')).toBe(true);
    expect(isFetchableHttpUrl('file:///local/file.html')).toBe(false);
    expect(isFetchableHttpUrl('not-a-valid-url')).toBe(false);
  });
});
