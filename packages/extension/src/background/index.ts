import './polyfill';
import { launchNotionOAuth, exchangeCodeForToken, debugOAuthSetup } from './oauth';
import { validateConfig, debugConfig } from './config';
import { serverAPI, APIError } from './server-api';
import { addMessageListener, Messages } from '../utils/message';
import { scheduleAutoSync, setupAutoSyncListener, restoreAutoSync } from './auto-sync';
import { normalizeUrl } from '../utils/url-normalizer';
import { reportError } from '../utils/error-reporter';
import { cleanupStorage } from '../utils/storage-cleanup';

// Cache for page descriptions (url -> { description: string, timestamp: number })
const pageDescriptionCache = new Map<string, { description: string; timestamp: number }>();
const DESCRIPTION_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DESCRIPTION_CACHE_STORAGE_KEY = 'page_description_cache';
const MAX_CACHE_SIZE = 1000; // Maximum number of cache entries before LRU eviction

// Evict least recently used entries when cache exceeds max size
function evictLRUEntries() {
  if (pageDescriptionCache.size <= MAX_CACHE_SIZE) {
    return;
  }

  // Convert to array and sort by timestamp (oldest first)
  const entries = Array.from(pageDescriptionCache.entries())
    .map(([url, data]) => ({ url, ...data }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Remove oldest entries until we're under the limit
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  let removedCount = 0;
  for (const entry of toRemove) {
    pageDescriptionCache.delete(entry.url);
    removedCount++;
  }

  if (removedCount > 0) {
    console.log(
      `[DescriptionExtractor] Evicted ${removedCount} LRU entries (cache size: ${pageDescriptionCache.size}/${MAX_CACHE_SIZE})`
    );
  }
}

// Listen for page descriptions from content scripts
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === 'PAGE_DESCRIPTION') {
    const { url, description } = message.payload;
    const normalizedUrl = normalizeUrl(url);
    console.log(
      `[DescriptionExtractor] Received description for ${url} (normalized: ${normalizedUrl}): "${description}"`
    );

    // Update timestamp for LRU tracking
    pageDescriptionCache.set(normalizedUrl, {
      description,
      timestamp: Date.now(),
    });

    // Evict LRU entries if cache is too large
    evictLRUEntries();

    // Persist to storage
    persistDescriptionCache().catch((error) => {
      console.warn('[DescriptionExtractor] Failed to persist cache:', error);
    });
  }
});

// Persist cache to chrome.storage.local for persistence across service worker restarts
async function persistDescriptionCache() {
  try {
    const cacheObject: Record<string, { description: string; timestamp: number }> = {};
    pageDescriptionCache.forEach((value, key) => {
      cacheObject[key] = value;
    });
    await chrome.storage.local.set({ [DESCRIPTION_CACHE_STORAGE_KEY]: cacheObject });
    console.log(
      `[DescriptionExtractor] Persisted ${Object.keys(cacheObject).length} descriptions to storage`
    );
  } catch (error) {
    console.error('[DescriptionExtractor] Failed to persist cache to storage:', error);
  }
}

// Load cache from chrome.storage.local
async function loadDescriptionCacheFromStorage() {
  try {
    const result = await chrome.storage.local.get([DESCRIPTION_CACHE_STORAGE_KEY]);
    const cacheData = result[DESCRIPTION_CACHE_STORAGE_KEY];
    if (cacheData && typeof cacheData === 'object') {
      const now = Date.now();
      let loadedCount = 0;
      let expiredCount = 0;
      let normalizedCount = 0;

      for (const [url, data] of Object.entries(cacheData)) {
        if (
          data &&
          typeof data === 'object' &&
          'description' in data &&
          'timestamp' in data &&
          typeof (data as any).description === 'string' &&
          typeof (data as any).timestamp === 'number'
        ) {
          // Normalize URL when loading (handles migration of old cache entries)
          const normalizedUrl = normalizeUrl(url);
          const wasNormalized = normalizedUrl !== url;

          if (now - (data as any).timestamp <= DESCRIPTION_CACHE_TTL_MS) {
            // Use normalized URL as key
            pageDescriptionCache.set(normalizedUrl, {
              description: (data as any).description,
              timestamp: (data as any).timestamp,
            });
            loadedCount++;
            if (wasNormalized) {
              normalizedCount++;
            }
          } else {
            expiredCount++;
          }
        }
      }

      // Evict LRU entries if we loaded too many
      evictLRUEntries();

      console.log(
        `[DescriptionExtractor] Loaded ${loadedCount} descriptions from storage (${expiredCount} expired, ${normalizedCount} normalized)`
      );
    }
  } catch (error) {
    console.error('[DescriptionExtractor] Failed to load cache from storage:', error);
  }
}

