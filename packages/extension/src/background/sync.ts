import type { LinkItem } from '@bookmark-assistant/contracts';
import {
  buildBookmarkPath,
  flattenBookmarks,
  formatBookmarkForSync,
  type BookmarkTreeNodeLike,
} from '@bookmark-assistant/extension-core';
import { serverAPI } from './server-api';

export { buildBookmarkPath, flattenBookmarks };
export type BookmarkItem = BookmarkTreeNodeLike;

function addPathsToBookmarks(
  bookmarks: BookmarkItem[],
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[]
): BookmarkItem[] {
  return bookmarks.map((bookmark) => ({
    ...bookmark,
    path: buildBookmarkPath(bookmarkTree, bookmark.id),
  }));
}

export async function syncAllBookmarksToNotion() {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();

    // Flatten bookmark tree and filter URLs only
    const flatBookmarks = flattenBookmarks(bookmarkTree).filter((bookmark) => bookmark.url);
    // Add paths to bookmarks for better organization in Notion
    const bookmarks = addPathsToBookmarks(flatBookmarks, bookmarkTree);
    if (bookmarks.length === 0) {
      throw new Error('No bookmarks found to sync');
    }

    // NOTE: We no longer check is_pro from local storage
    // Pro status is now validated securely on the server side using database state
    // User cannot bypass limits by modifying local storage

    // Delegate the bulk sync entirely to the server
    const formatted: LinkItem[] = bookmarks
      .filter((b) => !!b.url)
      .map((b) =>
        formatBookmarkForSync(b, buildBookmarkPath(bookmarkTree, b.id), {
          description: '',
          createSyncId: (bookmark) =>
            globalThis.crypto && 'randomUUID' in globalThis.crypto
              ? (globalThis.crypto as any).randomUUID()
              : `${bookmark.id}-${Date.now()}`,
        })
      );
    const result = await serverAPI.syncBookmarks(formatted);

    // Store sync results metadata only
    await chrome.storage.local.set({
      last_bulk_sync: new Date().toISOString(),
      last_sync_results: result.summary,
      sync_in_progress: false,
    });

    return result.summary;
  } catch (error: any) {
    console.error('❌ Bulk bookmark sync failed:', error);

    throw error;
  }
}
