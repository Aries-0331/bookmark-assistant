// 🔗 Notion API Service Layer

import { config } from '../config';
import { NotionPageProperties, BookmarkItem, UserData } from '../types';
import { retryRequest, sleep } from '../utils';

export class NotionService {
  /**
   * Make authenticated request to Notion API with retry logic
   */
  private async makeNotionRequest(
    url: string,
    options: RequestInit,
    accessToken: string,
    maxRetries = 3
  ): Promise<Response> {
    const requestOptions = {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': config.notionApiVersion,
        ...options.headers,
      },
    };

    return retryRequest(async () => {
      const response = await fetch(url, requestOptions);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || '1';
        await sleep(parseInt(retryAfter) * 1000);
        throw new Error('Rate limited, retrying...');
      }

      return response;
    }, maxRetries);
  }

  /**
   * Exchange OAuth code for access tokens
   */
  async exchangeOAuthCode(code: string, redirectUri: string): Promise<any> {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${config.notionClientId}:${config.notionClientSecret}`
        ).toString('base64')}`,
        'Notion-Version': config.notionApiVersion,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OAuth exchange failed: ${errorData}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<any> {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${config.notionClientId}:${config.notionClientSecret}`
        ).toString('base64')}`,
        'Notion-Version': config.notionApiVersion,
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${errorData}`);
    }

    return response.json();
  }

  /**
   * Query a Notion database
   */
  async queryDatabase(
    databaseId: string,
    accessToken: string,
    filter?: any,
    sorts?: any[]
  ): Promise<any> {
    const response = await this.makeNotionRequest(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          filter,
          sorts,
          page_size: 100,
        }),
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Database query failed: ${errorData}`);
    }

    return response.json();
  }

  /**
   * Search for databases accessible to the user
   */
  async searchDatabases(accessToken: string): Promise<any> {
    const response = await this.makeNotionRequest(
      'https://api.notion.com/v1/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            value: 'database',
            property: 'object',
          },
          page_size: 100,
        }),
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Database search failed: ${errorData}`);
    }

    return response.json();
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
    const response = await this.makeNotionRequest(
      'https://api.notion.com/v1/pages',
      {
        method: 'POST',
        body: JSON.stringify({
          parent,
          properties,
          children,
        }),
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Page creation failed: ${errorData}`);
    }

    return response.json();
  }

  /**
   * Update an existing page in Notion
   */
  async updatePage(pageId: string, properties: any, accessToken: string): Promise<any> {
    const response = await this.makeNotionRequest(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ properties }),
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Page update failed: ${errorData}`);
    }

    return response.json();
  }

  /**
   * Duplicate the bookmark template
   */
  async duplicateTemplate(accessToken: string): Promise<any> {
    const response = await this.makeNotionRequest(
      'https://api.notion.com/v1/pages',
      {
        method: 'POST',
        body: JSON.stringify({
          parent: { type: 'page_id', page_id: config.templatePageId },
          properties: {
            title: {
              title: [{ text: { content: '📚 Chrome Bookmarks DB' } }],
            },
          },
        }),
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Template duplication failed: ${errorData}`);
    }

    return response.json();
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
    databaseId: string,
    accessToken: string
  ): Promise<Map<string, { pageId: string; url: string }>> {
    const existingBookmarks = new Map();

    const response = await this.queryDatabase(databaseId, accessToken, {
      property: 'Sync ID',
      rich_text: { is_not_empty: true },
    });

    if (response.results) {
      response.results.forEach((page: any) => {
        const syncId = page.properties['Sync ID']?.rich_text?.[0]?.text?.content;
        if (syncId) {
          existingBookmarks.set(syncId, {
            pageId: page.id,
            url: page.properties['URL']?.url,
          });
        }
      });
    }

    return existingBookmarks;
  }
}

export const notionService = new NotionService();