// Clean up expired cache entries periodically
setInterval(
  async () => {
    const now = Date.now();
    let deletedCount = 0;
    for (const [url, data] of pageDescriptionCache.entries()) {
      if (now - data.timestamp > DESCRIPTION_CACHE_TTL_MS) {
        pageDescriptionCache.delete(url);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[DescriptionExtractor] Cleaned up ${deletedCount} expired descriptions`);
      await persistDescriptionCache();
    }
  },
  60 * 60 * 1000
); // Check every hour

function getCachedDescription(url: string): string {
  // Normalize URL before lookup to ensure cache hits
  const normalizedUrl = normalizeUrl(url);
  const cached = pageDescriptionCache.get(normalizedUrl);

  if (!cached) {
    console.debug(
      `[DescriptionExtractor] No cache entry for: ${url} (normalized: ${normalizedUrl})`
    );
    return '';
  }

  // Check if expired
  if (Date.now() - cached.timestamp > DESCRIPTION_CACHE_TTL_MS) {
    console.debug(
      `[DescriptionExtractor] Cache expired for: ${url} (normalized: ${normalizedUrl})`
    );
    pageDescriptionCache.delete(normalizedUrl);
    return '';
  }

  // Update timestamp for LRU tracking (mark as recently used)
  cached.timestamp = Date.now();

  console.debug(
    `[DescriptionExtractor] Cache hit for ${url} (normalized: ${normalizedUrl}): "${cached.description}"`
  );
  return cached.description;
}

// Load cache on service worker startup
loadDescriptionCacheFromStorage();

// import './test-oauth-flow'; // Removed in production build

// Reset stale sync state on service worker startup
// In MV3, service workers can be terminated during long operations
async function resetStaleSyncState() {
  try {
    const { sync_in_progress, last_sync } = await chrome.storage.local.get([
      'sync_in_progress',
      'last_sync',
    ]);

    // If sync is marked as in progress but last_sync is very old (> 10 minutes),
    // it's likely a stale state from a terminated service worker
    if (sync_in_progress && last_sync) {
      const lastSyncTime = new Date(last_sync).getTime();
      const now = Date.now();
      const tenMinutesMs = 10 * 60 * 1000;

      if (now - lastSyncTime > tenMinutesMs) {
        console.warn('[Background] Resetting stale sync_in_progress state');
        await chrome.storage.local.set({ sync_in_progress: false });
      }
    }
  } catch (error) {
    console.warn('[Background] Failed to reset stale sync state:', error);
  }
}

debugConfig();
debugOAuthSetup();

// Reset any stale sync state from previous terminated service worker
resetStaleSyncState().then(async () => {
  // Clean up storage (remove redundant fields, fix NaN issues, etc.)
  await cleanupStorage();

  const configValidation = validateConfig();
  if (!configValidation.isValid) {
    console.error('❌ Configuration errors:', configValidation.errors);
  }
  if (configValidation.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:', configValidation.warnings);
  }
});

// Extract sync logic into a reusable function
async function performBookmarkSync(): Promise<{
  success: boolean;
  error?: string;
  noChanges?: boolean;
}> {
  const setState = async (patch: Record<string, any>) => {
    try {
      await chrome.storage.local.set(patch);
    } catch (e) {
      console.warn('Failed to update sync state:', patch, e);
    }
  };

  // Declare variables outside try block so they're accessible in catch
  let formatted: any[] = [];
  let currentHash: string | undefined;

  try {
    const startedAt = Date.now();
    const MIN_PROGRESS_MS = 1200; // keep UI spinner visible to avoid flicker / rapid re-clicks
    const bookmarkTree = await chrome.bookmarks.getTree();
    const flat = bookmarkTree[0]?.children || [];

    await setState({ sync_in_progress: true, last_sync_error: null });

    formatted = []; // Use existing declaration
    const minimalForHash: Array<{ url: string; title: string; path: string }> = [];
    const flatten = (nodes: any[], currentPath = 'Bookmarks') => {
      for (const node of nodes) {
        if (node.url) {
          const title = node.title || 'Untitled';
          const url = node.url || '';
          const normalizedUrl = normalizeUrl(url);
          const description = getCachedDescription(url);
          console.log(
            `[Sync] Processing bookmark: "${title}" -> ${url} (normalized: ${normalizedUrl})`
          );
          console.log(
            `[Sync] Description for ${url}: "${description}" (${description ? 'found' : 'not found'})`
          );
          formatted.push({
            title,
            url,
            description,
            path: currentPath,
            dateAdded: node.dateAdded
              ? new Date(node.dateAdded).toISOString()
              : new Date().toISOString(),
            syncId:
              globalThis.crypto && 'randomUUID' in globalThis.crypto
                ? (globalThis.crypto as any).randomUUID()
                : `${node.id}-${Date.now()}`,
          });
          minimalForHash.push({ url, title, path: currentPath });
        } else if (node.children) {
          const nextPath = node.title ? `${currentPath} / ${node.title}` : currentPath;
          flatten(node.children, nextPath);
        }
      }
    };
    console.log('[Sync] Starting to flatten bookmarks...');
    flatten(flat as any);
    console.log(`[Sync] Flattened ${formatted.length} bookmarks`);
    console.log(`[Sync] Cache size: ${pageDescriptionCache.size} URLs with descriptions`);

    // Compute a stable fingerprint of current bookmarks to avoid redundant syncs
    const computeFingerprint = async () => {
      const sorted = minimalForHash
        .map((i) => `${i.path}|${i.url}|${i.title}`)
        .sort()
        .join('\n');
      try {
        // Prefer Web Crypto for a stable hash
        if (globalThis.crypto?.subtle) {
          const enc = new TextEncoder();
          const digest = await globalThis.crypto.subtle.digest('SHA-256', enc.encode(sorted));
          const arr = Array.from(new Uint8Array(digest));
          return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
      } catch {}
      // Fallback: simple non-crypto hash
      let h = 2166136261;
      for (let i = 0; i < sorted.length; i++) {
        h ^= sorted.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      return (h >>> 0).toString(16);
    };

    const fp = await computeFingerprint();
    const {
      last_sync_fingerprint: prevFp,
      last_sync_count: prevCount,
    } = await chrome.storage.local.get([
      'last_sync_fingerprint',
      'last_sync_count',
    ]);
    const currentCount = formatted.length;
    currentHash = fp; // Use existing declaration
    const previousHash = prevFp;

    // Hash comparison: compare total count and hash
    // This prevents unnecessary sync when bookmarks haven't changed
    const hasNoChanges =
      typeof prevCount === 'number' &&
      typeof previousHash === 'string' &&
      prevCount === currentCount &&
      previousHash === currentHash;

    if (hasNoChanges) {
      // No changes — keep last successful sync timestamp; just notify summary
      await setState({
        last_sync: new Date().toISOString(), // Update timestamp even for no changes
        last_sync_summary: 'no_changes',
        last_sync_count: currentCount,
      });
      // Ensure minimal progress duration
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PROGRESS_MS) {
        await new Promise((r) => setTimeout(r, MIN_PROGRESS_MS - elapsed));
      }
      await setState({ sync_in_progress: false });
      return { success: true, noChanges: true } as const;
    }

    // Log sample of bookmarks to be synced (first 5)
    console.log(`[Sync] Preparing to sync ${formatted.length} bookmarks to server`);
    console.log(`[Sync] Sample bookmarks:`);
    formatted.slice(0, 5).forEach((bm, i) => {
      console.log(`[Sync]   ${i + 1}. ${bm.title} -> ${bm.url}`);
      console.log(
        `[Sync]      Description: "${bm.description}" (${bm.description ? 'has text' : 'empty'})`
      );
    });
    if (formatted.length > 5) {
      console.log(`[Sync]   ... and ${formatted.length - 5} more`);
    }

    console.log('[Sync] Sending bookmarks to server...');
    await serverAPI.syncBookmarks(formatted);
    console.log('[Sync] Server sync completed successfully');

    await setState({
      last_sync: new Date().toISOString(),
      last_sync_summary: null,
      last_sync_count: currentCount,
      last_sync_fingerprint: fp,
    });

    // Ensure minimal progress duration before clearing flag
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_PROGRESS_MS) {
      await new Promise((r) => setTimeout(r, MIN_PROGRESS_MS - elapsed));
    }
    await setState({ sync_in_progress: false });
    return { success: true } as const;
  } catch (err) {
    console.error('❌ Server-side bookmark sync failed:', err);

    // Report error to server for monitoring
    const error = err instanceof Error ? err : new Error(String(err));
    await reportError(error, {
      operation: 'sync',
      bookmarkCount: formatted?.length || 0,
      syncHash: currentHash,
    });

    const summary: Record<string, any> = {};
    if (err instanceof APIError) {
      if (err.status === 429) {
        const ra = Number.isFinite(err.retryAfterSeconds) ? (err.retryAfterSeconds as number) : 0;
        // Heuristic: long retry-after (>= 1h) implies daily limit; short is cooldown
        summary.last_sync_summary = ra >= 3600 ? 'limit' : 'cooldown';
        if (ra > 0) {
          summary.sync_cooldown_until = Date.now() + ra * 1000;
        }
      } else if (err.status === 409) {
        summary.last_sync_summary = 'in_progress';
      } else if (err.status === 403) {
        summary.last_sync_summary = 'limit';
      }
    }
    await setState({
      last_sync_error: err instanceof Error ? err.message : String(err),
      ...summary,
    });
    try {
      await new Promise((r) => setTimeout(r, 600));
    } catch {}
    await setState({ sync_in_progress: false });
    return { success: false, error: String(err) } as const;
  }
}

// Setup auto-sync alarm listener
setupAutoSyncListener(async () => {
  await performBookmarkSync();
});

// Restore auto-sync alarm on service worker startup
restoreAutoSync(performBookmarkSync);

addMessageListener({
  [Messages.NOTION_OAUTH]: async () => {
    try {
      // Set connecting state at the start
      await chrome.storage.local.set({ is_connecting: true });
      const code = await launchNotionOAuth();
      const result = await exchangeCodeForToken(code);
      // Clear connecting state after OAuth completes
      await chrome.storage.local.set({ is_connecting: false });
      return result;
    } catch (error) {
      // Clear connecting state on error
      await chrome.storage.local.set({ is_connecting: false });

      // Report OAuth errors to server
      const err = error instanceof Error ? error : new Error(String(error));
      await reportError(err, {
        operation: 'oauth',
        stage: 'exchange_token',
      });

      throw error;
    }
  },
  [Messages.SYNC_ALL_BOOKMARKS]: async () => {
    return await performBookmarkSync();
  },
  [Messages.GET_USER_PROFILE]: async () => {
    try {
      const { user, isPro } = await serverAPI.getUserProfile();
      return { success: true, profile: user, isPro } as const;
    } catch (err) {
      console.error('❌ Failed to get user profile:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.GET_PRICING]: async () => {
    try {
      const { pricing } = await serverAPI.getPricing();
      return { success: true, pricing } as const;
    } catch (err) {
      console.error('❌ Failed to get pricing:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.GET_PORTAL_LINK]: async () => {
    try {
      const res = await serverAPI.getPortalLink();
      return { success: res.success, url: res.url, error: res.error } as const;
    } catch (err) {
      console.error('❌ Failed to get portal link:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.CANCEL_SUBSCRIPTION]: async () => {
    try {
      const res = await serverAPI.cancelSubscription();
      return { success: res.success, error: res.error } as const;
    } catch (err) {
      console.error('❌ Failed to cancel subscription:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.GET_SUBSCRIPTION_INFO]: async () => {
    try {
      const res = await serverAPI.getSubscriptionInfo();
      return {
        success: res.success,
        nextBillingDate: res.nextBillingDate,
        status: res.status,
        error: res.error,
      } as const;
    } catch (err) {
      console.error('❌ Failed to get subscription info:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.LOGOUT]: async () => {
    try {
      await serverAPI.logout();
      return { success: true } as const;
    } catch (err) {
      console.error('❌ Logout failed:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.RESTORE_PURCHASE]: async (req: { email: string }) => {
    try {
      const res = await serverAPI.restorePurchase(req.email);
      return { success: res.success, message: res.message } as const;
    } catch (err) {
      console.error('❌ Restore purchase failed:', err);
      return { success: false, error: String(err) } as const;
    }
  },
  [Messages.SCHEDULE_AUTO_SYNC]: async (req: { enabled: boolean; intervalHours: number }) => {
    try {
      await scheduleAutoSync(req.enabled, req.intervalHours);
      return { success: true } as const;
    } catch (err) {
      console.error('❌ Failed to schedule auto-sync:', err);
      return { success: false, error: String(err) } as const;
    }
  },
});

// Open the options page when the user clicks the extension icon
try {
  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });
} catch (e) {
  // Some environments may not support action.onClicked in mocks; ignore
}

// Global error handlers to catch unhandled errors
if (typeof self !== 'undefined') {
  self.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
    reportError(event.error || new Error(event.message), {
      type: 'unhandled',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }).catch(() => {
      // Fail silently if error reporting fails
    });
  });

  self.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reportError(error, {
      type: 'unhandled_promise',
    }).catch(() => {
      // Fail silently if error reporting fails
    });
  });
}
