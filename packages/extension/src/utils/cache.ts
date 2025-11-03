// Canonical chrome.storage.local schema used by the extension
export interface ChromeLocalCache {
  // Auth/session
  session_token?: string;
  user_id?: string;

  // Sync state
  sync_in_progress?: boolean;
  last_sync_at?: string; // ISO timestamp
  last_sync_count?: number;
  last_sync_fingerprint?: string;
}

// Optional: key literals for safer usage
export const CACHE_KEYS = {
  session_token: 'session_token',
  user_id: 'user_id',

  sync_in_progress: 'sync_in_progress',
  last_sync_at: 'last_sync_at',
  last_sync_count: 'last_sync_count',
  last_sync_fingerprint: 'last_sync_fingerprint',
} as const;

export const WATCHED_CACHE_KEYS = [
  CACHE_KEYS.session_token,
  CACHE_KEYS.sync_in_progress,
  CACHE_KEYS.last_sync_at,
  CACHE_KEYS.last_sync_count,
  CACHE_KEYS.last_sync_fingerprint,
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
