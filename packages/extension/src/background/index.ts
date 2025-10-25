import './polyfill';
import { launchNotionOAuth, exchangeCodeForToken, debugOAuthSetup } from './oauth';
import { validateConfig, debugConfig } from '../lib/config';
import { serverAPI } from '../lib/server-api';
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

      await serverAPI.syncBookmarks(formatted);

      await setState({
        last_sync: new Date().toISOString(),
        last_sync_summary: null,
        last_sync_error: null,
      });

      return { success: true } as const;
    } catch (err) {
      console.error('❌ Server-side bookmark sync failed:', err);
      await setState({ last_sync_error: err instanceof Error ? err.message : String(err) });
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
