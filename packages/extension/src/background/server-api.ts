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
    this.baseUrl =
      import.meta.env.VITE_OAUTH_SERVER_URL || 'https://bookmark-assistant-server.vercel.app';
    this.loadSessionToken();
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
    if (this.sessionToken && !endpoint.includes('/api/oauth/exchange')) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    // Default timeout: 30s for most operations, 0 (disabled) for critical ops
    // Critical ops (OAuth, first-time sync) should pass timeoutMs: 0
    const { timeoutMs = 30000, ...rest } = options as any;
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
        const timeoutSeconds = Math.round(timeoutMs / 1000);
        console.warn(
          `[ServerAPI] Request to ${endpoint} timed out after ${timeoutSeconds}s. ` +
            `This might be due to slow network or server processing.`
        );

        // Log timeouts to backend for monitoring (all timeouts are noteworthy)
        if (timeoutMs > 0) {
          try {
            globalThis.fetch(`${this.baseUrl}/api/client-log`, {
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
        }

        // Provide helpful error message
        throw new Error(
          `Sync request timed out after ${timeoutSeconds}s. The server might be busy processing your bookmarks. Please try again or reduce the number of bookmarks per sync.`
        );
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
    user: { userId: string; userEmail?: string; templateDatabaseId?: string | null };
  }> {
    try {
      // No timeout for OAuth - this is critical and can be slow due to Notion API calls
      const response = await this.makeRequest<any>('/api/oauth/exchange', {
        method: 'POST',
        timeoutMs: 0, // Disable timeout for critical OAuth operation
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
      if (response.userEmail) {
        toStore.user_email = response.userEmail;
      }
      if (response.templateDatabaseId) {
        toStore.oauth_template_database_id = response.templateDatabaseId;
      }
      await chrome.storage.local.set(toStore);

      return {
        sessionToken: response.sessionToken,
        user: {
          userId: response.userId,
          userEmail: response.userEmail,
          templateDatabaseId: response.templateDatabaseId,
        },
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
    partialSync?: {
      applied: boolean;
      requested: number;
      processed: number;
      skipped: number;
      message: string;
    };
  }> {
    // Set a longer timeout (180s) for bookmark sync
    // Processing 50+ bookmarks with description extraction can take time
    // If the request takes longer, it will timeout and reset sync_in_progress
    const estimatedTimeout = 180000;
    return await this.makeRequest<any>('/api/bookmarks/sync', {
      method: 'POST',
      body: JSON.stringify({ bookmarks }),
      timeoutMs: estimatedTimeout,
    });
  }

  async getUserProfile(): Promise<{ user: any; isPro: boolean }> {
    const res = await this.makeRequest<any>('/api/user/profile');
    return { user: res.profile, isPro: res.profile.isPro };
  }

  async getPricing(): Promise<{ pricing: any }> {
    const res = await this.makeRequest<any>('/api/pricing', {
      method: 'GET',
      timeoutMs: 5000,
    });
    return { pricing: res.pricing };
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

  async restorePurchase(email: string): Promise<{ success: boolean; message?: string }> {
    return await this.makeRequest<any>('/api/user/restore-purchase', {
      method: 'POST',
      body: JSON.stringify({ email }),
      timeoutMs: 10000,
    });
  }

  async getPortalLink(): Promise<{ success: boolean; url?: string; error?: string }> {
    return await this.makeRequest<any>('/api/paddle/portal-session', {
      method: 'POST',
      timeoutMs: 10000,
    });
  }

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    return await this.makeRequest<any>('/api/paddle/cancel-subscription', {
      method: 'POST',
      timeoutMs: 10000,
    });
  }

  async getSubscriptionInfo(): Promise<{
    success: boolean;
    nextBillingDate?: string;
    status?: string;
    error?: string;
  }> {
    return await this.makeRequest<any>('/api/paddle/subscription-info', {
      method: 'GET',
      timeoutMs: 10000,
    });
  }

  // 🚪 Logout
  async logout(): Promise<void> {
    try {
      await this.makeRequest('/api/user/logout', { method: 'POST', timeoutMs: 5000 });
    } catch {}
    this.sessionToken = null;

    // Selective cleanup: Only remove authentication and session data
    // Preserve: description cache, pricing cache, oauth_template_database_id (for reconnection)
    const keysToRemove = [
      'session_token',
      'user_id',
      'user_email',
      'is_pro',
      'purchase_type',
      'entitlements_cached_at', // Clear entitlements cache on logout
      'last_sync',
      'last_sync_at',
      'last_sync_summary',
      'last_sync_count',
      'last_sync_fingerprint',
      'last_sync_hash',
      'sync_in_progress',
      'is_connecting',
      'auto_sync_enabled',
      'auto_sync_interval_minutes',
      'sync_interval_hours',
      'last_bulk_sync',
      'last_sync_results',
    ];

    await chrome.storage.local.remove(keysToRemove);

    // Note: We intentionally preserve:
    // - oauth_template_database_id (needed for server-side database recovery after reconnection)
    // - description_cache_* keys (user's cached descriptions - expensive to rebuild)
    // - cached_pricing (avoids unnecessary refetch)
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
  // Use stable syncId based on Chrome bookmark ID
  // This ensures the same bookmark gets the same syncId across multiple syncs
  // which is critical for duplicate detection on the server side
  const syncId = bookmark.id; // Chrome bookmark ID is stable across sessions

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

// REMOVED: syncAllBookmarksViaServer - this function was unused and contained
// chrome.notifications API calls that required the 'notifications' permission.
// Bookmark syncing is now handled by performBookmarkSync in background/index.ts
