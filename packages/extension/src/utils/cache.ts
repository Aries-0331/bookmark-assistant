// Canonical chrome.storage.local schema used by the extension
export interface ChromeLocalCache {
  // Auth/session
  session_token?: string;
  user_id?: string;
  user_email?: string;

  // Connection state
  is_connecting?: boolean;

  // Sync state
  sync_in_progress?: boolean;
  last_sync?: string; // ISO timestamp (legacy key name)
  last_sync_at?: string; // ISO timestamp
  last_sync_count?: number;
  last_sync_fingerprint?: string;
  last_sync_hash?: string;

  // Entitlements
  is_pro?: boolean;
  purchase_type?: 'monthly' | 'lifetime';

  // Settings
  auto_sync?: boolean; // Legacy UI state (deprecated, use auto_sync_enabled)
  auto_sync_enabled?: boolean; // Primary auto-sync state
  auto_sync_interval_minutes?: number; // Primary interval (in minutes)
  sync_interval_hours?: number; // UI-friendly interval cache (optional)

  // Pricing cache
  cached_pricing?: {
    monthly: number;
    lifetime: number;
  };
}

// Optional: key literals for safer usage
export const CACHE_KEYS = {
  session_token: 'session_token',
  user_id: 'user_id',
  user_email: 'user_email',

  is_connecting: 'is_connecting',

  sync_in_progress: 'sync_in_progress',
  last_sync: 'last_sync',
  last_sync_at: 'last_sync_at',
  last_sync_count: 'last_sync_count',
  last_sync_fingerprint: 'last_sync_fingerprint',
  last_sync_hash: 'last_sync_hash',

  is_pro: 'is_pro',
  purchase_type: 'purchase_type',

  auto_sync: 'auto_sync',
  auto_sync_enabled: 'auto_sync_enabled',
  auto_sync_interval_minutes: 'auto_sync_interval_minutes',
  sync_interval_hours: 'sync_interval_hours',

  cached_pricing: 'cached_pricing',
} as const;

export const WATCHED_CACHE_KEYS = [
  CACHE_KEYS.session_token,
  CACHE_KEYS.is_connecting,
  CACHE_KEYS.sync_in_progress,
  CACHE_KEYS.last_sync,
  CACHE_KEYS.last_sync_at,
  CACHE_KEYS.last_sync_count,
  CACHE_KEYS.last_sync_fingerprint,
  CACHE_KEYS.last_sync_hash,
  CACHE_KEYS.is_pro,
  CACHE_KEYS.purchase_type,
  CACHE_KEYS.user_id,
  CACHE_KEYS.user_email,
  CACHE_KEYS.cached_pricing,
  CACHE_KEYS.auto_sync_enabled,
  CACHE_KEYS.auto_sync_interval_minutes,
] as const;

export type CacheKey = keyof typeof CACHE_KEYS;

// Tiny typed helpers around chrome.storage.local
export async function getCache<K extends keyof ChromeLocalCache>(
  keys: K | K[]
): Promise<Pick<ChromeLocalCache, K>> {
  const arr = Array.isArray(keys) ? (keys as string[]) : ([keys] as string[]);
  const res = await chrome.storage.local.get(arr);
  return res as Pick<ChromeLocalCache, K>;
}

export async function setCache(patch: Partial<ChromeLocalCache>): Promise<void> {
  await chrome.storage.local.set(patch as Record<string, unknown>);
}

export async function removeCache(keys: CacheKey | CacheKey[]): Promise<void> {
  const arr = Array.isArray(keys) ? (keys as string[]) : ([keys] as string[]);
  await chrome.storage.local.remove(arr);
}
