/**
 * Tests for reading list utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getReadingListItems } from './reading-list';

describe('getReadingListItems', () => {
  const mockReadingListItems = [
    {
      id: { value: 'item-1' },
      title: { content: 'Test Article 1' },
      url: { url: 'https://example.com/article-1' },
      dateAdded: Date.now() - 86400000, // 1 day ago
      readState: { state: 'UNREAD' },
    },
    {
      id: { value: 'item-2' },
      title: { content: 'Test Article 2' },
      url: { url: 'https://example.com/article-2' },
      dateAdded: Date.now() - 3600000, // 1 hour ago
      readState: { state: 'READ' },
    },
  ];

  describe('when chrome.readingList API is available', () => {
    beforeEach(() => {
      vi.stubGlobal('chrome', {
        readingList: {
          getContents: vi.fn().mockResolvedValue(mockReadingListItems),
        },
      });
    });

    it('should return mapped reading list items', async () => {
      const items = await getReadingListItems();

      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        title: 'Test Article 1',
        url: 'https://example.com/article-1',
        dateAdded: expect.any(String),
        readState: 'UNREAD',
        syncId: expect.any(String),
        type: 'reading_list',
      });
    });

    it('should extract readState from readState.state', async () => {
      const items = await getReadingListItems();

      expect(items[0].readState).toBe('UNREAD');
      expect(items[1].readState).toBe('READ');
    });

    it('should generate UUID for syncId', async () => {
      const items = await getReadingListItems();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(items[0].syncId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should convert dateAdded to ISO string', async () => {
      const items = await getReadingListItems();

      expect(typeof items[0].dateAdded).toBe('string');
      // Verify it's a valid date string
      expect(() => new Date(items[0].dateAdded)).not.toThrow();
    });

    it('should set type to reading_list', async () => {
      const items = await getReadingListItems();

      expect(items[0].type).toBe('reading_list');
      expect(items[1].type).toBe('reading_list');
    });

    it('should call chrome.readingList.getContents', async () => {
      await getReadingListItems();

      expect(chrome.readingList.getContents).toHaveBeenCalledTimes(1);
    });
  });

  describe('when chrome.readingList API is NOT available', () => {
    let warnSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.stubGlobal('chrome', {});
      warnSpy = vi.fn();
      console.warn = warnSpy;
    });

    it('should return empty array', async () => {
      const items = await getReadingListItems();

      expect(items).toEqual([]);
    });

    it('should log warning', async () => {
      await getReadingListItems();

      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls;
      const hasExpectedMessage = warnCalls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('API not available')
      );
      expect(hasExpectedMessage).toBe(true);
    });
  });

  describe('when chrome.readingList.getContents throws error', () => {
    let warnSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.stubGlobal('chrome', {
        readingList: {
          getContents: vi.fn().mockRejectedValue(new Error('API Error')),
        },
      });
      warnSpy = vi.fn();
      console.warn = warnSpy;
    });

    it('should return empty array', async () => {
      const items = await getReadingListItems();

      expect(items).toEqual([]);
    });

    it('should log warning about error', async () => {
      await getReadingListItems();

      expect(warnSpy).toHaveBeenCalled();
      const warnCalls = warnSpy.mock.calls;
      const hasExpectedMessage = warnCalls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('Failed to get reading list items')
      );
      expect(hasExpectedMessage).toBe(true);
    });
  });

  describe('when reading list is empty', () => {
    beforeEach(() => {
      vi.stubGlobal('chrome', {
        readingList: {
          getContents: vi.fn().mockResolvedValue([]),
        },
      });
    });

    it('should return empty array', async () => {
      const items = await getReadingListItems();

      expect(items).toEqual([]);
    });
  });
});