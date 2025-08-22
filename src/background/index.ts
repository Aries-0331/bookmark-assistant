// filepath: src/background/index.ts
import { launchNotionOAuth, exchangeCodeForToken, debugOAuthSetup } from "./oauth";
import { processBookmarkForNotion, syncAllBookmarksToNotion } from "./bookmark-sync";
import { validateConfig, debugConfig } from "../lib/config.ts";

// Initialize configuration and validate on startup
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
  if (msg.type === "NOTION_OAUTH") {
    (async () => {
      try {
        const code = await launchNotionOAuth();
        const token = await exchangeCodeForToken(code);
        // Store token
        await chrome.storage.local.set({ notion_token: token });
        sendResponse({ ok: true, token });
      } catch (err) {
        console.error(err);
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "SYNC_ALL_BOOKMARKS") {
    (async () => {
      try {
        await syncAllBookmarksToNotion();
        sendResponse({ success: true });
      } catch (err) {
        console.error('Sync all bookmarks failed:', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true;
  }

  if (msg.type === "SYNC_BOOKMARK") {
    (async () => {
      try {
        const { bookmarkId, url, title } = msg.payload;
        await processBookmarkForNotion(bookmarkId, url, title);
        sendResponse({ ok: true });
      } catch (err) {
        console.error(err);
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }
});

// Listen for bookmark creation (optional - for real-time sync)
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (bookmark.url) {
    // Auto-sync new bookmarks only if auto-sync is enabled
    const { auto_sync_enabled } = await chrome.storage.local.get('auto_sync_enabled');
    if (auto_sync_enabled !== false) { // Default to true
      try {
        await processBookmarkForNotion(id, bookmark.url, bookmark.title);
        console.log(`🔖 Auto-synced new bookmark: ${bookmark.title}`);
      } catch (error) {
        console.warn(`⚠️ Failed to auto-sync bookmark: ${error}`);
      }
    }
  }
});

