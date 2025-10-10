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
        // Use existing helper (statically imported to avoid dynamic import issues in SW)
        await syncAllBookmarksViaServer(flat as any);
        sendResponse({ success: true, message: 'Bookmarks sync requested' });
      } catch (err) {
        console.error('❌ Server-side bookmark sync failed:', err);
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
