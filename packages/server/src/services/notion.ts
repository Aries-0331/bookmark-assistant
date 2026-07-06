// 🔗 Notion API Service Layer

import { Client, APIResponseError } from '@notionhq/client';
import type { LinkItem as BookmarkItem } from '@bookmark-assistant/contracts';
import {
  buildBookmarkPropertiesFromNotionSchema,
  getPrimaryNotionDataSourceId,
  hasNotionDataSourceId,
} from '@bookmark-assistant/server-core';
import { config } from '../config';
import { isValidUrl } from '../utils';

export class NotionService {
  /**
   * Helper method to wrap Notion API calls with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 30s')), 30000);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        return result as T;
      } catch (error: any) {
        lastError = error;
        const isNetworkError =
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('fetch failed') ||
          error.message?.includes('timeout') ||
          error.code === 'ECONNRESET' ||
          error.cause?.errno === -54;

        if (isNetworkError && attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(
            `[Notion] ${operationName} attempt ${attempt + 1} failed (${error.message || error.code || error}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (error.status === 429 && attempt < maxRetries) {
          const delay = 5000; // 5s for rate limits
          console.log(
            `[Notion] ${operationName} rate limited (attempt ${attempt + 1}), waiting ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }
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
   * Verify database access.
   * Note: We no longer attempt recovery from template because each reconnection
   * creates a new duplicated database. If database is inaccessible, fail fast.
   */
  async verifyDatabaseAccess(
    databaseId: string,
    accessToken: string
  ): Promise<{ databaseId: string; dataSourceId: string }> {
    const notion = this.getClient(accessToken);

    // Try accessing the stored database with retry
    try {
      console.log(`[Notion] Verifying database access for ${databaseId}...`);
      const db: any = await this.withRetry(
        () => notion.request({ method: 'get', path: `databases/${databaseId}` }),
        `Verify database ${databaseId}`,
        3
      );
      if (db && db.object === 'database') {
        console.log(`[Notion] ✓ Database ${databaseId} is accessible`);
        const dataSourceId = await this.getPrimaryDataSourceId(databaseId, accessToken);
        return { databaseId, dataSourceId };
      }
    } catch (error: any) {
      console.error(`[Notion] ✗ Failed to access database ${databaseId}:`, error.message || error);
      // Fail fast - user needs to reconnect
      throw new Error(
        `Database ${databaseId} is not accessible. Please reconnect your Notion integration to re-authorize database access.`
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
      const db: any = await this.withRetry(
        () =>
          notion.request({
            method: 'get',
            path: `databases/${databaseId}`,
          }),
        `Get data source for ${databaseId}`,
        3
      );

      const dataSourceId = getPrimaryNotionDataSourceId(db);
      if (dataSourceId) return dataSourceId;

      throw new Error('No data sources found in database object');
    } catch (error: any) {
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
          if (hasNotionDataSourceId(db, dataSourceId)) {
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
    const hasTitleProperty = Object.values<any>(schema).some(
      (propDef) => propDef?.type === 'title'
    );
    const fallbackTitlePropertyName = hasTitleProperty
      ? undefined
      : await this.resolveTitlePropertyName(dataSourceId, accessToken);

    if (!hasTitleProperty) {
      console.warn(
        `[Notion] Using fallback title property: "${fallbackTitlePropertyName || 'Name'}"`
      );
    }

    return buildBookmarkPropertiesFromNotionSchema(schema, bookmark, {
      fallbackTitlePropertyName,
    });
  }

  /**
   * Exchange OAuth code for access tokens
   * Includes retry logic for network errors (ECONNRESET, etc.)
   */
  async exchangeOAuthCode(code: string, redirectUri: string): Promise<any> {
    const encoded = Buffer.from(`${config.notionClientId}:${config.notionClientSecret}`).toString(
      'base64'
    );

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
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
        attempt++;

        const errorCode = err?.code || err?.cause?.code || 'UNKNOWN';
        const errorName = err?.name || 'Error';

        // Check if it's a retryable network error
        const isNetworkError =
          errorCode === 'ECONNRESET' ||
          errorCode === 'ETIMEDOUT' ||
          errorCode === 'ENOTFOUND' ||
          errorCode === 'ECONNREFUSED' ||
          err?.message?.includes('fetch failed') ||
          err?.message?.includes('network');

        if (isNetworkError && attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          const delayMs = 500 * Math.pow(2, attempt - 1);
          console.warn(
            `[OAuth] Network error (${errorName}:${errorCode}), retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // If not a network error or max retries reached, throw
        throw new Error(
          `OAuth exchange network error (${errorName}:${errorCode}): ${err?.message || String(err)}`
        );
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new Error('OAuth exchange failed after all retries');
  }

  /**
   * Refresh access token using refresh token
   * Includes retry logic for network errors
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    const encoded = Buffer.from(`${config.notionClientId}:${config.notionClientSecret}`).toString(
      'base64'
    );

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
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
        attempt++;

        const errorCode = err?.code || err?.cause?.code || 'UNKNOWN';
        const errorName = err?.name || 'Error';

        // Check if it's a retryable network error
        const isNetworkError =
          errorCode === 'ECONNRESET' ||
          errorCode === 'ETIMEDOUT' ||
          errorCode === 'ENOTFOUND' ||
          errorCode === 'ECONNREFUSED' ||
          err?.message?.includes('fetch failed') ||
          err?.message?.includes('network');

        if (isNetworkError && attempt < maxRetries) {
          const delayMs = 500 * Math.pow(2, attempt - 1);
          console.warn(
            `[OAuth] Token refresh network error (${errorName}:${errorCode}), retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // If not a network error or max retries reached, throw
        throw new Error(
          `Token refresh network error (${errorName}:${errorCode}): ${err?.message || String(err)}`
        );
      }
    }

    throw new Error('Token refresh failed after all retries');
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
    children?: any[],
    iconUrl?: string
  ): Promise<any> {
    const notion = this.getClient(accessToken);

    const pagePayload: any = { parent, properties, children };

    // Add icon if provided
    if (iconUrl) {
      pagePayload.icon = {
        type: 'external',
        external: {
          url: iconUrl,
        },
      };
    }

    return await notion.pages.create(pagePayload);
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
   * Returns both URLs and syncIds for comparison
   */
  async existingBookmarkUrls(
    dataSourceId: string,
    accessToken: string,
    options: { maxPages?: number; timeoutMs?: number } = {}
  ): Promise<{
    urls: string[];
    syncIds: string[];
  }> {
    const notion = this.getClient(accessToken);
    const urls: string[] = [];
    const syncIds: string[] = [];
    let cursor: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = options.maxPages || 50; // Reduced from 100 to avoid rate limits
    const timeoutMs = options.timeoutMs || 30000; // 30 second timeout

    const attemptFetch = async (retryCount = 0): Promise<any> => {
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second

      try {
        // Add timeout to the API call
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
        });

        const fetchPromise = (notion as any).dataSources.query({
          data_source_id: dataSourceId,
          page_size: 100,
          start_cursor: cursor,
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        return response;
      } catch (error: any) {
        console.warn(`[Notion] Fetch attempt ${retryCount + 1} failed:`, error.message || error);

        // Check if it's a network/connection error
        const isNetworkError =
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('fetch failed') ||
          error.message?.includes('timeout') ||
          error.code === 'ECONNRESET' ||
          error.cause?.errno === -54;

        if (retryCount < maxRetries && isNetworkError) {
          const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(
            `[Notion] Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return attemptFetch(retryCount + 1);
        }

        // If it's a rate limit error, wait longer
        if (error.status === 429 || error.message?.includes('rate limit')) {
          const delay = baseDelay * 5; // 5 second delay for rate limits
          console.log(`[Notion] Rate limited, waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          if (retryCount < maxRetries) {
            return attemptFetch(retryCount + 1);
          }
        }

        throw error;
      }
    };

    try {
      do {
        pageCount++;
        if (pageCount > maxPages) {
          console.warn(
            `[Notion] Reached max pages limit (${maxPages}) while fetching existing bookmarks. ` +
              `Found ${urls.length} URLs so far.`
          );
          break;
        }

        console.debug(`[Notion] Fetching existing bookmarks page ${pageCount}/${maxPages}...`);

        const response = await attemptFetch();
        const results = response?.results || [];

        console.debug(
          `[Notion] Fetched page ${pageCount} with ${results.length} bookmarks (total: ${urls.length})`
        );

        // Extract URL and syncId from each page
        for (const page of results) {
          const properties = page.properties || {};

          // Debug: log property types found in first few pages
          if (pageCount <= 1 && config.debug) {
            const propTypes = Object.entries(properties).map(([name, def]: [string, any]) => ({
              name,
              type: def?.type,
            }));
            console.debug('[Notion] Property types found:', propTypes);
          }

          // Extract URL - check both url type and rich_text for valid URLs
          let urlValue: string | null = null;
          for (const [_propName, propDef] of Object.entries(properties)) {
            const def = propDef as any;
            // First try native url type
            if (def?.type === 'url' && def?.url) {
              urlValue = def.url;
              break;
            }
            // Fallback: check rich_text for valid URLs
            // Some Notion databases store URLs as text instead of url type
            if (def?.type === 'rich_text' && Array.isArray(def?.rich_text)) {
              const text = def.rich_text
                .map((t: any) => t?.plain_text || '')
                .join('')
                .trim();
              if (isValidUrl(text)) {
                urlValue = text;
                break;
              }
            }
          }
          if (urlValue) {
            urls.push(urlValue);
          }

          // Extract syncId (rich_text property matching patterns)
          let syncIdValue: string | null = null;
          for (const [propName, propDef] of Object.entries(properties)) {
            const def = propDef as any;
            if (def?.type === 'rich_text' && Array.isArray(def?.rich_text)) {
              // Check if property name matches syncId patterns
              if (/sync.*id/i.test(propName) || /identifier/i.test(propName) || propName === 'id') {
                const text = def.rich_text
                  .map((t: any) => t?.plain_text || '')
                  .join('')
                  .trim();
                if (text) {
                  syncIdValue = text;
                  break;
                }
              }
            }
          }
          if (syncIdValue) {
            syncIds.push(syncIdValue);
          }
        }

        cursor = response?.next_cursor || undefined;

        // Small delay between pages to respect rate limits
        if (cursor && pageCount < maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 350)); // ~3 requests per second
        }
      } while (cursor);

      console.log(
        `[Notion] ✓ Successfully fetched ${urls.length} URLs and ${syncIds.length} syncIds from ${pageCount} pages`
      );
      return { urls, syncIds };
    } catch (error: any) {
      console.error(
        `[Notion] ✗ Failed to fetch existing bookmarks after ${pageCount} pages:`,
        error.message || error
      );
      console.error(
        `[Notion] Partial data collected: ${urls.length} URLs, ${syncIds.length} syncIds`
      );

      // Return what we have so far instead of empty arrays
      // This allows the sync to continue with partial duplicate checking
      return { urls, syncIds };
    }
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
        console.log(`[Notion] Reading children for block ${id} (depth ${depth})...`);

        // Don't use withRetry here - we need to capture partial results on error
        let children: any;
        let childrenResults: any[] = [];
        let fetchError: any = null;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);

          const response = await notion.blocks.children.list({
            block_id: id,
            page_size: 100,
          });

          clearTimeout(timeout);
          children = response;
          childrenResults = (children as any)?.results || [];
        } catch (innerError: any) {
          // Check if we got partial results before the error
          // The Notion SDK might have returned some blocks even with the error
          console.log(`[Notion] ⚠️ Error during fetch:`, innerError.message);
          fetchError = innerError;

          // Try to extract any partial results from the error if possible
          // Otherwise continue with empty results
          childrenResults = [];
        }

        // Log children response details for debugging
        if (fetchError) {
          console.log(`[Notion] Warning: Error during fetch but continuing: ${fetchError.message}`);
        }
        if (childrenResults.length > 0) {
          const blockTypes = [...new Set(childrenResults.map((b: any) => b?.type).filter(Boolean))];
          console.log(
            `[Notion] Found ${childrenResults.length} blocks (${(children as any)?.has_more ? 'more coming' : 'complete'}):`,
            blockTypes
          );
        }

        for (const block of childrenResults) {
          const type = block?.type;

          if (type === 'child_database') {
            const candidateId = block.id as string;
            console.log('[Notion] Found child_database:', candidateId);

            try {
              const db: any = await this.withRetry(
                () =>
                  notion.request({
                    method: 'get',
                    path: `databases/${candidateId}`,
                  }),
                `Get database ${candidateId}`,
                3
              );

              if (db && db.object === 'database') {
                // Skip linked database views, only use inline databases
                if (db.is_inline === false) {
                  console.log('[Notion] Skipping linked database view (is_inline=false)');
                  continue;
                }

                console.log('[Notion] ✅ Found inline database:', db.id);

                const dataSourceId = getPrimaryNotionDataSourceId(db);
                if (dataSourceId) {
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

            // Rate limiting: wait before adding more to queue
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      } catch (e: any) {
        // Log error details for debugging
        const errorCode = (e as any)?.code || 'unknown';
        const errorMessage = e.message || String(e);
        console.error(`[Notion] Error reading children for block ${id}:`, errorMessage);
        if (errorCode !== 'unknown') {
          console.error(`[Notion] Error code:`, errorCode);
        }
        // Continue processing other blocks instead of failing completely
      }
    }

    throw new Error(
      'No inline database found in template. Ensure the template contains a database and is shared with the integration.'
    );
  }
}

export const notionService = new NotionService();
