import { serverAPI } from './server-api';

export interface BookmarkItem {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  children?: BookmarkItem[];
  dateAdded?: number;
  dateGroupModified?: number;
  path?: string;
}

export function buildBookmarkPath(
  bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
  targetId: string
): string {
  // Find the full path to a bookmark by its ID
  function findBookmarkPath(
    nodes: chrome.bookmarks.BookmarkTreeNode[],
    targetId: string,
    currentPath: string[] = []
  ): string[] | null {
    for (const node of nodes) {
      // If this is the target bookmark, return the current path (excluding the bookmark itself)
      if (node.id === targetId) {
        return currentPath;
      }

      // If this node has children, search recursively
      if (node.children) {
        const nodePath = node.title ? [...currentPath, node.title] : currentPath;
        const result = findBookmarkPath(node.children, targetId, nodePath);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  }

  const path = findBookmarkPath(bookmarkTree, targetId);
  if (!path) {
    return 'Bookmarks';
  }

  // Filter out empty titles and the root "Bookmarks" container
  const filteredPath = path.filter((part) => part && part.trim() !== '');

  return filteredPath.length > 0 ? filteredPath.join(' / ') : 'Bookmarks';
}

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
    const formatted = bookmarks
      .filter((b) => !!b.url)
      .map((b) => ({
        title: b.title || 'Untitled',
        url: b.url || '',
        description: '',
        path: buildBookmarkPath(bookmarkTree, b.id),
        dateAdded: b.dateAdded ? new Date(b.dateAdded).toISOString() : new Date().toISOString(),
        // Let server generate syncId, but include a UUID if available
        syncId:
          globalThis.crypto && 'randomUUID' in globalThis.crypto
            ? (globalThis.crypto as any).randomUUID()
            : `${b.id}-${Date.now()}`,
      }));
    const result = await serverAPI.syncBookmarks(formatted as any);

    // Store sync results metadata only
    await chrome.storage.local.set({
      last_bulk_sync: new Date().toISOString(),
      last_sync_results: result.summary,
      sync_in_progress: false,
    });

    return result.summary;
  } catch (error: any) {
    console.error('❌ Bulk bookmark sync failed:', error);

    // Check if this is a sync limit error
    if (error?.message?.includes('Sync Limit Exceeded') || error?.status === 403) {
      throw new Error(
        `Free plan is limited to 50 bookmarks per sync. Upgrade to Pro for unlimited syncing.`
      );
    }

    throw error;
  }
}

export function flattenBookmarks(
  bookmarkNodes: chrome.bookmarks.BookmarkTreeNode[]
): BookmarkItem[] {
  const flattened: BookmarkItem[] = [];

  function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[], parentPath = '') {
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} > ${node.title}` : node.title;

      if (node.url) {
        // This is a bookmark (leaf node)
        flattened.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId,
          dateAdded: node.dateAdded,
          dateGroupModified: node.dateGroupModified,
        });
      } else if (node.children) {
        // This is a folder, traverse its children
        traverse(node.children, currentPath);
      }
    }
  }

  traverse(bookmarkNodes);
  return flattened;
}
