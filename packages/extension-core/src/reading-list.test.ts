import { describe, expect, it } from 'vitest';
import {
  formatReadingListItemForSync,
  formatReadingListItemsForSync,
  type ChromeReadingListItemLike,
} from './index';

describe('reading list helpers', () => {
  it('formats Chrome query reading list items as shared sync items', () => {
    const item = formatReadingListItemForSync(
      {
        title: 'Article',
        url: 'https://example.com/article',
        creationTime: Date.UTC(2026, 0, 1),
        hasBeenRead: false,
      },
      {
        createSyncId: () => 'reading-1',
      }
    );

    expect(item).toEqual({
      title: 'Article',
      url: 'https://example.com/article',
      dateAdded: '2026-01-01T00:00:00.000Z',
      readState: 'UNREAD',
      syncId: 'reading-1',
      type: 'reading_list',
    });
  });

  it('formats legacy nested reading list item shapes', () => {
    const item = formatReadingListItemForSync(
      {
        title: { content: 'Legacy Article' },
        url: { url: 'https://example.com/legacy' },
        dateAdded: Date.UTC(2026, 1, 1),
        readState: { state: 'READ' },
      },
      {
        createSyncId: () => 'reading-legacy-1',
      }
    );

    expect(item).toEqual({
      title: 'Legacy Article',
      url: 'https://example.com/legacy',
      dateAdded: '2026-02-01T00:00:00.000Z',
      readState: 'READ',
      syncId: 'reading-legacy-1',
      type: 'reading_list',
    });
  });

  it('prefers explicit readState over hasBeenRead', () => {
    const item = formatReadingListItemForSync(
      {
        title: 'Explicit State',
        url: 'https://example.com/state',
        hasBeenRead: true,
        readState: { state: 'UNREAD' },
      },
      {
        now: () => new Date('2026-03-01T00:00:00.000Z'),
        createSyncId: () => 'reading-state-1',
      }
    );

    expect(item.readState).toBe('UNREAD');
  });

  it('falls back to current time when item timestamps are missing', () => {
    const item = formatReadingListItemForSync(
      {
        title: 'No Date',
        url: 'https://example.com/no-date',
      },
      {
        now: () => new Date('2026-04-01T00:00:00.000Z'),
        createSyncId: () => 'reading-no-date-1',
      }
    );

    expect(item.dateAdded).toBe('2026-04-01T00:00:00.000Z');
  });

  it('generates reading-list sync IDs when no factory is provided', () => {
    const item = formatReadingListItemForSync({
      title: 'Generated ID',
      url: 'https://example.com/generated',
    });

    expect(item.syncId).toEqual(expect.any(String));
    expect(item.syncId).not.toBe('');
  });

  it('maps multiple reading list items and passes item index to sync ID factory', () => {
    const items: ChromeReadingListItemLike[] = [
      {
        title: 'First',
        url: 'https://example.com/first',
        hasBeenRead: false,
      },
      {
        title: 'Second',
        url: 'https://example.com/second',
        hasBeenRead: true,
      },
    ];

    expect(
      formatReadingListItemsForSync(items, {
        now: () => new Date('2026-05-01T00:00:00.000Z'),
        createSyncId: (_item, index) => `reading-${index}`,
      })
    ).toEqual([
      {
        title: 'First',
        url: 'https://example.com/first',
        dateAdded: '2026-05-01T00:00:00.000Z',
        readState: 'UNREAD',
        syncId: 'reading-0',
        type: 'reading_list',
      },
      {
        title: 'Second',
        url: 'https://example.com/second',
        dateAdded: '2026-05-01T00:00:00.000Z',
        readState: 'READ',
        syncId: 'reading-1',
        type: 'reading_list',
      },
    ]);
  });
});
