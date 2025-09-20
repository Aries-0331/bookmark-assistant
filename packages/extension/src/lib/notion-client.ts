// 🔮 Lightweight Notion API Client for Chrome Extension
// Direct integration with Notion API without server dependency

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
}

export interface NotionPage {
  id: string;
  url: string;
  title: string;
  properties: Record<string, any>;
}

class NotionClient {
  private accessToken: string | null = null;

  async initialize() {
    const result = await chrome.storage.local.get(['notion_access_token']);
    this.accessToken = result.notion_access_token || null;
  }

  private async makeNotionRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      await this.initialize();
      if (!this.accessToken) {
        throw new Error('No Notion access token available. Please authenticate first.');
      }
    }

    const url = `https://api.notion.com/v1${endpoint}`;

    const response = await globalThis.fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        ...((options.headers as Record<string, string>) || {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // 📚 Get all databases
  async getDatabases(): Promise<NotionDatabase[]> {
    const response = await this.makeNotionRequest<any>('/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: 'object',
          value: 'database',
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      }),
    });

    return response.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled Database',
      url: db.url,
      createdTime: db.created_time,
      lastEditedTime: db.last_edited_time,
    }));
  }

  // 📄 Create a page in database
  async createPage(databaseId: string, properties: Record<string, any>): Promise<NotionPage> {
    const response = await this.makeNotionRequest<any>('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          database_id: databaseId,
        },
        properties,
      }),
    });

    return {
      id: response.id,
      url: response.url,
      title: response.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
      properties: response.properties,
    };
  }

  // 🔍 Query database pages
  async queryDatabase(databaseId: string, filter?: any): Promise<NotionPage[]> {
    const response = await this.makeNotionRequest<any>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter,
        sorts: [
          {
            property: 'Name',
            direction: 'ascending',
          },
        ],
      }),
    });

    return response.results.map((page: any) => ({
      id: page.id,
      url: page.url,
      title: page.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
      properties: page.properties,
    }));
  }

  // 📝 Update a page
  async updatePage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
    const response = await this.makeNotionRequest<any>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties,
      }),
    });

    return {
      id: response.id,
      url: response.url,
      title: response.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
      properties: response.properties,
    };
  }

  // 🏗️ Create a bookmark database
  async createBookmarkDatabase(title: string = 'Bookmarks'): Promise<NotionDatabase> {
    // First get the workspace (we need a parent page)
    const response = await this.makeNotionRequest<any>('/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: 'object',
          value: 'page',
        },
        page_size: 1,
      }),
    });

    if (!response.results.length) {
      throw new Error('No pages found in workspace. Please create a page first.');
    }

    const parentPageId = response.results[0].id;

    const databaseResponse = await this.makeNotionRequest<any>('/databases', {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          page_id: parentPageId,
        },
        title: [
          {
            type: 'text',
            text: {
              content: title,
            },
          },
        ],
        properties: {
          Name: {
            title: {},
          },
          URL: {
            url: {},
          },
          Description: {
            rich_text: {},
          },
          Path: {
            rich_text: {},
          },
          'Date Added': {
            date: {},
          },
          Tags: {
            multi_select: {
              options: [],
            },
          },
        },
      }),
    });

    return {
      id: databaseResponse.id,
      title: databaseResponse.title?.[0]?.plain_text || title,
      url: databaseResponse.url,
      createdTime: databaseResponse.created_time,
      lastEditedTime: databaseResponse.last_edited_time,
    };
  }

  // 📊 Get user info
  async getUser(): Promise<any> {
    return this.makeNotionRequest<any>('/users/me');
  }
}

// Export singleton instance
export const notionClient = new NotionClient();

// Helper function to format bookmark for Notion
export function formatBookmarkForNotion(
  bookmark: chrome.bookmarks.BookmarkTreeNode,
  path: string
): Record<string, any> {
  return {
    Name: {
      title: [
        {
          type: 'text',
          text: {
            content: bookmark.title || 'Untitled Bookmark',
          },
        },
      ],
    },
    URL: {
      url: bookmark.url || '',
    },
    Description: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Imported from Chrome bookmarks (${path})`,
          },
        },
      ],
    },
    Path: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: path,
          },
        },
      ],
    },
    'Date Added': {
      date: {
        start: bookmark.dateAdded
          ? new Date(bookmark.dateAdded).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      },
    },
  };
}
