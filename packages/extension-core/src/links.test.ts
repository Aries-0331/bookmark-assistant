import { describe, expect, it } from 'vitest';
import {
  buildBookmarkPath,
  flattenBookmarks,
  formatBookmarkForSync,
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

  it('marks bookmark items and creates fingerprint inputs', () => {
    const items = withBookmarkType([
      {
        title: 'Example',
        url: 'https://example.com',
        path: 'Bookmarks',
      },
    ]);

    expect(items[0].type).toBe('bookmark');
    expect(toSyncFingerprintItems(items)).toEqual([
      {
        title: 'Example',
        url: 'https://example.com',
        path: 'Bookmarks',
      },
    ]);
  });
});
