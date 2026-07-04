/**
 * TDD Tests for Notion Property Mapping - Type and ReadState fields
 * @vitest-environment node
 *
 * RED Phase: Write tests that define expected behavior
 * GREEN Phase: Implementation already exists, tests should pass
 */

import { describe, it, expect } from 'vitest';
import { buildBookmarkPropertiesFromNotionSchema } from '@bookmark-assistant/server-core';
import { BookmarkItem } from '../types';

describe('BookmarkItem type definition', () => {
  describe('type field', () => {
    it('should accept type=bookmark', () => {
      const bookmark: BookmarkItem = {
        title: 'Test Bookmark',
        url: 'https://example.com',
        type: 'bookmark',
      };
      expect(bookmark.type).toBe('bookmark');
    });

    it('should accept type=reading_list', () => {
      const readingList: BookmarkItem = {
        title: 'Test Reading List Item',
        url: 'https://example.com/article',
        type: 'reading_list',
      };
      expect(readingList.type).toBe('reading_list');
    });

    it('should allow type to be undefined for backward compatibility', () => {
      const legacyItem: BookmarkItem = {
        title: 'Legacy Bookmark',
        url: 'https://example.com/legacy',
        // type is intentionally omitted
      };
      expect(legacyItem.type).toBeUndefined();
    });
  });

  describe('readState field', () => {
    it('should accept readState=UNREAD', () => {
      const item: BookmarkItem = {
        title: 'Unread Article',
        url: 'https://example.com/unread',
        readState: 'UNREAD',
      };
      expect(item.readState).toBe('UNREAD');
    });

    it('should accept readState=READ', () => {
      const item: BookmarkItem = {
        title: 'Read Article',
        url: 'https://example.com/read',
        readState: 'READ',
      };
      expect(item.readState).toBe('READ');
    });

    it('should allow readState to be undefined for bookmarks', () => {
      const bookmark: BookmarkItem = {
        title: 'Regular Bookmark',
        url: 'https://example.com',
        // readState not applicable for bookmarks
      };
      expect(bookmark.readState).toBeUndefined();
    });
  });

  describe('combined reading list item', () => {
    it('should accept full reading list item with type and readState', () => {
      const item: BookmarkItem = {
        title: 'Complete Reading List Item',
        url: 'https://example.com/article',
        type: 'reading_list',
        readState: 'UNREAD',
        dateAdded: '2024-01-15T10:00:00.000Z',
        syncId: 'test-uuid-123',
      };

      expect(item.title).toBe('Complete Reading List Item');
      expect(item.url).toBe('https://example.com/article');
      expect(item.type).toBe('reading_list');
      expect(item.readState).toBe('UNREAD');
      expect(item.dateAdded).toBe('2024-01-15T10:00:00.000Z');
      expect(item.syncId).toBe('test-uuid-123');
    });

    it('should support both read and unread states', () => {
      const unreadItem: BookmarkItem = {
        title: 'Article',
        url: 'https://example.com/1',
        type: 'reading_list',
        readState: 'UNREAD',
      };

      const readItem: BookmarkItem = {
        title: 'Article',
        url: 'https://example.com/2',
        type: 'reading_list',
        readState: 'READ',
      };

      expect(unreadItem.readState).toBe('UNREAD');
      expect(readItem.readState).toBe('READ');
      expect(unreadItem.readState).not.toBe(readItem.readState);
    });
  });

  describe('backward compatibility', () => {
    it('should support legacy bookmark without type field', () => {
      const legacy: BookmarkItem = {
        title: 'Legacy Bookmark',
        url: 'https://example.com',
        path: 'Bookmarks / Folder',
        description: 'A description',
        tags: ['tag1', 'tag2'],
        dateAdded: '2024-01-01T00:00:00.000Z',
        syncId: 'legacy-id',
      };

      expect(legacy.type).toBeUndefined();
      expect(legacy.title).toBe('Legacy Bookmark');
      expect(legacy.path).toBe('Bookmarks / Folder');
    });

    it('should support new reading list item with all fields', () => {
      const newItem: BookmarkItem = {
        title: 'New Reading List Item',
        url: 'https://example.com/new',
        type: 'reading_list',
        readState: 'UNREAD',
        dateAdded: '2024-01-15T10:00:00.000Z',
        syncId: 'new-uuid',
        // path is intentionally omitted for reading list
      };

      expect(newItem.type).toBe('reading_list');
      expect(newItem.path).toBeUndefined(); // Reading list has no folder path
    });
  });
});

describe('PROPERTY_MAPPING_CONFIG behavior', () => {
  it('should define type property as single_select', () => {
    const readingListProperties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'title' },
        Type: { type: 'single_select' },
      },
      {
        title: 'Reading List Item',
        url: 'https://example.com',
        type: 'reading_list',
      }
    );
    const bookmarkProperties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'title' },
        Type: { type: 'single_select' },
      },
      {
        title: 'Bookmark',
        url: 'https://example.com',
        type: 'bookmark',
      }
    );

    expect(readingListProperties.Type).toEqual({ single_select: { name: 'Reading List' } });
    expect(bookmarkProperties.Type).toEqual({ single_select: { name: 'Bookmark' } });
  });

  it('should define readState property as status', () => {
    const readProperties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'title' },
        Status: { type: 'status' },
      },
      {
        title: 'Read Article',
        url: 'https://example.com/read',
        readState: 'READ',
      }
    );
    const unreadProperties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'title' },
        Status: { type: 'status' },
      },
      {
        title: 'Unread Article',
        url: 'https://example.com/unread',
        readState: 'UNREAD',
      }
    );

    expect(readProperties.Status).toEqual({ status: { name: 'Read' } });
    expect(unreadProperties.Status).toEqual({ status: { name: 'Unread' } });
  });
});
