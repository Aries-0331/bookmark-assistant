// filepath: src/background/index.ts
import {
	launchNotionOAuth,
	exchangeCodeForToken,
	debugOAuthSetup,
} from "./oauth";
import {
	processBookmarkForNotion,
	buildBookmarkPath,
} from "./bookmark-sync";
import { validateConfig, debugConfig } from "../lib/config";
import { debugCurrentDatabase, clearStoredDatabase } from "../lib/notion";

// Initialize configuration and validate on startup
debugConfig();
debugOAuthSetup();
const configValidation = validateConfig();
if (!configValidation.isValid) {
	console.error("❌ Configuration errors:", configValidation.errors);
}
if (configValidation.warnings.length > 0) {
	console.warn("⚠️ Configuration warnings:", configValidation.warnings);
}

// Clean up invalid database IDs on startup
async function cleanupInvalidDatabaseId() {
	try {
		const result = await chrome.storage.local.get(["notion_database_id"]);
		if (result.notion_database_id) {
			// Check if it has invalid format (starts with "B2N-" or other non-UUID prefixes)
			if (
				result.notion_database_id.startsWith("B2N-") ||
				!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
					result.notion_database_id,
				)
			) {
				console.log(
					"🧹 Cleaning up invalid database ID:",
					result.notion_database_id,
				);
				await chrome.storage.local.remove(["notion_database_id"]);
				console.log(
					"✅ Invalid database ID removed. A new one will be created automatically.",
				);
			}
		}
	} catch (error) {
		console.warn("Failed to cleanup database ID:", error);
	}
}

// Run cleanup on startup
cleanupInvalidDatabaseId();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg.type === "NOTION_OAUTH") {
		(async () => {
			try {
				const code = await launchNotionOAuth();
				await exchangeCodeForToken(code);
				
				// Check if OAuth template was used
				const storage = await chrome.storage.local.get(['oauth_template_database_id', 'notion_user']);
				
				if (storage.oauth_template_database_id) {
					// OAuth template was successfully configured
					sendResponse({ 
						ok: true, 
						method: 'oauth_template',
						databaseId: storage.oauth_template_database_id,
						user: storage.notion_user
					});
				} else {
					// No template, offer alternatives
					sendResponse({ 
						ok: true, 
						method: 'manual_setup',
						user: storage.notion_user
					});
				}
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
				console.log("🔄 Starting server-side bookmark sync...");
				
				// Import server API
				const { syncAllBookmarksViaServer } = await import("../lib/server-api");
				
				// Get all bookmarks
				const bookmarkTree = await chrome.bookmarks.getTree();
				
				// Sync via server
				await syncAllBookmarksViaServer(bookmarkTree);
				
				sendResponse({ success: true, message: "Bookmarks synced successfully via server" });
			} catch (err) {
				console.error("❌ Server-side bookmark sync failed:", err);
				sendResponse({ success: false, error: String(err) });
			}
		})();
		return true;
	}

	if (msg.type === "DUPLICATE_TEMPLATE") {
		(async () => {
			try {
				console.log("🎨 Duplicating template via server...");
				
				// Import server API
				const { serverAPI } = await import("../lib/server-api");
				
				// Duplicate template
				const result = await serverAPI.duplicateTemplate(msg.templateId);
				
				console.log("✅ Template duplicated successfully:", result.database);
				sendResponse({ 
					success: true, 
					database: result.database,
					message: "Template duplicated successfully"
				});
			} catch (err) {
				console.error("❌ Template duplication failed:", err);
				sendResponse({ success: false, error: String(err) });
			}
		})();
		return true;
	}

	if (msg.type === "GET_USER_PROFILE") {
		(async () => {
			try {
				const { serverAPI } = await import("../lib/server-api");
				const profile = await serverAPI.getUserProfile();
				sendResponse({ success: true, profile: profile.user });
			} catch (err) {
				console.error("❌ Failed to get user profile:", err);
				sendResponse({ success: false, error: String(err) });
			}
		})();
		return true;
	}

	if (msg.type === "CHECK_SERVER_CONNECTION") {
		(async () => {
			try {
				const { serverAPI } = await import("../lib/server-api");
				const isConnected = await serverAPI.isConnected();
				const health = await serverAPI.healthCheck();
				sendResponse({ 
					success: true, 
					connected: isConnected,
					server: health
				});
			} catch (err) {
				console.error("❌ Server connection check failed:", err);
				sendResponse({ 
					success: false, 
					connected: false,
					error: String(err) 
				});
			}
		})();
		return true;
	}

	if (msg.type === "SYNC_BOOKMARK") {
		(async () => {
			try {
				const { bookmarkId, url, title } = msg.payload;
				
				// Get bookmark tree to build path
				const bookmarkTree = await chrome.bookmarks.getTree();
				const path = buildBookmarkPath(bookmarkTree, bookmarkId);
				
				await processBookmarkForNotion(bookmarkId, url, title, path);
				sendResponse({ ok: true });
			} catch (err) {
				console.error(err);
				sendResponse({ ok: false, error: String(err) });
			}
		})();
		return true;
	}

	if (msg.type === "DEBUG_DATABASE") {
		(async () => {
			try {
				await debugCurrentDatabase();
				sendResponse({ success: true });
			} catch (err) {
				console.error("Database debug failed:", err);
				sendResponse({ success: false, error: String(err) });
			}
		})();
		return true;
	}

	if (msg.type === "CLEAR_DATABASE") {
		(async () => {
			try {
				await clearStoredDatabase();
				sendResponse({ success: true });
			} catch (err) {
				console.error("Clear database failed:", err);
				sendResponse({ success: false, error: String(err) });
			}
		})();
		return true;
	}
});

// Listen for bookmark creation (optional - for real-time sync)
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
	if (bookmark.url) {
		// Auto-sync new bookmarks only if auto-sync is enabled
		const { auto_sync_enabled } = await chrome.storage.local.get(
			"auto_sync_enabled",
		);
		if (auto_sync_enabled !== false) {
			// Default to true
			try {
				// Get bookmark tree to build path for new bookmark
				const bookmarkTree = await chrome.bookmarks.getTree();
				const path = buildBookmarkPath(bookmarkTree, id);
				
				await processBookmarkForNotion(id, bookmark.url, bookmark.title, path);
				console.log(`🔖 Auto-synced new bookmark: ${bookmark.title}`);
			} catch (error) {
				console.warn(`⚠️ Failed to auto-sync bookmark: ${error}`);
			}
		}
	}
});
