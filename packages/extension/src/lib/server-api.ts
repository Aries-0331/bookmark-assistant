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
    console.log('🌐 ServerAPI baseUrl:', this.baseUrl);
  }

  private async loadSessionToken() {
    const result = await chrome.storage.local.get(['session_token']);
    this.sessionToken = result.session_token || null;
    console.log('session token:', this.sessionToken);
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

    const timeoutMs = 8000;
    const controller = new AbortController();
    const started = Date.now();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log('🔬 About to call globalThis.fetch... (timeout', timeoutMs, 'ms)');
      const response = await globalThis.fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeout);
      console.log(
        `🔬 Fetch completed, status: ${response.status} (elapsed ${Date.now() - started}ms)`
      );

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
    } catch (error: any) {
      clearTimeout(timeout);
      const elapsed = Date.now() - started;
      if (error?.name === 'AbortError') {
        console.error(`⏱️ Request timeout after ${timeoutMs}ms: ${url}`);
        throw new Error(`Request timed out after ${timeoutMs}ms (server unreachable?)`);
      }
      if (error instanceof TypeError) {
        console.error(
          `🌐 Network failure for ${url} (elapsed ${elapsed}ms). Potential causes: server down, CORS, invalid baseUrl, mixed content.`
        );
        this.hintConnectivity();
      } else {
        console.error(`API request failed: ${endpoint}`, error);
      }
      throw error;
    }
  }

  private async hintConnectivity() {
    try {
      const healthUrl = `${this.baseUrl}/health`;
      const started = Date.now();
      const r = await globalThis.fetch(healthUrl, { method: 'GET', cache: 'no-store' });
      console.log(
        `🩺 Health probe ${r.ok ? 'OK' : 'FAIL'} status=${r.status} (${Date.now() - started}ms)`
      );
    } catch (e) {
      console.warn(
        '🩺 Health probe failed (cannot reach server):',
        e instanceof Error ? e.message : e
      );
    }
  }

  // 🔐 OAuth Token Exchange (Server-first, secure)
  async exchangeOAuthCode(
    code: string,
    redirectUri: string
  ): Promise<{
    sessionToken: string;
    user: { userId: string; templateDatabaseId?: string | null };
  }> {
    console.log('🔐 Exchanging OAuth code via server...');
    try {
      // Preflight quick health check (non-blocking if fails)
      try {
        const preflight = await globalThis.fetch(`${this.baseUrl}/health`, {
          method: 'GET',
          cache: 'no-store',
        });
        console.log('🛰️ Preflight health status:', preflight.status);
      } catch (pfErr) {
        console.warn(
          '🛰️ Preflight health failed (continuing):',
          pfErr instanceof Error ? pfErr.message : pfErr
        );
      }
      const response = await this.makeRequest<any>('/oauth/exchange', {
        method: 'POST',
        body: JSON.stringify({
          code,
          redirectUri,
          extensionUserId: chrome.runtime.id,
        }),
      });

      if (!response.sessionToken) {
        throw new Error('Server did not return a session token');
      }

      this.sessionToken = response.sessionToken;
      const toStore: Record<string, any> = {
        session_token: response.sessionToken,
        user_id: response.userId,
      };
      if (response.templateDatabaseId) {
        toStore.oauth_template_database_id = response.templateDatabaseId;
      }
      await chrome.storage.local.set(toStore);

      return {
        sessionToken: response.sessionToken,
        user: { userId: response.userId, templateDatabaseId: response.templateDatabaseId },
      };
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('� OAuth exchange (server) failed:', msg);
      if (msg.includes('Failed to fetch')) {
        console.error(
          '🔧 Hint: Is the server running & accessible at',
          this.baseUrl,
          '? Check CORS / network / HTTPS mismatch.'
        );
      }
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
    dataSourceId?: string,
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
        // 2025-09-03: prefer dataSourceId; keep databaseId for back-compat resolution on server
        dataSourceId,
        databaseId,
      }),
    });
  }

  // 🔄 Smart Upsert Bookmarks
  async upsertBookmarks(
    bookmarks: BookmarkData[],
    dataSourceId?: string,
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
        dataSourceId,
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
