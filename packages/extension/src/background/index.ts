// Apply service-worker polyfills first so modules that expect a window-like
// environment don't throw during import/evaluation in the MV3 service worker.
import './polyfill';

import { launchNotionOAuth, exchangeCodeForToken, debugOAuthSetup } from './oauth';
import { validateConfig, debugConfig } from '../lib/config';
import { serverAPI } from '../lib/server-api';
import { api } from '../api';

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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'NOTION_OAUTH') {
    (async () => {
      try {
        const code = await launchNotionOAuth();
        await exchangeCodeForToken(code);

        sendResponse({ ok: true });
      } catch (err) {
        console.error(err);
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (msg.type === 'SYNC_ALL_BOOKMARKS') {
    (async () => {
      const setState = async (patch: Record<string, any>) => {
        try {
          await chrome.storage.local.set(patch);
        } catch (e) {
          console.warn('⚠️ Failed to update sync state:', patch, e);
        }
      };
      try {
        // Prevent concurrent syncs
        const { sync_in_progress } = await chrome.storage.local.get(['sync_in_progress']);
        if (sync_in_progress) {
          console.warn('⚠️ Sync request ignored: a sync is already in progress');
          sendResponse({ success: false, error: 'Sync already in progress' });
          return;
        }
        const bookmarkTree = await chrome.bookmarks.getTree();
        const flat = bookmarkTree[0]?.children || [];

        // Mark sync as in progress so UI can render ongoing state
        await setState({ sync_in_progress: true, last_sync_error: null });

        // Await the full sync using edition-aware adapter (Pro delegates to server)
        // Flatten to BookmarkPayload via the existing helper path used in server-api
        // For list-of-folders structure from getTree()[0].children, the adapter will format internally.
        const formatted: any[] = [];
        const flatten = (nodes: any[], currentPath = 'Bookmarks') => {
          for (const node of nodes) {
            if (node.url) {
              formatted.push({
                title: node.title || 'Untitled',
                url: node.url || '',
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
            } else if (node.children) {
              const nextPath = node.title ? `${currentPath} / ${node.title}` : currentPath;
              flatten(node.children, nextPath);
            }
          }
        };
        flatten(flat as any);

        await api.syncBookmarks(formatted);

        await setState({
          last_sync: new Date().toISOString(),
          last_sync_summary: null,
          last_sync_error: null,
        });

        sendResponse({ success: true, message: 'Bookmarks sync completed' });
      } catch (err) {
        console.error('❌ Server-side bookmark sync failed:', err);
        await setState({ last_sync_error: err instanceof Error ? err.message : String(err) });
        sendResponse({ success: false, error: String(err) });
      } finally {
        // Always ensure the flag is reset even if unexpected errors occur
        await setState({ sync_in_progress: false });
      }
    })();
    return true;
  }

  if (msg.type === 'GET_USER_PROFILE') {
    (async () => {
      try {
        const profile = await serverAPI.getUserProfile();
        sendResponse({ success: true, profile: profile.user });
      } catch (err) {
        console.error('❌ Failed to get user profile:', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true;
  }

  if (msg.type === 'LOGOUT') {
    (async () => {
      try {
        await serverAPI.logout();
        sendResponse({ success: true });
      } catch (err) {
        console.error('❌ Logout failed:', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true;
  }
});

// Open the options page when the user clicks the extension icon
try {
  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });
} catch (e) {
  // Some environments may not support action.onClicked in mocks; ignore
}
