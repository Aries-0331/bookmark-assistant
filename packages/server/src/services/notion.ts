// 🔗 Notion API Service Layer

import { Client, APIResponseError } from '@notionhq/client';
import { config } from '../config';
import { NotionPageProperties, BookmarkItem } from '../types';
import { retryRequest, sleep } from '../utils';

export class NotionService {
  private getClient(accessToken: string) {
    return new Client({ auth: accessToken, notionVersion: config.notionApiVersion });
  }

  /**
   * Resolve the title property name for a given data source by first attempting
   * to read it from the data source schema; if not found, fall back to the
   * underlying database schema and return the first property of type 'title'.
   */
  private async resolveTitlePropertyName(
    dataSourceId: string,
    accessToken: string
  ): Promise<string | undefined> {
    const notion = this.getClient(accessToken);
    try {
      const ds: any = await (notion as any).dataSources.retrieve({ data_source_id: dataSourceId });
      const entries = Object.entries<any>(ds?.properties || {});
      const fromDataSource = entries.find(([_, v]) => v?.type === 'title')?.[0];
      if (fromDataSource) return fromDataSource as string;
    } catch (e) {
      console.warn('[Notion] Title resolution: failed to read data source schema:', e);
    }

    try {
      const databaseId = await this.getDatabaseIdByDataSourceId(dataSourceId, accessToken);
      const db: any = await notion.request({ method: 'get', path: `databases/${databaseId}` });
      const dbEntries = Object.entries<any>(db?.properties || {});
      const fromDatabase = dbEntries.find(([_, v]) => v?.type === 'title')?.[0];
      if (fromDatabase) return fromDatabase as string;
    } catch (e) {
      console.warn('[Notion] Title resolution: failed to read database schema:', e);
    }

    return undefined;
  }

