// 🔗 Notion API Service Layer

import { Client, APIResponseError } from '@notionhq/client';
import { config } from '../config';
import { BookmarkItem } from '../types';

/**
 * Property mapping configuration
 * Defines how bookmark fields map to Notion property types
 */
interface PropertyMatcher {
  bookmarkField: keyof BookmarkItem | 'description';
  type: string;
  patterns: RegExp[];
  required: boolean;
  builder: (value: any) => any;
}

const PROPERTY_MAPPING_CONFIG: PropertyMatcher[] = [
  {
    bookmarkField: 'title',
    type: 'title',
    patterns: [/^name$/i, /^title$/i],
    required: true,
    builder: (value: any) => ({ title: [{ text: { content: value || 'Untitled Bookmark' } }] }),
  },
  {
    bookmarkField: 'url',
    type: 'url',
    patterns: [/^url$/i, /^link$/i, /^website$/i],
    required: false,
    builder: (value: any) => ({ url: value }),
  },
  {
    bookmarkField: 'tags',
    type: 'multi_select',
    patterns: [/tag/i, /label/i, /category/i, /topic/i],
    required: false,
    builder: (value: any) => ({
      multi_select: Array.isArray(value) ? value.map((t) => ({ name: t })) : [],
    }),
  },
  {
    bookmarkField: 'description',
    type: 'rich_text',
    patterns: [/desc/i, /summary/i, /note/i, /content/i],
    required: false,
    builder: (value: any) => ({ rich_text: [{ text: { content: value } }] }),
  },
  {
    bookmarkField: 'path',
    type: 'rich_text',
    patterns: [/folder/i, /path/i, /location/i, /directory/i],
    required: false,
    builder: (value: any) => ({ rich_text: [{ text: { content: value } }] }),
  },
  {
    bookmarkField: 'dateAdded',
    type: 'date',
    patterns: [/date/i, /created/i, /added/i, /time/i],
    required: false,
    builder: (value: any) => ({ date: { start: value || new Date().toISOString() } }),
  },
  {
    bookmarkField: 'syncId',
    type: 'rich_text',
    patterns: [/sync.*id/i, /identifier/i, /^id$/i],
    required: false,
    builder: (value: any) => ({ rich_text: [{ text: { content: value } }] }),
  },
];

/**
 * Read-only property types that should be skipped during property building
 * These are auto-calculated by Notion (e.g., formulas like Site and Status)
 */
const READ_ONLY_PROPERTY_TYPES = new Set([
  'formula',
  'rollup',
  'created_time',
  'created_by',
  'last_edited_time',
  'last_edited_by',
]);

export class NotionService {
  private getClient(accessToken: string) {
    return new Client({ auth: accessToken, notionVersion: config.notionApiVersion });
  }

  /**
   * Resolve the title property name from inline database schema.
   * For inline databases, dataSourceId equals databaseId.
   */
  private async resolveTitlePropertyName(
    dataSourceId: string,
    accessToken: string
  ): Promise<string | undefined> {
    const notion = this.getClient(accessToken);
    try {
      // Use dataSources.retrieve to get properties
      const dataSource: any = await (notion as any).dataSources.retrieve({
        data_source_id: dataSourceId,
      });
      const entries = Object.entries<any>(dataSource?.properties || {});
      const titleProp = entries.find(([_, v]) => v?.type === 'title')?.[0];
      if (titleProp) return titleProp as string;
    } catch (e) {
      console.warn('[Notion] Failed to resolve title property:', e);
    }
    return undefined;
  }

  /**
   * Verify database access and recover if needed.
   * Recovery strategy: re-parse the duplicated template page to find the inline database.
   */
  async verifyDatabaseAccess(
    databaseId: string,
    accessToken: string,
    duplicatedTemplateId?: string
  ): Promise<{ databaseId: string; dataSourceId: string }> {
    const notion = this.getClient(accessToken);

    // Step 1: Try accessing the stored database
    try {
      const db: any = await notion.request({ method: 'get', path: `databases/${databaseId}` });
      if (db && db.object === 'database') {
        const dataSourceId = await this.getPrimaryDataSourceId(databaseId, accessToken);
        return { databaseId, dataSourceId };
      }
    } catch (error) {
      // Step 2: Attempt recovery by re-parsing the duplicated template page
      if (duplicatedTemplateId) {
        console.log('[Notion] Attempting database recovery from template');
        try {
          const resolved = await this.resolveDatabaseFromTemplate(
            duplicatedTemplateId,
            accessToken
          );
          return {
            databaseId: resolved.databaseId,
            dataSourceId: resolved.dataSourceId || resolved.databaseId,
          };
        } catch (resolveError) {
          console.error(
            '[Notion] Database recovery failed:',
            resolveError instanceof Error ? resolveError.message : resolveError
          );
        }
      }

      // Step 3: Unrecoverable - user needs to reconnect
      throw new Error(
        `Database ${databaseId} is not accessible and recovery failed. Please reconnect your Notion integration to re-authorize database access.`
      );
    }

    throw new Error(`Invalid database response for ${databaseId}`);
  }

