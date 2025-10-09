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
   * Resolve a data_source_id from a database_id using 2025-09-03 Retrieve Database.
   * Returns the first data source ID by default.
   */
  async getPrimaryDataSourceId(databaseId: string, accessToken: string): Promise<string> {
    const notion = this.getClient(accessToken);
    const data = await notion.databases.retrieve({ database_id: databaseId });
    const sources = (data as any)?.data_sources as Array<{ id: string; name?: string }> | undefined;
    if (!sources || sources.length === 0) {
      throw new Error('No data sources found for database');
    }
    return sources[0].id;
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
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${encoded}`,
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
   * Duplicate the bookmark template
   */
  async duplicateTemplate(accessToken: string): Promise<any> {
    const notion = this.getClient(accessToken);
    return await notion.pages.create({
      parent: { type: 'page_id', page_id: config.templatePageId },
      properties: {
        title: { title: [{ text: { content: '📚 Chrome Bookmarks DB' } }] },
      },
    });
  }

  /**
   * Create Notion properties object for a bookmark
   */
  createBookmarkProperties(bookmark: BookmarkItem): NotionPageProperties {
    return {
      Title: {
        title: [{ text: { content: bookmark.title } }],
      },
      URL: {
        url: bookmark.url,
      },
      Folder: {
        rich_text: [{ text: { content: bookmark.folder || 'Default' } }],
      },
      Tags: {
        multi_select: (bookmark.tags || []).map((tag: string) => ({ name: tag })),
      },
      'Date Added': {
        date: { start: bookmark.dateAdded! },
      },
      'Sync ID': {
        rich_text: [{ text: { content: bookmark.syncId! } }],
      },
    };
  }

  /**
   * Get existing bookmarks from database to check for duplicates
   */
  async getExistingBookmarks(
    databaseIdOrDataSourceId: string,
    accessToken: string
  ): Promise<Map<string, { pageId: string; url: string }>> {
    const existingBookmarks = new Map();
    const response = await this.queryDataSource(databaseIdOrDataSourceId, accessToken, {
      property: 'Sync ID',
      rich_text: { is_not_empty: true },
    });
    const results = (response as any)?.results || [];
    for (const page of results) {
      const syncId = page.properties?.['Sync ID']?.rich_text?.[0]?.text?.content;
      if (syncId) {
        existingBookmarks.set(syncId, {
          pageId: page.id,
          url: page.properties?.['URL']?.url,
        });
      }
    }
    return existingBookmarks;
  }
}

export const notionService = new NotionService();
