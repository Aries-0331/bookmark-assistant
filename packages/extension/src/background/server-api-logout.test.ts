import { describe, it, expect, beforeEach, vi } from 'vitest';
import { serverAPI } from './server-api';

describe('ServerAPI - Logout Selective Cleanup', () => {
  let mockChromeStorage: Record<string, any>;

  beforeEach(() => {
    // Mock initial storage state with various keys
    mockChromeStorage = {
      session_token: 'test-token',
      user_id: 'user-123',
      user_email: 'test@example.com',
      is_pro: true,
      purchase_type: 'monthly',
      last_sync: '2025-12-27T10:00:00Z',
      last_sync_summary: 'success',
      oauth_template_database_id: 'template-abc-123', // Should be preserved
      description_cache_url1: { description: 'Test 1', timestamp: Date.now() }, // Should be preserved
      cached_pricing: { monthly: 2.5, lifetime: 30.0 }, // Should be preserved
      auto_sync_enabled: true,
      sync_in_progress: false,
    };

    // Mock chrome.storage.local
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockImplementation((keys) => {
            if (Array.isArray(keys)) {
              const result: Record<string, any> = {};
              keys.forEach((key) => {
                if (key in mockChromeStorage) {
                  result[key] = mockChromeStorage[key];
                }
              });
              return Promise.resolve(result);
            }
            return Promise.resolve(mockChromeStorage);
          }),
          set: vi.fn().mockImplementation((items) => {
            Object.assign(mockChromeStorage, items);
            return Promise.resolve();
          }),
          remove: vi.fn().mockImplementation((keys) => {
            const keysArray = Array.isArray(keys) ? keys : [keys];
            keysArray.forEach((key) => {
              delete mockChromeStorage[key];
            });
            return Promise.resolve();
          }),
          clear: vi.fn().mockImplementation(() => {
            mockChromeStorage = {};
            return Promise.resolve();
          }),
        },
      },
    } as any;

    // Mock fetch for logout API call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);
  });

  it('should remove oauth_template_database_id on logout', async () => {
    await serverAPI.logout();

    // Should be removed
    expect(mockChromeStorage.session_token).toBeUndefined();
    expect(mockChromeStorage.user_id).toBeUndefined();
    expect(mockChromeStorage.user_email).toBeUndefined();
    expect(mockChromeStorage.is_pro).toBeUndefined();
    expect(mockChromeStorage.purchase_type).toBeUndefined();
    expect(mockChromeStorage.last_sync).toBeUndefined();
    expect(mockChromeStorage.auto_sync_enabled).toBeUndefined();
    expect(mockChromeStorage.oauth_template_database_id).toBeUndefined(); // Now removed

    // Should be preserved
    expect(mockChromeStorage.description_cache_url1).toBeDefined();
    expect(mockChromeStorage.cached_pricing).toEqual({ monthly: 2.5, lifetime: 30.0 });
  });

  it('should remove all authentication-related keys', async () => {
    await serverAPI.logout();

    const authKeys = [
      'session_token',
      'user_id',
      'user_email',
      'is_pro',
      'purchase_type',
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
    ];

    authKeys.forEach((key) => {
      expect(mockChromeStorage[key]).toBeUndefined();
    });
  });

  it('should preserve description cache keys', async () => {
    // Add multiple description cache entries
    mockChromeStorage['description_cache_url1'] = { description: 'Test 1', timestamp: Date.now() };
    mockChromeStorage['description_cache_url2'] = { description: 'Test 2', timestamp: Date.now() };
    mockChromeStorage['description_cache_storage'] = {
      /* cached data */
    };

    await serverAPI.logout();

    // All description cache should be preserved
    expect(mockChromeStorage['description_cache_url1']).toBeDefined();
    expect(mockChromeStorage['description_cache_url2']).toBeDefined();
    expect(mockChromeStorage['description_cache_storage']).toBeDefined();
  });

  it('should clear sessionToken in memory', async () => {
    // Set sessionToken
    (serverAPI as any).sessionToken = 'test-token';

    await serverAPI.logout();

    expect((serverAPI as any).sessionToken).toBeNull();
  });

  it('should handle logout API call failure gracefully', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Should not throw
    await expect(serverAPI.logout()).resolves.not.toThrow();

    // Should still clear local storage
    expect(mockChromeStorage.session_token).toBeUndefined();
    expect(mockChromeStorage.oauth_template_database_id).toBeUndefined(); // Now removed
  });
});
