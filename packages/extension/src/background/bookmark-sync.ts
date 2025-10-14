import { serverAPI } from '../lib/server-api';

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
  console.log('🔖 Starting bulk bookmark sync to Notion...');

  try {
    // NOTE: Database initialization now handled by server
    console.log('🔄 Server will handle database initialization...');
    console.log('✅ Ready for bulk sync via server API');

    // Get all bookmarks from Chrome
    const bookmarkTree = await chrome.bookmarks.getTree();
    console.log('📚 Retrieved bookmark tree from Chrome', bookmarkTree.slice(0, 3));

    // Flatten bookmark tree and filter URLs only
    const flatBookmarks = flattenBookmarks(bookmarkTree).filter((bookmark) => bookmark.url);
    console.log('📄 Flattened bookmarks', flatBookmarks.slice(0, 3));
    // Add paths to bookmarks for better organization in Notion
    const bookmarks = addPathsToBookmarks(flatBookmarks, bookmarkTree);
    console.log(
      `📊 Found ${bookmarks.length} bookmarks to sync, after add path:`,
      bookmarks.slice(0, 3)
    );

    if (bookmarks.length === 0) {
      throw new Error('No bookmarks found to sync');
    }

    // Delegate the bulk sync entirely to the server
    const formatted = bookmarks
      .filter((b) => !!b.url)
      .map((b) => ({
        title: b.title || 'Untitled',
        url: b.url!,
        description: `Imported from Chrome bookmarks (${buildBookmarkPath(bookmarkTree, b.id)})`,
        path: buildBookmarkPath(bookmarkTree, b.id),
        dateAdded: b.dateAdded ? new Date(b.dateAdded).toISOString() : new Date().toISOString(),
        // Let server generate syncId, but include a UUID if available
        syncId:
          globalThis.crypto && 'randomUUID' in globalThis.crypto
            ? (globalThis.crypto as any).randomUUID()
            : `${b.id}-${Date.now()}`,
      }));

    const result = await serverAPI.syncBookmarks(formatted as any);
    console.log('🎉 Bulk bookmark sync completed:', result.summary);

    // Store sync results metadata only
    await chrome.storage.local.set({
      last_bulk_sync: new Date().toISOString(),
      last_sync_results: result.summary,
    });

    return result.summary;
  } catch (error) {
    console.error('❌ Bulk bookmark sync failed:', error);
    throw error;
  }
}

function flattenBookmarks(bookmarkNodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkItem[] {
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

export async function processBookmarkForNotion(bookmark: chrome.bookmarks.BookmarkTreeNode) {
  console.log('🔄 Processing single bookmark via server:', bookmark.title);
  try {
    const path = buildBookmarkPath([bookmark], bookmark.id);
    const payload = {
      title: bookmark.title || 'Untitled',
      url: bookmark.url || '',
      description: `Imported from Chrome bookmarks (${path})`,
      path,
      dateAdded: bookmark.dateAdded
        ? new Date(bookmark.dateAdded).toISOString()
        : new Date().toISOString(),
      syncId: `${bookmark.url}-${bookmark.dateAdded || Date.now()}`,
    };
    const result = await serverAPI.syncBookmarks([payload]);
    return result.results?.[0] || null;
  } catch (e) {
    console.error('❌ Server bookmark process failed:', e);
    throw e;
  }
}
