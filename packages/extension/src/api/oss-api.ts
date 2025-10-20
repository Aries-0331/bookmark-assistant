import type { NotionSyncAdapter } from '@bookmark-sync/shared/notionSync/adapter';
import type { BookmarkPayload } from '@bookmark-sync/shared/types';
import { Client } from '@notionhq/client';

type DbSchema = Record<string, { type: string } & Record<string, any>>;

async function getOSSConfig(): Promise<{ token: string; databaseId: string }> {
  const { notion_token, notion_database_id } = await chrome.storage.local.get([
    'notion_token',
    'notion_database_id',
  ]);
  if (!notion_token) throw new Error('Missing Notion token (set in Settings)');
  if (!notion_database_id) throw new Error('Missing Notion database ID (set in Settings)');
  return { token: notion_token as string, databaseId: notion_database_id as string };
}

async function getDatabaseSchema(client: Client, databaseId: string): Promise<DbSchema> {
  const db: any = await client.databases.retrieve({ database_id: databaseId });
  return (db?.properties || {}) as DbSchema;
}

function findTitlePropName(schema: DbSchema): string | undefined {
  return Object.entries(schema).find(([, v]) => v?.type === 'title')?.[0];
}

function findUrlPropName(schema: DbSchema): string | undefined {
  return (
    Object.entries(schema).find(([, v]) => v?.type === 'url')?.[0] ||
    Object.entries(schema).find(([k, v]) => v?.type === 'url' && /url|link/i.test(k))?.[0]
  );
}

function findFirstOfType(schema: DbSchema, type: string, regex?: RegExp): string | undefined {
  if (regex) {
    const byName = Object.entries(schema).find(([k, v]) => v?.type === type && regex.test(k));
    if (byName) return byName[0];
  }
  return Object.entries(schema).find(([, v]) => v?.type === type)?.[0];
}

async function existingUrls(
  client: Client,
  dataSourceId: string,
  urlProp?: string
): Promise<Set<string>> {
  const urls = new Set<string>();
  if (!urlProp) return urls; // no url prop -> skip duplicate check

  let cursor: string | undefined = undefined;
  do {
    const resp: any = await client.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    const results = resp?.results || [];
    for (const page of results) {
      const v = page?.properties?.[urlProp]?.url;
      if (typeof v === 'string' && v) urls.add(v);
    }
    cursor = resp?.next_cursor || undefined;
  } while (cursor);
  return urls;
}

function buildProperties(schema: DbSchema, bookmark: BookmarkPayload): Record<string, any> {
  const props: Record<string, any> = {};
  const titleName = findTitlePropName(schema) || 'Name';
  const urlName = findUrlPropName(schema);
  const pathName = findFirstOfType(schema, 'rich_text', /path|folder|location/i);
  const descName = findFirstOfType(schema, 'rich_text', /desc|summary|note|description/i);
  const dateName =
    findFirstOfType(schema, 'date', /date|created|added/i) || findFirstOfType(schema, 'date');
  const syncIdName = findFirstOfType(schema, 'rich_text', /sync\s*id|sync|identifier|id/i);

  const safeTitle = bookmark.title || 'Untitled Bookmark';
  if (titleName) props[titleName] = { title: [{ text: { content: safeTitle } }] };
  if (urlName && bookmark.url) props[urlName] = { url: bookmark.url };
  if (descName && bookmark.description)
    props[descName] = { rich_text: [{ text: { content: bookmark.description } }] };
  if (pathName && bookmark.path)
    props[pathName] = { rich_text: [{ text: { content: bookmark.path } }] };
  if (dateName)
    props[dateName] = { date: { start: bookmark.dateAdded || new Date().toISOString() } };
  if (syncIdName && bookmark.syncId)
    props[syncIdName] = { rich_text: [{ text: { content: bookmark.syncId } }] };

  return props;
}

export const ossApi: NotionSyncAdapter = {
  async syncBookmarks(bookmarks: BookmarkPayload[]) {
    const { token, databaseId } = await getOSSConfig();
    const client = new Client({ auth: token });

    // Discover schema once
    const schema = await getDatabaseSchema(client, databaseId);
    const urlProp = findUrlPropName(schema);

    // Build existing URL set to skip duplicates
    const existing = await existingUrls(client, databaseId, urlProp);

    // Pre-filter and create
    let success = 0;
    let failed = 0;
    for (const b of bookmarks) {
      try {
        if (urlProp && existing.has(b.url)) {
          continue;
        }
        const properties = buildProperties(schema, b);
        await client.pages.create({ parent: { database_id: databaseId }, properties });
        success++;
      } catch (e) {
        console.warn('OSS create failed:', e);
        failed++;
      }
    }
    return { total: bookmarks.length, success, failed };
  },
};
