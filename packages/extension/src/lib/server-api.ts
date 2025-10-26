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
  }

  async getEntitlements(): Promise<{ plan: 'free' | 'pro'; features: string[] }> {
    const res = await this.makeRequest<any>('/entitlements', { method: 'GET', timeoutMs: 5000 });
    return { plan: res.plan, features: res.features || [] };
  }

  private async loadSessionToken() {
    const result = await chrome.storage.local.get(['session_token']);
    this.sessionToken = result.session_token || null;
  }

  // todo - find a better way to make request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    // Always reload token before requests to pick up changes after OAuth
    await this.loadSessionToken();
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Extension-ID': chrome.runtime.id,
      ...((options.headers as Record<string, string>) || {}),
    };
    if (this.sessionToken && !endpoint.includes('/oauth/exchange')) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    const { timeoutMs = 8000, ...rest } = options as any;
    const controller = new AbortController();
    const useTimeout = typeof timeoutMs === 'number' && timeoutMs > 0;
    const timeout = useTimeout ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await globalThis.fetch(url, {
        cache: 'no-store',
        ...rest,
        headers,
        signal: useTimeout ? controller.signal : undefined,
      });
      if (timeout) clearTimeout(timeout);

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = (isJson ? await response.json() : { message: await response.text() }) as any;
      if (!response.ok) {
        const message = data?.message || data?.error || `Server error: ${response.status}`;
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
        const err = new APIError(message, response.status, retryAfterSeconds);
        // Attach server-provided code if any
        if (data?.code) (err as any).code = data.code;
        throw err;
      }
      return data as T;
    } catch (error: any) {
      if (timeout) clearTimeout(timeout);
      if (error?.name === 'AbortError') {
        // Log timeout to console
        console.warn(`[ServerAPI] Request to ${endpoint} timed out after ${timeoutMs}ms`);
        // Fire-and-forget backend client-log for observability
        try {
          globalThis.fetch(`${this.baseUrl}/client-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Extension-ID': chrome.runtime.id },
            body: JSON.stringify({
              level: 'warn',
              message: 'REQUEST_TIMEOUT',
              meta: { endpoint, timeoutMs },
            }),
            cache: 'no-store',
          });
        } catch {}
        // Return a shaped timeout signal to caller; popup suppresses this
        throw new Error('REQUEST_TIMEOUT');
      }
      throw error;
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
    // Disable client-side timeout for bulk sync to avoid spurious UI errors
    const estimatedTimeout = 0;
    return await this.makeRequest<any>('/bookmarks/sync', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
      timeoutMs: estimatedTimeout,
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
    try {
      await this.makeRequest('/user/logout', { method: 'POST', timeoutMs: 5000 });
    } catch {}
    this.sessionToken = null;
    await chrome.storage.local.remove([
      // auth/session
      'session_token',
      'user_id',
      // notion cached data
      'notion_user',
      'notion_database_id',
      'database_name',
      'oauth_template_database_id',
      // sync state
      'sync_in_progress',
      'last_sync',
      'last_sync_results',
      'last_sync_summary',
      'last_sync_error',
    ]);
  }
}

// Export singleton instance
export const serverAPI = new ServerAPIClient();

// Structured error carrying HTTP status and retry hints
export class APIError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.retryAfterSeconds = Number.isFinite(retryAfterSeconds || NaN)
      ? (retryAfterSeconds as number)
      : undefined;
  }
}

// Helper function to convert Chrome bookmarks to server format
export function formatBookmarkForServer(
  bookmark: chrome.bookmarks.BookmarkTreeNode,
  path: string
): BookmarkData {
  // Prefer server to assign syncId, but if provided here, use a UUID to ensure uniqueness
  const syncId =
    globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? (globalThis.crypto as any).randomUUID()
      : `${bookmark.id}-${Date.now()}`;
  return {
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    description: `Imported from Chrome bookmarks`,
    path: path,
    dateAdded: bookmark.dateAdded
      ? new Date(bookmark.dateAdded).toISOString()
      : new Date().toISOString(),
    syncId,
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

    // Delegate batching to server; send all bookmarks in one request
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
