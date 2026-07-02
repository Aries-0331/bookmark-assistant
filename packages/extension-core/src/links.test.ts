import { describe, expect, it } from 'vitest';
import * as publicApi from './index';
import {
  buildBookmarkPath,
  collectBookmarkSyncItems,
  flattenBookmarks,
  formatBookmarkForSync,
  formatCurrentPageForSync,
  formatSavedLinkForSync,
  toSyncFingerprintItems,
  withBookmarkType,
  type BookmarkTreeNodeLike,
} from './index';

const bookmarkTree: BookmarkTreeNodeLike[] = [
  {
    id: 'root',
    title: 'Bookmarks Bar',
    children: [
      {
        id: 'folder',
        title: 'Articles',
        children: [
          {
            id: 'bookmark-1',
            title: 'Example',
            url: 'https://example.com',
            parentId: 'folder',
            dateAdded: Date.UTC(2026, 0, 1),
          },
        ],
      },
    ],
  },
];

describe('extension link helpers', () => {
  it('exposes the stable public runtime API', () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      'buildBookmarkPath',
      'cleanErrorReports',
      'collectBookmarkSyncItems',
      'createFallbackPageContent',
      'createSyncFingerprint',
      'extractPageContentFromDocument',
      'flattenBookmarks',
      'formatBookmarkForSync',
      'formatCurrentPageForSync',
      'formatReadingListItemForSync',
      'formatReadingListItemsForSync',
      'formatSavedLinkForSync',
      'isValidHttpUrl',
      'normalizeUrl',
      'planStorageCleanup',
      'toSyncFingerprintItems',
      'validatePartialSyncInfo',
      'withBookmarkType',
    ]);
  });

  it('builds bookmark paths from tree nodes', () => {
    expect(buildBookmarkPath(bookmarkTree, 'bookmark-1')).toBe('Bookmarks Bar / Articles');
    expect(buildBookmarkPath(bookmarkTree, 'missing')).toBe('Bookmarks');
  });

  it('flattens bookmark tree URL nodes', () => {
    expect(flattenBookmarks(bookmarkTree)).toEqual([
      {
        id: 'bookmark-1',
        title: 'Example',
        url: 'https://example.com',
        parentId: 'folder',
        dateAdded: Date.UTC(2026, 0, 1),
        dateGroupModified: undefined,
      },
    ]);
  });

  it('formats bookmark tree nodes as shared link items', () => {
    const item = formatBookmarkForSync(
      bookmarkTree[0].children![0].children![0],
      'Bookmarks Bar / Articles',
      {
        description: 'Cached description',
        createSyncId: () => 'sync-1',
        includeType: true,
      }
    );

    expect(item).toMatchObject({
      title: 'Example',
      url: 'https://example.com',
      description: 'Cached description',
      path: 'Bookmarks Bar / Articles',
      syncId: 'sync-1',
      type: 'bookmark',
    });
  });

  it('collects bookmark tree sync items and fingerprint inputs', async () => {
    const collected = await collectBookmarkSyncItems(bookmarkTree[0].children!, {
      getDescription: (url) => (url === 'https://example.com' ? 'Cached description' : ''),
      createSyncId: (bookmark) => `sync-${bookmark.id}`,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(collected.items).toEqual([
      {
        title: 'Example',
        url: 'https://example.com',
        description: 'Cached description',
        path: 'Bookmarks / Articles',
        dateAdded: '2026-01-01T00:00:00.000Z',
        syncId: 'sync-bookmark-1',
      },
    ]);

    expect(collected.fingerprintItems).toEqual([
      {
        title: 'Example',
        url: 'https://example.com',
        path: 'Bookmarks / Articles',
        type: undefined,
      },
    ]);
  });

  it('supports async bookmark descriptions and bookmark type metadata', async () => {
    const collected = await collectBookmarkSyncItems(bookmarkTree[0].children!, {
      getDescription: async () => 'Async description',
      createSyncId: (bookmark) => `sync-${bookmark.id}`,
      includeType: true,
    });

    expect(collected.items[0]).toMatchObject({
      description: 'Async description',
      type: 'bookmark',
      syncId: 'sync-bookmark-1',
    });
    expect(collected.fingerprintItems[0]).toMatchObject({
      type: 'bookmark',
    });
  });

  it('formats saved links without Chrome API dependencies', () => {
    const item = formatSavedLinkForSync(
      {
        title: 'Saved page',
        url: 'https://example.com/page',
      },
      {
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        createSyncId: () => 'quick-save-1',
      }
    );

    expect(item).toEqual({
      title: 'Saved page',
      url: 'https://example.com/page',
      description: '',
      path: 'Quick Saves',
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'quick-save-1',
    });
  });

  it('formats current pages as saved links with an explicit source', () => {
    const item = formatCurrentPageForSync(
      {
        title: 'Current page',
        url: 'https://example.com/current',
      },
      {
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        createSyncId: () => 'current-page-1',
      }
    );

    expect(item).toEqual({
      title: 'Current page',
      url: 'https://example.com/current',
      description: '',
      path: 'Saved Pages',
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'current-page-1',
      source: 'current_page',
    });
  });

  it('allows saved link source and default path to be supplied by consumers', () => {
    const item = formatSavedLinkForSync(
      {
        url: 'https://example.com/context',
      },
      {
        now: () => new Date('2026-01-01T00:00:00.000Z'),
        createSyncId: () => 'context-menu-1',
        defaultPath: 'Context Menu',
        source: 'context_menu',
      }
    );

    expect(item).toEqual({
      title: 'Untitled',
      url: 'https://example.com/context',
      description: '',
      path: 'Context Menu',
      dateAdded: '2026-01-01T00:00:00.000Z',
      syncId: 'context-menu-1',
      source: 'context_menu',
    });
  });

  it('marks bookmark items and creates fingerprint inputs', () => {
    const items = withBookmarkType([
      {
        title: 'Example',
        url: 'https://example.com',
        path: 'Bookmarks',
        syncId: 'bookmark-1',
      },
    ]);

    expect(items[0].type).toBe('bookmark');
    expect(toSyncFingerprintItems(items)).toEqual([
      {
        title: 'Example',
        url: 'https://example.com',
        path: 'Bookmarks',
        source: undefined,
        type: 'bookmark',
        readState: undefined,
        syncId: 'bookmark-1',
      },
    ]);
  });

  it('creates fingerprint inputs for reading list and current page links', () => {
    expect(
      toSyncFingerprintItems(
        [
          {
            title: 'Reading item',
            url: 'https://example.com/read',
            type: 'reading_list',
            readState: 'UNREAD',
            source: 'reading_list',
            syncId: 'reading-1',
          },
          {
            title: 'Current page',
            url: 'https://example.com/current',
            path: 'Quick Saves',
            source: 'current_page',
            syncId: 'current-1',
          },
        ],
        'Fallback'
      )
    ).toEqual([
      {
        title: 'Reading item',
        url: 'https://example.com/read',
        path: 'Fallback',
        source: 'reading_list',
        type: 'reading_list',
        readState: 'UNREAD',
        syncId: 'reading-1',
      },
      {
        title: 'Current page',
        url: 'https://example.com/current',
        path: 'Quick Saves',
        source: 'current_page',
        type: undefined,
        readState: undefined,
        syncId: 'current-1',
      },
    ]);
  });
});
