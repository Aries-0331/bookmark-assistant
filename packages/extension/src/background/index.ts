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

// Clean up invalid database IDs on startup
async function cleanupInvalidDatabaseId() {
  try {
    const result = await chrome.storage.local.get(['notion_database_id']);
    if (result.notion_database_id) {
      // Check if it has invalid format (starts with "B2N-" or other non-UUID prefixes)
      if (
        result.notion_database_id.startsWith('B2N-') ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          result.notion_database_id
        )
      ) {
        console.log('🧹 Cleaning up invalid database ID:', result.notion_database_id);
        await chrome.storage.local.remove(['notion_database_id']);
        console.log('✅ Invalid database ID removed. A new one will be created automatically.');
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup database ID:', error);
  }
}

// Run cleanup on startup
cleanupInvalidDatabaseId();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'NOTION_OAUTH') {
    (async () => {
      try {
        const code = await launchNotionOAuth();
        // Server-first secure exchange
        await exchangeCodeForToken(code);

        // Check if OAuth template was used
        const storage = await chrome.storage.local.get([
          'oauth_template_database_id',
          'notion_user',
        ]);

        if (storage.oauth_template_database_id) {
          // OAuth template was successfully configured
          sendResponse({
            ok: true,
            method: 'oauth_template',
            databaseId: storage.oauth_template_database_id,
            user: storage.notion_user,
          });
        } else {
          // No template, offer alternatives
          sendResponse({
            ok: true,
            method: 'manual_setup',
            user: storage.notion_user,
          });
        }
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

  if (msg.type === 'DUPLICATE_TEMPLATE') {
    (async () => {
      try {
        console.log('🎨 Duplicating template via server...');

        // Duplicate template
        const result = await serverAPI.duplicateTemplate(msg.templateId);

        console.log('✅ Template duplicated successfully:', result.database);
        sendResponse({
          success: true,
          database: result.database,
          message: 'Template duplicated successfully',
        });
      } catch (err) {
        console.error('❌ Template duplication failed:', err);
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

  if (msg.type === 'CHECK_SERVER_CONNECTION') {
    (async () => {
      try {
        const isConnected = await serverAPI.isConnected();
        const health = await serverAPI.healthCheck();
        sendResponse({
          success: true,
          connected: isConnected,
          server: health,
        });
      } catch (err) {
        console.error('❌ Server connection check failed:', err);
        sendResponse({
          success: false,
          connected: false,
          error: String(err),
        });
      }
    })();
    return true;
  }
});
