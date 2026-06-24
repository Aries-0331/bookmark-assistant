import type { BrowserSavedLinkItem, LinkItem } from '@bookmark-assistant/contracts';

export interface BookmarkTreeNodeLike {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  children?: BookmarkTreeNodeLike[];
  dateAdded?: number;
  dateGroupModified?: number;
  path?: string;
}

export interface SyncFingerprintItem {
  url: string;
  title: string;
  path: string;
  source?: LinkItem['source'];
  type?: LinkItem['type'];
  readState?: LinkItem['readState'];
  syncId?: string;
}

export interface FormatBookmarkOptions {
  description?: string;
  now?: () => Date;
  createSyncId?: (bookmark: BookmarkTreeNodeLike) => string;
  includeType?: boolean;
}

export interface FormatSavedLinkInput {
  title?: string;
  url: string;
  description?: string;
  path?: string;
}

export interface FormatSavedLinkOptions {
  now?: () => Date;
  createSyncId?: () => string;
  defaultPath?: string;
  source?: BrowserSavedLinkItem['source'];
}

export type FormatCurrentPageOptions = Omit<FormatSavedLinkOptions, 'source'>;

export function buildBookmarkPath(bookmarkTree: BookmarkTreeNodeLike[], targetId: string): string {
  function findBookmarkPath(
    nodes: BookmarkTreeNodeLike[],
    currentTargetId: string,
    currentPath: string[] = []
  ): string[] | null {
    for (const node of nodes) {
      if (node.id === currentTargetId) {
        return currentPath;
      }

      if (node.children) {
        const nodePath = node.title ? [...currentPath, node.title] : currentPath;
        const result = findBookmarkPath(node.children, currentTargetId, nodePath);
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

  const filteredPath = path.filter((part) => part && part.trim() !== '');
  return filteredPath.length > 0 ? filteredPath.join(' / ') : 'Bookmarks';
}

export function flattenBookmarks(bookmarkNodes: BookmarkTreeNodeLike[]): BookmarkTreeNodeLike[] {
  const flattened: BookmarkTreeNodeLike[] = [];

  function traverse(nodes: BookmarkTreeNodeLike[]) {
    for (const node of nodes) {
      if (node.url) {
        flattened.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId,
          dateAdded: node.dateAdded,
          dateGroupModified: node.dateGroupModified,
        });
      } else if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(bookmarkNodes);
  return flattened;
}

export function formatBookmarkForSync(
  bookmark: BookmarkTreeNodeLike,
  path: string,
  options: FormatBookmarkOptions = {}
): LinkItem {
  const now = options.now ?? (() => new Date());
  const syncId = options.createSyncId?.(bookmark) ?? createDefaultSyncId(bookmark.id);
  const item: LinkItem = {
    title: bookmark.title || 'Untitled',
    url: bookmark.url || '',
    description: options.description ?? '',
    path,
    dateAdded: bookmark.dateAdded
      ? new Date(bookmark.dateAdded).toISOString()
      : now().toISOString(),
    syncId,
  };

  if (options.includeType) {
    item.type = 'bookmark';
  }

  return item;
}

export function withBookmarkType(items: LinkItem[]): LinkItem[] {
  return items.map((item) => ({
    ...item,
    type: 'bookmark',
  }));
}

export function formatSavedLinkForSync(
  input: FormatSavedLinkInput,
  options: FormatSavedLinkOptions = {}
): BrowserSavedLinkItem {
  const now = options.now ?? (() => new Date());
  const syncId = options.createSyncId?.() ?? createDefaultSyncId('quick-save');
  const item: BrowserSavedLinkItem = {
    title: input.title || 'Untitled',
    url: input.url,
    description: input.description ?? '',
    path: input.path ?? options.defaultPath ?? 'Quick Saves',
    dateAdded: now().toISOString(),
    syncId,
  };

  if (options.source) {
    item.source = options.source;
  }

  return item;
}

export function formatCurrentPageForSync(
  input: FormatSavedLinkInput,
  options: FormatCurrentPageOptions = {}
): BrowserSavedLinkItem {
  return formatSavedLinkForSync(input, {
    ...options,
    defaultPath: options.defaultPath ?? 'Saved Pages',
    source: 'current_page',
  });
}

export function toSyncFingerprintItems(
  items: LinkItem[],
  defaultPath = 'Bookmarks'
): SyncFingerprintItem[] {
  return items.map((item) => ({
    url: item.url,
    title: item.title,
    path: item.path || defaultPath,
    source: item.source,
    type: item.type,
    readState: item.readState,
    syncId: item.syncId,
  }));
}

function createDefaultSyncId(prefix: string): string {
  if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return (globalThis.crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }

  return `${prefix}-${Date.now()}`;
}
