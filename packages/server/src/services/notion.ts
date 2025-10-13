// 🔗 Notion API Service Layer

import { Client, APIResponseError } from '@notionhq/client';
import { config } from '../config';
import { NotionPageProperties, BookmarkItem } from '../types';
import { retryRequest, sleep } from '../utils';

export class NotionService {
  private getClient(accessToken: string) {
    return new Client({ auth: accessToken, notionVersion: config.notionApiVersion });
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
      // log database to console for debug
      console.log('Database data sources:', dataSources);

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
    console.log('[Notion] Resolving databaseId from dataSourceId:', dataSourceId);
    // Search for databases the integration can access
    let cursor: string | undefined = undefined;
    do {
      const resp: any = await notion.search({
        filter: { property: 'object', value: 'database' as any },
        start_cursor: cursor,
        page_size: 50,
      });
      const results = resp?.results || [];
      console.log('[Notion] Database search page count:', results.length);
      for (const dbSummary of results) {
        try {
          const db = (await notion.request({
            method: 'get',
            path: `databases/${dbSummary.id}`,
          })) as any;
          const dataSources = (db?.data_sources || []) as Array<{ id: string }>;
          if (Array.isArray(dataSources) && dataSources.some((ds) => ds.id === dataSourceId)) {
            console.log('[Notion] Matched database for dataSourceId:', dbSummary.id);
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
    const ds = (await notion.dataSources.retrieve({ data_source_id: dataSourceId })) as any;
    const schema = ds?.properties || {};
    console.log('[Schema Builder - DataSource] full schema:', schema);
    const props: Record<string, any> = {};
    const entries = Object.entries<any>(schema) as Array<[string, any]>;
    const byType = (type: string) => entries.find(([_, v]) => v?.type === type)?.[0];
    const byTypeNamed = (type: string, regex: RegExp) =>
      entries.find(([k, v]) => v?.type === type && regex.test(k.toLowerCase()))?.[0];

    const titleName = byType('title') || byTypeNamed('title', /name|title/);
    const urlName = byType('url') || byTypeNamed('url', /url|link/);
    const tagsName =
      byTypeNamed('multi_select', /tag|label|category|topic/) || byType('multi_select');
    const descName =
      byTypeNamed('rich_text', /desc|summary|note|description/) || byType('rich_text');
    const folderName =
      byTypeNamed('select', /folder|path|location/) ||
      byTypeNamed('rich_text', /folder|path|location/);
    const dateName = byTypeNamed('date', /date|created|added/) || byType('date');
    const syncIdName = byTypeNamed('rich_text', /sync\s*id|sync|identifier|id/);

    if (titleName && bookmark.title) {
      props[titleName] = { title: [{ text: { content: bookmark.title } }] };
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
    if (folderName && bookmark.folder) {
      const folderSchema = (schema as any)[folderName];
      if (folderSchema?.type === 'select') {
        props[folderName] = { select: { name: bookmark.folder } };
      } else {
        props[folderName] = { rich_text: [{ text: { content: bookmark.folder } }] };
      }
    }
    if (dateName) {
      props[dateName] = { date: { start: bookmark.dateAdded || new Date().toISOString() } };
    }
    if (syncIdName && bookmark.syncId) {
      props[syncIdName] = { rich_text: [{ text: { content: bookmark.syncId } }] };
    }

    console.log('[Schema Builder - DataSource] chosen fields:', {
      dataSourceId,
      titleName,
      urlName,
      tagsName,
      descName,
      folderName,
      dateName,
      syncIdName,
    });

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
    return await notion.dataSources.query({
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
  async getExistingBookmarks(
    dataSourceId: string,
    accessToken: string
  ): Promise<Map<string, { pageId: string; url: string }>> {
    const existing = new Map<string, { pageId: string; url: string }>();

    // Discover key property names from data source schema
    let syncPropName: string | undefined;
    let urlPropName: string | undefined;
    try {
      const notion = this.getClient(accessToken);
      const ds = (await notion.dataSources.retrieve({ data_source_id: dataSourceId })) as any;
      const schema = ds?.properties || {};
      const entries = Object.entries<any>(schema);
      console.log('[Notion] Duplicate scan — data source schema keys:', Object.keys(schema));
      syncPropName = entries.find(
        ([k, v]) => v?.type === 'rich_text' && /sync\s*id|sync|identifier|id/i.test(k)
      )?.[0];
      urlPropName = entries.find(([k, v]) => v?.type === 'url')?.[0];
      console.log('[Notion] Duplicate scan — detected properties:', { syncPropName, urlPropName });
    } catch (e) {
      console.warn('[Notion] Failed to retrieve data source schema for duplicate detection:', e);
    }

    // Iterate through all pages (pagination) to build map
    let cursor: string | undefined = undefined;
    do {
      let resp: any;
      try {
        const filter = syncPropName
          ? { property: syncPropName, rich_text: { is_not_empty: true as true } }
          : undefined;
        resp = await this.getClient(accessToken).dataSources.query({
          data_source_id: dataSourceId,
          filter,
          start_cursor: cursor,
          page_size: 100,
        });
      } catch (e) {
        console.warn('[Notion] dataSources.query failed during duplicate scan:', e);
        break;
      }
      const results: any[] = resp?.results || [];
      for (const page of results) {
        let syncId: string | undefined;
        if (syncPropName) {
          syncId = page.properties?.[syncPropName]?.rich_text?.[0]?.text?.content;
        }
        // Also collect URL key if available
        let pageUrl: string | undefined;
        if (urlPropName) {
          pageUrl = page.properties?.[urlPropName]?.url;
        }
        if (syncId) {
          existing.set(syncId, { pageId: page.id, url: pageUrl || '' });
        }
        if (pageUrl) {
          existing.set(pageUrl, { pageId: page.id, url: pageUrl });
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
    console.log('[Notion] Resolve from template:', duplicatedTemplateId);

    // 0) Direct check: sometimes duplicated_template_id is already the database_id
    try {
      console.log('[Notion] Trying direct database retrieve with id:', duplicatedTemplateId);
      const db = (await notion.request({
        method: 'get',
        path: `databases/${duplicatedTemplateId}`,
      })) as any;
      if (db && db.object === 'database') {
        console.log('[Notion] duplicated_template_id is a database:', duplicatedTemplateId);
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
      console.log('[Notion] Direct database retrieve failed, will traverse blocks. Reason:', msg);
    }

    // 0.5) Try retrieving the page to identify object type and children flag
    try {
      const page = (await notion.request({
        method: 'get',
        path: `pages/${duplicatedTemplateId}`,
      })) as any;
      console.log('[Notion] Page retrieve for template id:', {
        id: page?.id,
        object: page?.object,
        archived: page?.archived,
        // Notion doesn't return has_children in page retrieve; we rely on blocks.children.list
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
        // log children to console for debug
        console.log(`[Notion] Traversing block ${id} at depth ${depth}:`, children);
        for (const block of (children as any).results || []) {
          const type = block?.type;
          console.log('[Notion] Visit child block:', {
            id: block?.id,
            type,
            has_children: !!block?.has_children,
          });
          if (type === 'child_database') {
            const candidateId = block.id as string;
            console.log('[Notion] Found child_database block, verifying database id:', candidateId);
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
              console.log('[Notion] Resolved via traversal:', {
                databaseId: candidateId,
                dataSourceId,
              });
              return { databaseId: candidateId, dataSourceId };
            }
          }
          // Follow links to page/database from link_to_page blocks
          if (type === 'link_to_page') {
            const link = (block as any).link_to_page;
            console.log('[Notion] link_to_page details:', link);
            if (link?.type === 'database_id' && link.database_id) {
              const dbId = link.database_id as string;
              console.log('[Notion] link_to_page points to database, verifying:', dbId);
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
                  console.log('[Notion] Resolved via link_to_page:', {
                    databaseId: dbId,
                    dataSourceId,
                  });
                  return { databaseId: dbId, dataSourceId };
                }
              } catch (e) {
                console.warn('[Notion] linked database not accessible:', dbId, e);
              }
            } else if (link?.type === 'page_id' && link.page_id) {
              // Enqueue the linked page to traverse its children
              const pageId = link.page_id as string;
              if (!visited.has(pageId)) {
                console.log('[Notion] Enqueue linked page for traversal:', pageId);
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
      console.log('[Notion] Database search results:', (search?.results || []).length);
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
    console.log('[Notion] Fallback resolved:', { databaseId, dataSourceId });
    return { databaseId, dataSourceId };
  }
}

export const notionService = new NotionService();
