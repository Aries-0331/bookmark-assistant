// 🔐 Server-First API Client
// This module handles all server communication for the Chrome extension

// NOTE: Window polyfill removed since @notionhq/client is no longer used in extension
// Service worker compatibility check
// if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
//   (globalThis as any).window = globalThis;
// }

export interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BookmarkData {
  title: string;
  url: string;
  description?: string;
  path?: string;
  dateAdded?: string;
  syncId?: string;
}

class ServerAPIClient {
  private baseUrl: string;
  private sessionToken: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OAUTH_SERVER_URL || 'http://localhost:3333';
    this.loadSessionToken();
  }

  private async loadSessionToken() {
    const result = await chrome.storage.local.get(['session_token']);
    this.sessionToken = result.session_token || null;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log('🔬 makeRequest called with endpoint:', endpoint);
    console.log('🔬 typeof globalThis:', typeof globalThis);
    console.log('🔬 typeof globalThis.fetch:', typeof globalThis.fetch);
    console.log('🔬 Service worker environment confirmed');

    const url = `${this.baseUrl}${endpoint}`;
    console.log('🔬 Full URL:', url);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Extension-ID': chrome.runtime.id,
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add session token if available
    if (this.sessionToken && !endpoint.includes('/oauth/exchange')) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    try {
      console.log('🔬 About to call globalThis.fetch...');
      // Use service worker compatible fetch
      const response = await globalThis.fetch(url, {
        ...options,
        headers,
      });

      console.log('🔬 Fetch completed, status:', response.status);

      // Handle non-JSON responses gracefully
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // 🔐 OAuth Token Exchange (Direct Notion API)
  async exchangeOAuthCode(
    code: string,
    redirectUri: string
  ): Promise<{
    sessionToken: string;
    user: any;
  }> {
    console.log('🔬 Starting DIRECT Notion OAuth code exchange...');
    console.log('🔬 Code:', code.substring(0, 8) + '...');
    console.log('🔬 Redirect URI:', redirectUri);

    try {
      // Get Notion OAuth credentials from environment
      const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_NOTION_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Notion OAuth credentials not configured');
      }

      console.log('🔬 Client ID:', clientId.substring(0, 8) + '...');

      // Call Notion OAuth API directly
      const response = await globalThis.fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      console.log('🔬 Notion API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔬 Notion OAuth API error:', errorText);
        throw new Error(`Notion OAuth failed: ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('🔬 Token exchange successful:', {
        hasAccessToken: !!tokenData.access_token,
        workspaceName: tokenData.workspace_name,
        botId: tokenData.bot_id,
      });

      // Store tokens in Chrome storage
      const sessionToken = `notion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await chrome.storage.local.set({
        session_token: sessionToken,
        notion_access_token: tokenData.access_token,
        notion_refresh_token: tokenData.refresh_token,
        notion_workspace_id: tokenData.workspace_id,
        notion_workspace_name: tokenData.workspace_name,
        notion_bot_id: tokenData.bot_id,
        oauth_timestamp: Date.now(),
      });

      this.sessionToken = sessionToken;

      return {
        sessionToken,
        user: {
          workspaceId: tokenData.workspace_id,
          workspaceName: tokenData.workspace_name,
          botId: tokenData.bot_id,
          accessToken: tokenData.access_token,
        },
      };
    } catch (error) {
      console.error('🔬 Direct OAuth exchange failed:', error);
      throw error;
    }
  }

  // 🎨 Duplicate Template
  async duplicateTemplate(templateId?: string): Promise<{
    database: {
      id: string;
      name: string;
      url: string;
    };
  }> {
    const response = await this.makeRequest<any>('/template/duplicate', {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });

    // Update local storage with database info
    await chrome.storage.local.set({
      notion_database_id: response.database.id,
      database_name: response.database.name,
    });

    return response;
  }

  // 📚 Sync Bookmarks (High-Level)
  async syncBookmarks(
    bookmarks: BookmarkData[],
    databaseId?: string
  ): Promise<{
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    results: any[];
  }> {
    return await this.makeRequest<any>('/bookmarks/sync', {
      method: 'POST',
      body: JSON.stringify({
        bookmarks,
        databaseId,
      }),
    });
  }

  // 🔄 Smart Upsert Bookmarks
  async upsertBookmarks(
    bookmarks: BookmarkData[],
    databaseId?: string
  ): Promise<{
    summary: {
      total: number;
      created: number;
      updated: number;
      failed: number;
    };
    results: any[];
  }> {
    return await this.makeRequest<any>('/bookmarks/upsert', {
      method: 'POST',
      body: JSON.stringify({
        bookmarks,
        databaseId,
      }),
    });
  }

  // 🗄️ Get Databases
  async getDatabases(): Promise<{
    databases: Array<{
      id: string;
      title: string;
      url: string;
      createdTime: string;
      lastEditedTime: string;
    }>;
  }> {
    return await this.makeRequest<any>('/notion/databases');
  }

  // 👤 Get User Profile
  async getUserProfile(): Promise<{
    user: {
      userId: string;
      workspaceId: string;
      hasTemplate: boolean;
      databaseId: string | null;
      databaseName: string;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    return await this.makeRequest<any>('/user/profile');
  }

  // 🔄 Refresh Session
  async refreshSession(): Promise<void> {
    await this.makeRequest<any>('/oauth/refresh', {
      method: 'POST',
    });
  }

  // 🧪 Health Check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
  }> {
    return await this.makeRequest<any>('/health');
  }

  // 🔌 Check Connection Status
  async isConnected(): Promise<boolean> {
    try {
      await this.loadSessionToken();
      if (!this.sessionToken) return false;

      await this.getUserProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  // 🚪 Logout
  async logout(): Promise<void> {
    this.sessionToken = null;
    await chrome.storage.local.remove([
      'session_token',
      'notion_user',
      'notion_database_id',
      'database_name',
    ]);
  }
}

// Export singleton instance
export const serverAPI = new ServerAPIClient();

// Helper function to convert Chrome bookmarks to server format
export function formatBookmarkForServer(
  bookmark: chrome.bookmarks.BookmarkTreeNode,
  path: string
): BookmarkData {
  return {
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    description: `Imported from Chrome bookmarks`,
    path: path,
    dateAdded: bookmark.dateAdded
      ? new Date(bookmark.dateAdded).toISOString()
      : new Date().toISOString(),
    syncId: `${bookmark.url}-${bookmark.dateAdded || Date.now()}`,
  };
}

// Helper function to batch process bookmarks
export async function syncAllBookmarksViaServer(
  bookmarks: chrome.bookmarks.BookmarkTreeNode[]
): Promise<void> {
  try {
    console.log('🔄 Starting server-side bookmark sync...');

    // Format bookmarks for server
    const formattedBookmarks: BookmarkData[] = [];

    function flattenBookmarks(
      nodes: chrome.bookmarks.BookmarkTreeNode[],
      currentPath: string = 'Bookmarks'
    ) {
      for (const node of nodes) {
        if (node.url) {
          // It's a bookmark
          formattedBookmarks.push(formatBookmarkForServer(node, currentPath));
        } else if (node.children) {
          // It's a folder
          const folderPath = node.title ? `${currentPath} / ${node.title}` : currentPath;
          flattenBookmarks(node.children, folderPath);
        }
      }
    }

    flattenBookmarks(bookmarks);

    console.log(`📚 Found ${formattedBookmarks.length} bookmarks to sync`);

    // Use smart upsert to avoid duplicates
    const result = await serverAPI.upsertBookmarks(formattedBookmarks);

    console.log('✅ Bookmark sync completed:', result.summary);

    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Bookmark Sync Complete!',
      message: `✅ ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`,
    });
  } catch (error) {
    console.error('❌ Bookmark sync failed:', error);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Bookmark Sync Failed',
      message: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`,
    });

    throw error;
  }
}
