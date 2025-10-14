// Apply service-worker polyfills first so modules that expect a window-like
// environment don't throw during import/evaluation in the MV3 service worker.
import './polyfill';

import { launchNotionOAuth, exchangeCodeForToken, debugOAuthSetup } from './oauth';
import { validateConfig, debugConfig } from '../lib/config';
import { serverAPI, syncAllBookmarksViaServer } from '../lib/server-api';

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
      try {
        console.log('🔄 Starting server-side bookmark sync (bulk)...');
        const bookmarkTree = await chrome.bookmarks.getTree();
        const flat = bookmarkTree[0]?.children || [];

        // Mark sync as in progress so UI can render ongoing state
        await chrome.storage.local.set({ sync_in_progress: true, last_sync_error: null });

        // Await the full sync (request timeout is extended inside the API client)
        await syncAllBookmarksViaServer(flat as any);

        await chrome.storage.local.set({
          sync_in_progress: false,
          last_sync: new Date().toISOString(),
          last_sync_summary: null,
          last_sync_error: null,
        });

        sendResponse({ success: true, message: 'Bookmarks sync completed' });
      } catch (err) {
        console.error('❌ Server-side bookmark sync failed:', err);
        await chrome.storage.local.set({
          sync_in_progress: false,
          last_sync_error: err instanceof Error ? err.message : String(err),
        });
        sendResponse({ success: false, error: String(err) });
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
});
