// Server API Client for Bookmark Notion Sync Extension
// Handles all communication with the backend server
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

  // todo - find a better way to make request
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Extension-ID': chrome.runtime.id,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (this.sessionToken && !endpoint.includes('/oauth/exchange')) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const timeoutMs = 8000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await globalThis.fetch(url, {
        cache: 'no-store',
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = (isJson ? await response.json() : { message: await response.text() }) as any;
      if (!response.ok) {
        const message = data?.message || data?.error || `Server error: ${response.status}`;
        throw new Error(message);
      }
      return data as T;
    } catch (error: any) {
      clearTimeout(timeout);
      if (error?.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      if (error instanceof TypeError) {
        this.hintConnectivity();
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
    try {
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
      throw error;
    }
  }

  async syncBookmarks(bookmarks: BookmarkData[]): Promise<{
    summary: {
      total: number;
      success: number;
      failed: number;
    };
    results: any[];
  }> {
    return await this.makeRequest<any>('/bookmarks/sync', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
    });
  }

  async getUserProfile(): Promise<{ user: any }> {
    const res = await this.makeRequest<any>('/user/profile');
    return { user: res.profile };
  }

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

export async function syncAllBookmarksViaServer(
  bookmarks: chrome.bookmarks.BookmarkTreeNode[]
): Promise<void> {
  try {
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

    const result = await serverAPI.syncBookmarks(formattedBookmarks);
    console.log('✅ Bookmark sync completed:', result.summary);

    // Show success notification with fields server returns
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Bookmark Sync Complete!',
      message: `✅ ${result.summary.success} succeeded, ${result.summary.failed} failed`,
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
