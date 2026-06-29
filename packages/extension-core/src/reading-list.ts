import type { ReadingListSyncItem, ReadState } from '@bookmark-assistant/contracts';

export interface ChromeReadingListItemLike {
  title: string | { content: string };
  url: string | { url: string };
  creationTime?: number;
  dateAdded?: number;
  hasBeenRead?: boolean;
  readState?: { state: ReadState };
}

export interface FormatReadingListItemOptions {
  now?: () => Date;
  createSyncId?: (item: ChromeReadingListItemLike, index: number) => string;
}

export function formatReadingListItemForSync(
  item: ChromeReadingListItemLike,
  options: FormatReadingListItemOptions = {},
  index = 0
): ReadingListSyncItem {
  const now = options.now ?? (() => new Date());
  const readState: ReadState = item.readState?.state ?? (item.hasBeenRead ? 'READ' : 'UNREAD');

  return {
    title: normalizeReadingListTitle(item.title),
    url: normalizeReadingListUrl(item.url),
    dateAdded: new Date(item.creationTime ?? item.dateAdded ?? now().getTime()).toISOString(),
    readState,
    syncId: options.createSyncId?.(item, index) ?? createDefaultReadingListSyncId(),
    type: 'reading_list',
  };
}

export function formatReadingListItemsForSync(
  items: ChromeReadingListItemLike[],
  options: FormatReadingListItemOptions = {}
): ReadingListSyncItem[] {
  return items.map((item, index) => formatReadingListItemForSync(item, options, index));
}

function normalizeReadingListTitle(title: ChromeReadingListItemLike['title']): string {
  return typeof title === 'string' ? title : title.content;
}

function normalizeReadingListUrl(url: ChromeReadingListItemLike['url']): string {
  return typeof url === 'string' ? url : url.url;
}

function createDefaultReadingListSyncId(): string {
  if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return (globalThis.crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }

  return `reading-list-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
