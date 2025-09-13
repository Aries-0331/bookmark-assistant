// 🔐 Server-First API Client
// This module handles all server communication for the Chrome extension

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
    this.baseUrl = import.meta.env.VITE_OAUTH_SERVER_URL || 'http://localhost:3000';
    this.loadSessionToken();
  }

  private async loadSessionToken() {
    const result = await chrome.storage.local.get(['session_token']);
    this.sessionToken = result.session_token || null;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Extension-ID': chrome.runtime.id,
      ...((options.headers as Record<string, string>) || {})
    };

    // Add session token if available
    if (this.sessionToken && !endpoint.includes('/oauth/exchange')) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // 🔐 OAuth Token Exchange
  async exchangeOAuthCode(code: string, redirectUri: string): Promise<{
    sessionToken: string;
    user: any;
  }> {
    const response = await this.makeRequest<any>('/oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({
        code,
        redirectUri,
        extensionUserId: chrome.runtime.id
      })
    });

    // Store session token
    this.sessionToken = response.sessionToken;
    await chrome.storage.local.set({
      session_token: response.sessionToken,
      notion_user: response.user
    });

    return response;
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
      body: JSON.stringify({ templateId })
    });

    // Update local storage with database info
    await chrome.storage.local.set({
      notion_database_id: response.database.id,
      database_name: response.database.name
    });

    return response;
  }

  // 📚 Sync Bookmarks (High-Level)
  async syncBookmarks(bookmarks: BookmarkData[], databaseId?: string): Promise<{
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
        databaseId
      })
    });
  }

  // 🔄 Smart Upsert Bookmarks
  async upsertBookmarks(bookmarks: BookmarkData[], databaseId?: string): Promise<{
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
        databaseId
      })
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
      method: 'POST'
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
      'database_name'
    ]);
  }
}

// Export singleton instance
export const serverAPI = new ServerAPIClient();

// Helper function to convert Chrome bookmarks to server format
export function formatBookmarkForServer(bookmark: chrome.bookmarks.BookmarkTreeNode, path: string): BookmarkData {
  return {
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    description: `Imported from Chrome bookmarks`,
    path: path,
    dateAdded: bookmark.dateAdded ? new Date(bookmark.dateAdded).toISOString() : new Date().toISOString(),
    syncId: `${bookmark.url}-${bookmark.dateAdded || Date.now()}`
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
    
    function flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[], currentPath: string = 'Bookmarks') {
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
      message: `✅ ${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed`
    });
    
  } catch (error) {
    console.error('❌ Bookmark sync failed:', error);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Bookmark Sync Failed',
      message: `❌ ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    
    throw error;
  }
}
