import './polyfill';
import { launchNotionOAuth, exchangeCodeForToken, debugOAuthSetup } from './oauth';
import { validateConfig, debugConfig } from '../lib/config';
import { serverAPI, APIError } from '../lib/server-api';
import { addMessageListener, Messages } from '../shared/messaging';

// import './test-oauth-flow'; // Removed in production build

debugConfig();
debugOAuthSetup();
const configValidation = validateConfig();
if (!configValidation.isValid) {
  console.error('❌ Configuration errors:', configValidation.errors);
}
if (configValidation.warnings.length > 0) {
  console.warn('⚠️ Configuration warnings:', configValidation.warnings);
}

addMessageListener({
  [Messages.NOTION_OAUTH]: async () => {
    const code = await launchNotionOAuth();
    await exchangeCodeForToken(code);
    return { ok: true };
  },
  [Messages.SYNC_ALL_BOOKMARKS]: async () => {
    const setState = async (patch: Record<string, any>) => {
      try {
        await chrome.storage.local.set(patch);
      } catch (e) {
        console.warn('⚠️ Failed to update sync state:', patch, e);
      }
    };
    try {
      const bookmarkTree = await chrome.bookmarks.getTree();
      const flat = bookmarkTree[0]?.children || [];

      await setState({ sync_in_progress: true, last_sync_error: null });

      const formatted: any[] = [];
      const minimalForHash: Array<{ url: string; title: string; path: string }> = [];
      const flatten = (nodes: any[], currentPath = 'Bookmarks') => {
        for (const node of nodes) {
          if (node.url) {
            const title = node.title || 'Untitled';
            const url = node.url || '';
            formatted.push({
              title,
              url,
              description: 'Imported from Chrome bookmarks',
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
      flatten(flat as any);

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
      const { last_sync_fingerprint: prevFp } = await chrome.storage.local.get([
        'last_sync_fingerprint',
      ]);

      if (prevFp && prevFp === fp) {
        // No changes detected; short-circuit and update last_sync timestamps
        await setState({
          last_sync: new Date().toISOString(),
          last_sync_summary: 'no_changes',
          last_sync_error: null,
        });
        return { success: true } as const;
      }

  await serverAPI.syncBookmarks(formatted);

      await setState({
        last_sync: new Date().toISOString(),
        last_sync_summary: null,
        last_sync_error: null,
        last_sync_fingerprint: fp,
      });

      return { success: true } as const;
    } catch (err) {
      console.error('❌ Server-side bookmark sync failed:', err);
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
      return { success: false, error: String(err) } as const;
    } finally {
      await setState({ sync_in_progress: false });
    }
  },
  [Messages.GET_USER_PROFILE]: async () => {
    try {
      const profile = await serverAPI.getUserProfile();
      return { success: true, profile: profile.user } as const;
    } catch (err) {
      console.error('❌ Failed to get user profile:', err);
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
});

// Open the options page when the user clicks the extension icon
try {
  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });
} catch (e) {
  // Some environments may not support action.onClicked in mocks; ignore
}