  async getPrimaryDataSourceId(databaseId: string, accessToken: string): Promise<string> {
    const notion = this.getClient(accessToken);
    try {
      const database = (await notion.request({
        method: 'get',
        path: `databases/${databaseId}`,
      })) as { data_sources?: Array<{ id: string; name?: string }> };
      const dataSources = database.data_sources as Array<{ id: string; name?: string }> | undefined;
      if (!dataSources || dataSources.length === 0) {
        throw new Error('No data sources found for database');
      }

      return dataSources[0].id;
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Notion API error (${error.status}): ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Given a dataSourceId, find the underlying databaseId by scanning accessible databases
   * and matching the database.data_sources[].id. Cached per process would be ideal; keep simple for now.
   */
  async getDatabaseIdByDataSourceId(dataSourceId: string, accessToken: string): Promise<string> {
    const notion = this.getClient(accessToken);
    // Search for databases the integration can access
    let cursor: string | undefined = undefined;
    do {
      const resp: any = await notion.search({
        filter: { property: 'object', value: 'database' as any },
        start_cursor: cursor,
        page_size: 50,
      });
      const results = resp?.results || [];
      for (const dbSummary of results) {
        try {
          const db = (await notion.request({
            method: 'get',
            path: `databases/${dbSummary.id}`,
          })) as any;
          const dataSources = (db?.data_sources || []) as Array<{ id: string }>;
          if (Array.isArray(dataSources) && dataSources.some((ds) => ds.id === dataSourceId)) {
            return dbSummary.id as string;
          }
        } catch (e) {
          console.warn('[Notion] Failed to retrieve database for summary id:', dbSummary?.id, e);
        }
      }
      cursor = resp?.next_cursor || undefined;
    } while (cursor);
    throw new Error(
      `No database found for dataSourceId ${dataSourceId}. Ensure the database is shared with the integration.`
    );
  }

  /**
   * Build properties using schema resolved from a dataSourceId (preferred path)
   */
  async buildPropertiesFromDataSource(
    dataSourceId: string,
    accessToken: string,
    bookmark: BookmarkItem
  ): Promise<Record<string, any>> {
    const notion = this.getClient(accessToken);
    // Retrieve the data source to access its properties (schema)
    const ds = (await (notion as any).dataSources.retrieve({
      data_source_id: dataSourceId,
    })) as any;
    const schema = ds?.properties || {};
    const props: Record<string, any> = {};
    const entries = Object.entries<any>(schema) as Array<[string, any]>;
    const byType = (type: string) => entries.find(([_, v]) => v?.type === type)?.[0];
    const byTypeNamed = (type: string, regex: RegExp) =>
      entries.find(([k, v]) => v?.type === type && regex.test(k.toLowerCase()))?.[0];

    let titleName = byType('title') || byTypeNamed('title', /name|title/);
    const urlName = byType('url') || byTypeNamed('url', /url|link/);
    const tagsName =
      byTypeNamed('multi_select', /tag|label|category|topic/) || byType('multi_select');
    const descName =
      byTypeNamed('rich_text', /desc|summary|note|description/) || byType('rich_text');
    const path = byTypeNamed('rich_text', /folder|path|location/);
    const dateName = byTypeNamed('date', /date|created|added/) || byType('date');
    const syncIdName = byTypeNamed('rich_text', /sync\s*id|sync|identifier|id/);

    // Ensure we always set a title to avoid creating an 'Untitled' blank row
    const safeTitle = bookmark.title || 'Untitled Bookmark';
    if (!titleName) {
      // Try to resolve via database fallback
      titleName = await this.resolveTitlePropertyName(dataSourceId, accessToken);
      if (!titleName) {
        console.warn(
          '[Notion] No title property detected from data source or database schema; falling back to "Name"'
        );
        titleName = 'Name';
      }
    }
    if (titleName) {
      props[titleName] = { title: [{ text: { content: safeTitle } }] };
    }
    if (urlName && bookmark.url) {
      props[urlName] = { url: bookmark.url };
    }
    if (tagsName && Array.isArray(bookmark.tags)) {
      props[tagsName] = { multi_select: bookmark.tags.map((t) => ({ name: t })) };
    }
    if (descName && (bookmark as any).description) {
      props[descName] = { rich_text: [{ text: { content: (bookmark as any).description } }] };
    }
    if (path && bookmark.path) {
      props[path] = { rich_text: [{ text: { content: bookmark.path } }] };
    }
    if (dateName) {
      props[dateName] = { date: { start: bookmark.dateAdded || new Date().toISOString() } };
    }
    if (syncIdName && bookmark.syncId) {
      props[syncIdName] = { rich_text: [{ text: { content: bookmark.syncId } }] };
    }

    return props;
  }

  /**
   * Exchange OAuth code for access tokens
   */
  async exchangeOAuthCode(code: string, redirectUri: string): Promise<any> {
    const encoded = Buffer.from(`${config.notionClientId}:${config.notionClientSecret}`).toString(
      'base64'
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          Authorization: `Basic ${encoded}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `OAuth exchange failed: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      const code = err?.code || err?.cause?.code || 'UNKNOWN';
      const name = err?.name || 'Error';
      throw new Error(
        `OAuth exchange network error (${name}:${code}): ${err?.message || String(err)}`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    const encoded = Buffer.from(`${config.notionClientId}:${config.notionClientSecret}`).toString(
      'base64'
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Basic ${encoded}`,
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Token refresh failed: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      return response.json();
    } catch (err: any) {
      clearTimeout(timeout);
      const code = err?.code || err?.cause?.code || 'UNKNOWN';
      const name = err?.name || 'Error';
      throw new Error(
        `Token refresh network error (${name}:${code}): ${err?.message || String(err)}`
      );
    }
  }

  /**
   * Query a Notion database
   */
  async queryDataSource(
    dataSourceId: string,
    accessToken: string,
    filter?: any,
    sorts?: any[]
  ): Promise<any> {
    const notion = this.getClient(accessToken);
    return await (notion as any).dataSources.query({
      data_source_id: dataSourceId,
      filter,
      sorts,
      page_size: 100,
    });
  }

  /**
   * Search for databases accessible to the user
   */
  async searchDataSources(accessToken: string): Promise<any> {
    const notion = this.getClient(accessToken);
    return await notion.search({
      filter: { property: 'object', value: 'data_source' as any },
      page_size: 100,
    });
  }

  /**
   * Create a new page in Notion
   */
  async createPage(
    parent: any,
    properties: any,
    accessToken: string,
    children?: any[]
  ): Promise<any> {
    const notion = this.getClient(accessToken);
    const normalizedParent = (() => {
      if (!parent || typeof parent !== 'object') return parent;
      if (parent.type === 'database_id' && parent.database_id) {
        return { type: 'data_source_id', data_source_id: parent.database_id };
      }
      return parent;
    })();
    return await notion.pages.create({ parent: normalizedParent, properties, children });
  }

  /**
   * Update an existing page in Notion
   */
  async updatePage(pageId: string, properties: any, accessToken: string): Promise<any> {
    const notion = this.getClient(accessToken);
    return await notion.pages.update({ page_id: pageId, properties });
  }

  /**
   * Get existing bookmarks from database to check for duplicates
   */
  async existingBookmarkUrls(dataSourceId: string, accessToken: string): Promise<string[]> {
    const notion = this.getClient(accessToken);
    // Iterate through all pages (pagination) to build map
    let cursor: string | undefined = undefined;
    let existing: string[] = [];
    do {
      let resp: any;
      try {
        resp = await (notion as any).dataSources.query({
          data_source_id: dataSourceId,
          filter: { property: 'URL', url: { is_not_empty: true } },
          start_cursor: cursor,
          page_size: 100,
        });
      } catch (e) {
        console.warn('[Notion] dataSources.query failed during duplicate scan:', e);
        break;
      }
      const results: any[] = resp?.results || [];
      for (const page of results) {
        if (page?.properties?.URL?.url) {
          existing.push(page.properties.URL.url);
        }
      }
      cursor = resp?.next_cursor || undefined;
    } while (cursor);

    return existing;
  }

  /**
   * Resolve a Notion database id (and its primary data source id) by traversing
   * the children of a duplicated template page and locating a child_database.
   * This helps when the OAuth response only yields duplicated_template_id.
   */
  async resolveDatabaseFromTemplate(
    duplicatedTemplateId: string,
    accessToken: string
  ): Promise<{ databaseId: string; dataSourceId?: string }> {
    const notion = this.getClient(accessToken);

    // 0) Direct check: sometimes duplicated_template_id is already the database_id
    try {
      const db = (await notion.request({
        method: 'get',
        path: `databases/${duplicatedTemplateId}`,
      })) as any;
      if (db && db.object === 'database') {
        let dataSourceId: string | undefined;
        try {
          dataSourceId = await this.getPrimaryDataSourceId(duplicatedTemplateId, accessToken);
        } catch (e) {
          console.warn('[Notion] Primary dataSourceId lookup failed (direct db):', e);
        }
        return { databaseId: duplicatedTemplateId, dataSourceId };
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
    }

    // 0.5) Try retrieving the page to identify object type and children flag
    try {
      await notion.request({
        method: 'get',
        path: `pages/${duplicatedTemplateId}`,
      });
    } catch (pe) {
      console.warn('[Notion] Page retrieve failed for template id (may not be a page):', pe);
    }

    const queue: string[] = [duplicatedTemplateId];
    const visited = new Set<string>();
    const maxDepth = 4;
    const meta = new Map<string, number>([[duplicatedTemplateId, 0]]);

    while (queue.length) {
      const id = queue.shift()!;
      const depth = meta.get(id) || 0;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);
      try {
        const children = await notion.blocks.children.list({ block_id: id, page_size: 100 });
        for (const block of (children as any).results || []) {
          const type = block?.type;
          if (type === 'child_database') {
            const candidateId = block.id as string;
            let verified = false;
            try {
              const db = (await notion.request({
                method: 'get',
                path: `databases/${candidateId}`,
              })) as any;
              if (db && db.object === 'database') {
                verified = true;
              }
            } catch (ve) {
              console.warn(
                '[Notion] Verification failed for child_database id (not accessible?):',
                candidateId,
                ve
              );
            }
            if (verified) {
              let dataSourceId: string | undefined;
              try {
                dataSourceId = await this.getPrimaryDataSourceId(candidateId, accessToken);
              } catch (e) {
                console.warn('[Notion] Primary dataSourceId lookup failed for', candidateId, e);
              }
              return { databaseId: candidateId, dataSourceId };
            }
          }
          // Follow links to page/database from link_to_page blocks
          if (type === 'link_to_page') {
            const link = (block as any).link_to_page;
            if (link?.type === 'database_id' && link.database_id) {
              const dbId = link.database_id as string;
              try {
                const db = (await notion.request({
                  method: 'get',
                  path: `databases/${dbId}`,
                })) as any;
                if (db && db.object === 'database') {
                  let dataSourceId: string | undefined;
                  try {
                    dataSourceId = await this.getPrimaryDataSourceId(dbId, accessToken);
                  } catch (e) {
                    console.warn('[Notion] Primary dataSourceId lookup failed for', dbId, e);
                  }
                  return { databaseId: dbId, dataSourceId };
                }
              } catch (e) {
                console.warn('[Notion] linked database not accessible:', dbId, e);
              }
            } else if (link?.type === 'page_id' && link.page_id) {
              // Enqueue the linked page to traverse its children
              const pageId = link.page_id as string;
              if (!visited.has(pageId)) {
                queue.push(pageId);
                meta.set(pageId, depth + 1);
              }
            }
          }
          if (block?.has_children) {
            queue.push(block.id);
            meta.set(block.id, depth + 1);
          }
        }
      } catch (e) {
        console.warn('[Notion] Error reading children for block', id, e);
      }
    }

    // Fallback: search for actual databases (not data_sources)
    console.warn('[Notion] Fallback to database search; no child_database found from template');
    let search: any;
    try {
      search = await notion.search({
        filter: { property: 'object', value: 'database' as any },
        page_size: 10,
      });
    } catch (se) {
      console.warn('[Notion] Database search failed:', se);
      search = { results: [] };
    }
    const firstDb = (search?.results || [])[0];
    if (!firstDb) {
      throw new Error(
        'No databases accessible to the integration. Ensure the duplicated template database is shared with the integration.'
      );
    }
    const databaseId = firstDb.id as string;
    let dataSourceId: string | undefined;
    try {
      dataSourceId = await this.getPrimaryDataSourceId(databaseId, accessToken);
    } catch (e) {
      console.warn(
        '[Notion] Fallback primary dataSourceId lookup failed for',
        databaseId,
        e,
        '— likely a permissions issue.'
      );
    }
    return { databaseId, dataSourceId };
  }
}

export const notionService = new NotionService();
