import { describe, expect, it } from 'vitest';
import { diffBookmarks, validateBookmarkInput } from './index';

describe('server bookmark core', () => {
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
    });
  });

  it('fills defaults and drops invalid discriminators', () => {
    const item = validateBookmarkInput(
      {
        name: 'Fallback title',
        type: 'web_clipper',
        readState: 'ARCHIVED',
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
});
