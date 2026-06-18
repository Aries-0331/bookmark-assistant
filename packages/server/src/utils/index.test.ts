/**
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';
import { validateBookmark } from './index';

describe('validateBookmark', () => {
  it('preserves shared link contract fields for reading list items', () => {
    const item = validateBookmark(
      {
        title: 'Reading List Item',
        url: 'https://example.com/article',
        path: 'Reading List',
        description: 'Saved article',
        tags: ['reading'],
        dateAdded: '2026-01-01T00:00:00.000Z',
        syncId: 'reading-list-1',
        type: 'reading_list',
        readState: 'UNREAD',
      },
      0
    );

    expect(item).toMatchObject({
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

  it('drops invalid discriminators while keeping valid bookmark data', () => {
    const item = validateBookmark(
      {
        title: 'Bookmark',
        url: 'https://example.com',
        type: 'web_clipper',
        readState: 'ARCHIVED',
      },
      0
    );

    expect(item.title).toBe('Bookmark');
    expect(item.url).toBe('https://example.com');
    expect(item.type).toBeUndefined();
    expect(item.readState).toBeUndefined();
  });
});
