/**
 * Unit tests for Notion service
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@notionhq/client';
import { NotionService } from './notion';
import { BookmarkItem } from '../types';

// Mock @notionhq/client
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
    databases: {
      query: vi.fn(),
      retrieve: vi.fn(),
      create: vi.fn(),
    },
    pages: {
      create: vi.fn(),
      update: vi.fn(),
      retrieve: vi.fn(),
    },
    blocks: {
      children: {
        list: vi.fn(),
      },
    },
  })),
}));

describe('NotionService', () => {
  let notionService: NotionService;
  let mockClient: ReturnType<typeof vi.mocked<Client>>;

  beforeEach(() => {
    vi.clearAllMocks();
    notionService = new NotionService();
    mockClient = vi.mocked(Client);
  });

  describe('constructor', () => {
    it('should create Notion client with auth token', () => {
      expect(Client).toHaveBeenCalledWith({
        auth: expect.any(String),
      });
    });
  });

  describe('findDatabase', () => {
    it('should find database by name', async () => {
      const mockSearchResult = {
        results: [
          {
            id: 'db-123',
            object: 'database',
            title: [{ type: 'text', text: { content: 'Bookmarks' } }],
          },
        ],
      };

      vi.mocked(mockClient.search).mockResolvedValue(mockSearchResult as any);

      const result = await notionService.findDatabase('Bookmarks');

      expect(result).toBe('db-123');
      expect(mockClient.search).toHaveBeenCalledWith({
        query: 'Bookmarks',
        filter: {
          property: 'object',
          value: 'database',
        },
      });
    });

    it('should return null if database not found', async () => {
      const mockSearchResult = {
        results: [],
      };

      vi.mocked(mockClient.search).mockResolvedValue(mockSearchResult as any);

      const result = await notionService.findDatabase('NonExistent');

      expect(result).toBeNull();
    });

    it('should handle search errors', async () => {
      vi.mocked(mockClient.search).mockRejectedValue(new Error('Search failed'));

      const result = await notionService.findDatabase('Bookmarks');

      expect(result).toBeNull();
    });
  });

  describe('createPages', () => {
    const mockBookmarks: BookmarkItem[] = [
      {
        id: '1',
        title: 'Test Bookmark',
        url: 'https://example.com',
        description: 'Test description',
        tags: ['tag1', 'tag2'],
        path: 'Folder / Subfolder',
        dateAdded: new Date().toISOString(),
        syncId: 'sync-1',
      },
    ];

    it('should create pages successfully', async () => {
      vi.mocked(mockClient.pages.create).mockResolvedValue({
        id: 'page-1',
        object: 'page',
      } as any);

      const results = await notionService.createPages('db-123', mockBookmarks);

      expect(results.success).toBe(true);
      expect(results.created).toBe(1);
      expect(results.failed).toBe(0);
      expect(mockClient.pages.create).toHaveBeenCalledTimes(1);
    });

    it('should handle partial failures', async () => {
      vi.mocked(mockClient.pages.create)
        .mockResolvedValueOnce({ id: 'page-1', object: 'page' } as any)
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await notionService.createPages('db-123', mockBookmarks);

      expect(results.success).toBe(true);
      expect(results.created).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
    });

    it('should batch create pages', async () => {
      const manyBookmarks = Array.from({ length: 50 }, (_, i) => ({
        ...mockBookmarks[0],
        id: String(i),
        syncId: `sync-${i}`,
      }));

      vi.mocked(mockClient.pages.create).mockResolvedValue({
        id: 'page-1',
        object: 'page',
      } as any);

      const results = await notionService.createPages('db-123', manyBookmarks);

      expect(results.created).toBe(50);
      expect(mockClient.pages.create).toHaveBeenCalledTimes(50);
    });

    it('should handle empty bookmarks array', async () => {
      const results = await notionService.createPages('db-123', []);

      expect(results.success).toBe(true);
      expect(results.created).toBe(0);
      expect(results.failed).toBe(0);
      expect(mockClient.pages.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePage', () => {
    it('should update page successfully', async () => {
      vi.mocked(mockClient.pages.update).mockResolvedValue({
        id: 'page-1',
        object: 'page',
      } as any);

      const result = await notionService.updatePage('page-123', {
        title: 'Updated Title',
      });

      expect(result.success).toBe(true);
      expect(mockClient.pages.update).toHaveBeenCalledWith({
        page_id: 'page-123',
        properties: expect.any(Object),
      });
    });

    it('should handle update errors', async () => {
      vi.mocked(mockClient.pages.update).mockRejectedValue(
        new Error('Update failed')
      );

      const result = await notionService.updatePage('page-123', {
        title: 'Updated Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('should handle non-existent page', async () => {
      vi.mocked(mockClient.pages.update).mockRejectedValue(
        new Error('Page not found')
      );

      const result = await notionService.updatePage('non-existent', {
        title: 'Updated Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page not found');
    });
  });

  describe('retrievePage', () => {
    it('should retrieve page successfully', async () => {
      const mockPage = {
        id: 'page-123',
        object: 'page',
        properties: {
          Name: {
            title: [{ type: 'text', text: { content: 'Test Page' } }],
          },
        },
      };

      vi.mocked(mockClient.pages.retrieve).mockResolvedValue(mockPage as any);

      const result = await notionService.retrievePage('page-123');

      expect(result.success).toBe(true);
      expect(result.page).toEqual(mockPage);
      expect(mockClient.pages.retrieve).toHaveBeenCalledWith({
        page_id: 'page-123',
      });
    });

    it('should handle retrieval errors', async () => {
      vi.mocked(mockClient.pages.retrieve).mockRejectedValue(
        new Error('Page not found')
      );

      const result = await notionService.retrievePage('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Page not found');
    });
  });

  describe('getPageContent', () => {
    it('should retrieve page blocks', async () => {
      const mockBlocks = {
        results: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: 'Content' } }],
            },
          },
        ],
      };

      vi.mocked(mockClient.blocks.children.list).mockResolvedValue(
        mockBlocks as any
      );

      const result = await notionService.getPageContent('page-123');

      expect(result.success).toBe(true);
      expect(result.content).toEqual(mockBlocks.results);
      expect(mockClient.blocks.children.list).toHaveBeenCalledWith({
        block_id: 'page-123',
      });
    });

    it('should handle block retrieval errors', async () => {
      vi.mocked(mockClient.blocks.children.list).mockRejectedValue(
        new Error('Failed to retrieve blocks')
      );

      const result = await notionService.getPageContent('page-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve blocks');
    });
  });

  describe('buildProperties', () => {
    const bookmark: BookmarkItem = {
      id: '1',
      title: 'Test Bookmark',
      url: 'https://example.com',
      description: 'Test description',
      tags: ['tag1', 'tag2'],
      path: 'Folder / Subfolder',
      dateAdded: new Date().toISOString(),
      syncId: 'sync-1',
    };

    it('should build title property', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.Name).toEqual({
        title: [{ text: { content: 'Test Bookmark' } }],
      });
    });

    it('should build URL property', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.URL).toEqual({
        url: 'https://example.com',
      });
    });

    it('should build tags property as multi_select', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.Tags).toEqual({
        multi_select: [
          { name: 'tag1' },
          { name: 'tag2' },
        ],
      });
    });

    it('should build description as rich_text', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.Description).toEqual({
        rich_text: [{ text: { content: 'Test description' } }],
      });
    });

    it('should build path as rich_text', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.Path).toEqual({
        rich_text: [{ text: { content: 'Folder / Subfolder' } }],
      });
    });

    it('should build dateAdded as date', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.Date).toEqual({
        date: { start: bookmark.dateAdded },
      });
    });

    it('should build syncId as rich_text', () => {
      const properties = (notionService as any).buildProperties(bookmark);

      expect(properties.SyncId).toEqual({
        rich_text: [{ text: { content: 'sync-1' } }],
      });
    });

    it('should handle missing optional fields', () => {
      const minimalBookmark: Partial<BookmarkItem> = {
        id: '1',
        title: 'Minimal Bookmark',
      };

      const properties = (notionService as any).buildProperties(minimalBookmark);

      expect(properties.Name).toEqual({
        title: [{ text: { content: 'Minimal Bookmark' } }],
      });
      expect(properties.URL).toBeUndefined();
      expect(properties.Tags).toEqual({ multi_select: [] });
    });

    it('should use "Untitled Bookmark" for empty title', () => {
      const bookmarkWithEmptyTitle = {
        ...bookmark,
        title: '',
      };

      const properties = (notionService as any).buildProperties(
        bookmarkWithEmptyTitle
      );

      expect(properties.Name).toEqual({
        title: [{ text: { content: 'Untitled Bookmark' } }],
      });
    });

    it('should handle undefined tags', () => {
      const bookmarkWithoutTags = { ...bookmark, tags: undefined };

      const properties = (notionService as any).buildProperties(
        bookmarkWithoutTags
      );

      expect(properties.Tags).toEqual({ multi_select: [] });
    });

    it('should handle tags as string instead of array', () => {
      const bookmarkWithStringTags = { ...bookmark, tags: 'single-tag' as any };

      const properties = (notionService as any).buildProperties(
        bookmarkWithStringTags
      );

      expect(properties.Tags).toEqual({ multi_select: [] });
    });

    it('should use current date for missing dateAdded', () => {
      const bookmarkWithoutDate = { ...bookmark, dateAdded: undefined };

      const properties = (notionService as any).buildProperties(
        bookmarkWithoutDate
      );

      expect(properties.Date.date.start).toBeDefined();
    });
  });

  describe('mapPropertyName', () => {
    it('should map common property names case-insensitively', () => {
      const mapPropertyName = (notionService as any).mapPropertyName.bind(
        notionService
      );

      // Title variations
      expect(mapPropertyName('Name')).toBe('Name');
      expect(mapPropertyName('name')).toBe('Name');
      expect(mapPropertyName('Title')).toBe('Name');

      // URL variations
      expect(mapPropertyName('URL')).toBe('URL');
      expect(mapPropertyName('url')).toBe('URL');
      expect(mapPropertyName('Link')).toBe('URL');

      // Tag variations
      expect(mapPropertyName('Tags')).toBe('Tags');
      expect(mapPropertyName('tags')).toBe('Tags');
      expect(mapPropertyName('Labels')).toBe('Tags');

      // Description variations
      expect(mapPropertyName('Description')).toBe('Description');
      expect(mapPropertyName('description')).toBe('Description');
      expect(mapPropertyName('Summary')).toBe('Description');

      // Path variations
      expect(mapPropertyName('Path')).toBe('Path');
      expect(mapPropertyName('path')).toBe('Path');
      expect(mapPropertyName('Folder')).toBe('Path');

      // Date variations
      expect(mapPropertyName('Date')).toBe('Date');
      expect(mapPropertyName('date')).toBe('Date');
      expect(mapPropertyName('Created')).toBe('Date');

      // Sync ID variations
      expect(mapPropertyName('SyncId')).toBe('SyncId');
      expect(mapPropertyName('syncId')).toBe('SyncId');
      expect(mapPropertyName('Sync ID')).toBe('SyncId');
    });
  });

  describe('detectPropertyMapping', () => {
    it('should detect properties by name patterns', () => {
      const mockDatabase = {
        properties: {
          MyTitle: {
            id: 'title',
            type: 'title',
            title: {},
          },
          WebsiteURL: {
            id: 'url',
            type: 'url',
            url: {},
          },
          MyTags: {
            id: 'tags',
            type: 'multi_select',
            multi_select: { options: [] },
          },
        },
      };

      const mapping = (notionService as any).detectPropertyMapping(
        mockDatabase as any
      );

      expect(mapping.title).toBe('MyTitle');
      expect(mapping.url).toBe('WebsiteURL');
      expect(mapping.tags).toBe('MyTags');
    });

    it('should handle missing properties', () => {
      const mockDatabase = {
        properties: {
          Name: {
            id: 'title',
            type: 'title',
            title: {},
          },
        },
      };

      const mapping = (notionService as any).detectPropertyMapping(
        mockDatabase as any
      );

      expect(mapping.title).toBe('Name');
      expect(mapping.url).toBeUndefined();
      expect(mapping.tags).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle Notion API errors', async () => {
      vi.mocked(mockClient.pages.create).mockRejectedValue({
        code: 'validation_error',
        message: 'Invalid request',
      });

      const result = await notionService.createPages('db-123', [
        {
          id: '1',
          title: 'Test',
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle rate limiting', async () => {
      vi.mocked(mockClient.pages.create)
        .mockRejectedValueOnce({ code: 'rate_limited' })
        .mockResolvedValueOnce({ id: 'page-1', object: 'page' } as any);

      // Note: Current implementation doesn't handle rate limiting automatically
      // This test documents current behavior
      const results = await notionService.createPages('db-123', [
        {
          id: '1',
          title: 'Test',
        },
      ]);

      expect(results.failed).toBe(1);
    });

    it('should handle authentication errors', async () => {
      vi.mocked(mockClient.pages.create).mockRejectedValue({
        code: 'unauthorized',
        message: 'Invalid token',
      });

      const result = await notionService.createPages('db-123', [
        {
          id: '1',
          title: 'Test',
        },
      ]);

      expect(result.success).toBe(false);
    });
  });
});
