import { describe, expect, it } from 'vitest';
import {
  buildBookmarkPropertiesFromNotionSchema,
  extractNotionPageFolderAndTags,
  extractNotionPageLinkKeys,
  extractNotionPageTimestamps,
  isReadOnlyNotionPropertyType,
} from './notion-properties';

describe('server Notion property mapping core', () => {
  it('maps bookmark fields to compatible Notion property values', () => {
    const properties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'title' },
        URL: { type: 'url' },
        Tags: { type: 'multi_select' },
        Description: { type: 'rich_text' },
        Folder: { type: 'rich_text' },
        Added: { type: 'date' },
        'Sync ID': { type: 'rich_text' },
        Type: { type: 'single_select' },
        Status: { type: 'status' },
      },
      {
        title: 'Example',
        url: 'https://example.com',
        tags: ['research', 'docs'],
        description: 'Example description',
        path: 'Bookmarks / Docs',
        dateAdded: '2026-01-01T00:00:00.000Z',
        syncId: 'sync-1',
        type: 'reading_list',
        readState: 'READ',
      }
    );

    expect(properties).toEqual({
      Name: { title: [{ text: { content: 'Example' } }] },
      URL: { url: 'https://example.com' },
      Tags: { multi_select: [{ name: 'research' }, { name: 'docs' }] },
      Description: { rich_text: [{ text: { content: 'Example description' } }] },
      Folder: { rich_text: [{ text: { content: 'Bookmarks / Docs' } }] },
      Added: { date: { start: '2026-01-01T00:00:00.000Z' } },
      'Sync ID': { rich_text: [{ text: { content: 'sync-1' } }] },
      Type: { single_select: { name: 'Reading List' } },
      Status: { status: { name: 'Read' } },
    });
  });

  it('defaults title content when bookmark title is empty', () => {
    expect(
      buildBookmarkPropertiesFromNotionSchema(
        {
          Name: { type: 'title' },
        },
        {
          title: '',
          url: 'https://example.com',
        }
      )
    ).toEqual({
      Name: { title: [{ text: { content: 'Untitled Bookmark' } }] },
    });
  });

  it('uses pattern matching before type fallback', () => {
    const properties = buildBookmarkPropertiesFromNotionSchema(
      {
        Notes: { type: 'rich_text' },
        Folder: { type: 'rich_text' },
        Name: { type: 'title' },
      },
      {
        title: 'Example',
        url: 'https://example.com',
        description: 'Description text',
        path: 'Bookmarks / Work',
      }
    );

    expect(properties.Notes).toEqual({ rich_text: [{ text: { content: 'Description text' } }] });
    expect(properties.Folder).toEqual({ rich_text: [{ text: { content: 'Bookmarks / Work' } }] });
  });

  it('falls back to compatible Notion property type when no pattern matches', () => {
    const properties = buildBookmarkPropertiesFromNotionSchema(
      {
        Primary: { type: 'title' },
        Destination: { type: 'url' },
      },
      {
        title: 'Example',
        url: 'https://example.com',
      }
    );

    expect(properties).toEqual({
      Primary: { title: [{ text: { content: 'Example' } }] },
      Destination: { url: 'https://example.com' },
    });
  });

  it('uses a fallback title property name when schema does not expose a title property', () => {
    expect(
      buildBookmarkPropertiesFromNotionSchema(
        {
          URL: { type: 'url' },
        },
        {
          title: 'Example',
          url: 'https://example.com',
        },
        {
          fallbackTitlePropertyName: 'Resolved Title',
        }
      )
    ).toEqual({
      'Resolved Title': { title: [{ text: { content: 'Example' } }] },
      URL: { url: 'https://example.com' },
    });
  });

  it('skips read-only Notion property types', () => {
    const properties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'formula' },
        RealName: { type: 'title' },
        Tags: { type: 'rollup' },
        RealTags: { type: 'multi_select' },
        Created: { type: 'created_time' },
      },
      {
        title: 'Example',
        url: 'https://example.com',
        tags: ['public'],
        dateAdded: '2026-01-01T00:00:00.000Z',
      }
    );

    expect(properties).toEqual({
      RealName: { title: [{ text: { content: 'Example' } }] },
      RealTags: { multi_select: [{ name: 'public' }] },
    });
  });

  it('builds date from injected default when dateAdded is missing', () => {
    expect(
      buildBookmarkPropertiesFromNotionSchema(
        {
          Name: { type: 'title' },
          Added: { type: 'date' },
        },
        {
          title: 'Example',
          url: 'https://example.com',
        },
        {
          defaultDate: '2026-01-02T00:00:00.000Z',
        }
      )
    ).toEqual({
      Name: { title: [{ text: { content: 'Example' } }] },
      Added: { date: { start: '2026-01-02T00:00:00.000Z' } },
    });
  });

  it('maps bookmark type and unread state to public Notion option names', () => {
    const properties = buildBookmarkPropertiesFromNotionSchema(
      {
        Name: { type: 'title' },
        Type: { type: 'single_select' },
        Status: { type: 'status' },
      },
      {
        title: 'Example',
        url: 'https://example.com',
        type: 'bookmark',
        readState: 'UNREAD',
      }
    );

    expect(properties.Type).toEqual({ single_select: { name: 'Bookmark' } });
    expect(properties.Status).toEqual({ status: { name: 'Unread' } });
  });

  it('identifies read-only Notion property types', () => {
    expect(isReadOnlyNotionPropertyType('formula')).toBe(true);
    expect(isReadOnlyNotionPropertyType('rollup')).toBe(true);
    expect(isReadOnlyNotionPropertyType('created_time')).toBe(true);
    expect(isReadOnlyNotionPropertyType('title')).toBe(false);
    expect(isReadOnlyNotionPropertyType(undefined)).toBe(false);
  });

  it('extracts duplicate detection keys from native Notion URL and sync ID properties', () => {
    expect(
      extractNotionPageLinkKeys({
        properties: {
          URL: { type: 'url', url: 'https://example.com/native' },
          'Sync ID': {
            type: 'rich_text',
            rich_text: [{ plain_text: 'bookmark-sync-1' }],
          },
        },
      })
    ).toEqual({
      url: 'https://example.com/native',
      syncId: 'bookmark-sync-1',
    });
  });

  it('falls back to rich text URL properties when native URL is missing', () => {
    expect(
      extractNotionPageLinkKeys({
        properties: {
          Website: {
            type: 'rich_text',
            rich_text: [{ plain_text: ' https://example.com/from-text ' }],
          },
          Identifier: {
            type: 'rich_text',
            rich_text: [{ plain_text: 'text-sync-1' }],
          },
        },
      })
    ).toEqual({
      url: 'https://example.com/from-text',
      syncId: 'text-sync-1',
    });
  });

  it('ignores invalid rich text URLs and non-matching sync ID property names', () => {
    expect(
      extractNotionPageLinkKeys({
        properties: {
          Notes: {
            type: 'rich_text',
            rich_text: [{ plain_text: 'not a url' }],
          },
          Internal: {
            type: 'rich_text',
            rich_text: [{ plain_text: 'not-a-sync-id' }],
          },
        },
      })
    ).toEqual({});
  });

  it('extracts lower-case id rich text as sync ID for legacy schemas', () => {
    expect(
      extractNotionPageLinkKeys({
        properties: {
          id: {
            type: 'rich_text',
            rich_text: [{ plain_text: 'legacy-sync-id' }],
          },
        },
      })
    ).toEqual({
      syncId: 'legacy-sync-id',
    });
  });

  it('handles missing or malformed page properties', () => {
    expect(extractNotionPageLinkKeys(undefined)).toEqual({});
    expect(extractNotionPageLinkKeys({ properties: null })).toEqual({});
    expect(
      extractNotionPageLinkKeys({
        properties: {
          URL: { type: 'url', url: 123 },
          'Sync ID': { type: 'rich_text', rich_text: 'sync-1' },
        },
      })
    ).toEqual({});
  });

  it('extracts folder and tag names from Notion page properties', () => {
    expect(
      extractNotionPageFolderAndTags({
        properties: {
          Folder: {
            type: 'rich_text',
            rich_text: [{ text: { content: 'Research / AI' } }],
          },
          Tags: {
            type: 'multi_select',
            multi_select: [{ name: 'notion' }, { name: 'bookmarks' }],
          },
        },
      })
    ).toEqual({
      folder: 'Research / AI',
      tags: ['notion', 'bookmarks'],
    });
  });

  it('uses default folder and empty tags for missing Notion properties', () => {
    expect(extractNotionPageFolderAndTags({ properties: {} })).toEqual({
      folder: 'Default',
      tags: [],
    });
  });

  it('supports custom folder and tag property names', () => {
    expect(
      extractNotionPageFolderAndTags(
        {
          properties: {
            Location: {
              type: 'rich_text',
              rich_text: [{ plain_text: 'Reading List' }],
            },
            Topics: {
              type: 'multi_select',
              multi_select: [{ name: 'docs' }],
            },
          },
        },
        {
          folderPropertyName: 'Location',
          tagsPropertyName: 'Topics',
          defaultFolder: 'Inbox',
        }
      )
    ).toEqual({
      folder: 'Reading List',
      tags: ['docs'],
    });
  });

  it('ignores malformed folder and tag property values', () => {
    expect(
      extractNotionPageFolderAndTags({
        properties: {
          Folder: {
            type: 'rich_text',
            rich_text: 'not-rich-text',
          },
          Tags: {
            type: 'multi_select',
            multi_select: [{ name: '' }, { name: 123 }, { label: 'missing-name' }],
          },
        },
      })
    ).toEqual({
      folder: 'Default',
      tags: [],
    });
  });

  it('extracts top-level Notion page timestamps', () => {
    expect(
      extractNotionPageTimestamps({
        created_time: '2026-01-01T00:00:00.000Z',
        last_edited_time: '2026-01-02T00:00:00.000Z',
        properties: {},
      })
    ).toEqual({
      createdTime: '2026-01-01T00:00:00.000Z',
      lastEditedTime: '2026-01-02T00:00:00.000Z',
    });
  });

  it('ignores missing or malformed Notion page timestamps', () => {
    expect(extractNotionPageTimestamps(undefined)).toEqual({});
    expect(
      extractNotionPageTimestamps({
        created_time: '',
        last_edited_time: 123,
        properties: {},
      })
    ).toEqual({});
  });
});