  /**
   * Get the primary data source ID for an inline database.
   * For inline databases, the database ID serves as the data source ID.
   */
  async getPrimaryDataSourceId(databaseId: string, accessToken: string): Promise<string> {
    const notion = this.getClient(accessToken);

    try {
      const db = (await notion.request({
        method: 'get',
        path: `databases/${databaseId}`,
      })) as any;

      if (db.data_sources && db.data_sources.length > 0) {
        return db.data_sources[0].id;
      }

      throw new Error('No data sources found in database object');
    } catch (error) {
      console.error('[Notion] ❌ Failed to get data source ID:', error);
      throw error;
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
   * Build properties using inline database schema with configuration-driven mapping.
   * For inline databases, dataSourceId equals databaseId.
   * Automatically skips read-only properties (formula, rollup, created_time, etc.)
   */
  async buildPropertiesFromDataSource(
    dataSourceId: string,
    accessToken: string,
    bookmark: BookmarkItem
  ): Promise<Record<string, any>> {
    const notion = this.getClient(accessToken);

    // 🚨 CRITICAL: Use dataSources.retrieve, not databases API
    // In API 2025-09-03, properties are in data source, not database
    const dataSource: any = await (notion as any).dataSources.retrieve({
      data_source_id: dataSourceId,
    });

    const schema = dataSource?.properties || {};

    // Filter out read-only property types using shared configuration
    const writableEntries = Object.entries<any>(schema).filter(
      ([_, propDef]) => !READ_ONLY_PROPERTY_TYPES.has(propDef?.type)
    );

    const props: Record<string, any> = {};

    // Iterate through configuration-driven property matchers
    for (const matcher of PROPERTY_MAPPING_CONFIG) {
      const bookmarkValue = (bookmark as any)[matcher.bookmarkField];

      // Skip if no value and not required
      if (!bookmarkValue && !matcher.required) continue;

      // Find matching property name in schema using matcher configuration
      const propertyName = this.findPropertyName(
        matcher,
        writableEntries,
        dataSourceId,
        accessToken
      );

      // Build and assign property value if name found
      if (propertyName) {
        const resolvedName = await propertyName;
        if (resolvedName) {
          props[resolvedName] = matcher.builder(bookmarkValue);
        }
      }
    }

    return props;
  }

  /**
   * Find property name in schema based on matcher configuration.
   * Uses three-tier matching strategy: pattern → type → fallback
   */
  private async findPropertyName(
    matcher: PropertyMatcher,
    writableEntries: Array<[string, any]>,
    dataSourceId: string,
    accessToken: string
  ): Promise<string | undefined> {
    // 1. Try pattern matching first (most specific)
    for (const pattern of matcher.patterns) {
      const match = writableEntries.find(
        ([name, propDef]) => propDef?.type === matcher.type && pattern.test(name)
      )?.[0];
      if (match) return match;
    }

    // 2. Fallback to any property of the correct type (less specific)
    const typeMatch = writableEntries.find(([_, propDef]) => propDef?.type === matcher.type)?.[0];
    if (typeMatch) return typeMatch;

    // 3. For required title property, use ultimate fallback
    if (matcher.required && matcher.type === 'title') {
      const titleFromFallback = await this.resolveTitlePropertyName(dataSourceId, accessToken);
      const fallbackName = titleFromFallback || 'Name';
      console.warn(`[Notion] Using fallback title property: "${fallbackName}"`);
      return fallbackName;
    }

    return undefined;
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
   * Uses low-level request() API to match verification pattern
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
   * For inline databases, parent should be { type: 'database_id', database_id: '<id>' }
   */
  async createPage(
    parent: any,
    properties: any,
    accessToken: string,
    children?: any[]
  ): Promise<any> {
    const notion = this.getClient(accessToken);
    return await notion.pages.create({ parent, properties, children });
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
    // TODO: Implement duplicate checking using dataSources.query
    // Currently skipped to avoid API errors with inline databases
    return [];
  }

  /**
   * Resolve inline database from duplicated template by traversing child_database blocks.
   * Template structure: duplicated_template_id is a page containing inline database.
   */
  async resolveDatabaseFromTemplate(
    duplicatedTemplateId: string,
    accessToken: string
  ): Promise<{ databaseId: string; dataSourceId?: string }> {
    const notion = this.getClient(accessToken);

    console.log('[Notion] 🔍 Starting template resolution for:', duplicatedTemplateId);

    const queue: string[] = [duplicatedTemplateId];
    const visited = new Set<string>();
    const maxDepth = 4; // Limit traversal depth to avoid infinite loops
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
            console.log('[Notion] Found child_database:', candidateId);

            try {
              const db = (await notion.request({
                method: 'get',
                path: `databases/${candidateId}`,
              })) as any;

              if (db && db.object === 'database') {
                // Skip linked database views, only use inline databases
                if (db.is_inline === false) {
                  console.log('[Notion] Skipping linked database view (is_inline=false)');
                  continue;
                }

                console.log('[Notion] ✅ Found inline database:', db.id);

                // Extract data_source_id from data_sources array
                if (db.data_sources && db.data_sources.length > 0) {
                  const dataSourceId = db.data_sources[0].id;
                  console.log('[Notion] ✅ Resolved:', { databaseId: candidateId, dataSourceId });
                  return { databaseId: candidateId, dataSourceId };
                } else {
                  throw new Error('Database has no data_sources - this should not happen');
                }
              }
            } catch (ve) {
              console.warn('[Notion] Database not accessible:', candidateId);
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

    throw new Error(
      'No inline database found in template. Ensure the template contains a database and is shared with the integration.'
    );
  }
}

export const notionService = new NotionService();
