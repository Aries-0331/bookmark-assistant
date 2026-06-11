/**
 * Reading List Utility
 * Provides utilities for interacting with Chrome's Reading List API (Chrome 120+)
 */

export interface ReadingListItem {
  title: string;
  url: string;
  dateAdded: string;
  readState: string;
  syncId: string;
  type: 'reading_list';
}

interface ChromeReadingListItem {
  title: string | { content: string };
  url: string | { url: string };
  creationTime?: number;
  dateAdded?: number;
  hasBeenRead?: boolean;
  readState?: { state: 'UNREAD' | 'READ' };
}

// Chrome API type augmentation for readingList (Chrome 120+)
interface ChromeWithReadingList {
  readingList?: {
    query?(queryInfo?: Record<string, unknown>): Promise<ChromeReadingListItem[]>;
    getContents?(): Promise<ChromeReadingListItem[]>;
  };
}

/**
 * Generate a UUID v4, with fallback for environments without crypto.randomUUID
 */
function generateUUID(): string {
  if (globalThis.crypto && 'randomUUID' in globalThis.crypto) {
    return (globalThis.crypto as any).randomUUID();
  }
  // Fallback: timestamp-based ID
  return `reading-list-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get items from Chrome's Reading List API
 *
 * @returns Array of reading list items mapped to a consistent format
 */
export async function getReadingListItems(): Promise<ReadingListItem[]> {
  // Cast chrome to access readingList API (Chrome 120+)
  const chromeWithReadingList = chrome as ChromeWithReadingList;

  if (!chromeWithReadingList.readingList) {
    console.warn('[Reading List] API not available. Chrome 120+ required.');
    return [];
  }

  try {
    const items = chromeWithReadingList.readingList.query
      ? await chromeWithReadingList.readingList.query({})
      : await chromeWithReadingList.readingList.getContents?.();

    if (!items) {
      console.warn('[Reading List] API not available. Chrome 120+ required.');
      return [];
    }

    return items.map((item: ChromeReadingListItem) => ({
      title: typeof item.title === 'string' ? item.title : item.title.content,
      url: typeof item.url === 'string' ? item.url : item.url.url,
      dateAdded: new Date(item.creationTime ?? item.dateAdded ?? Date.now()).toISOString(),
      readState: item.readState?.state ?? (item.hasBeenRead ? 'READ' : 'UNREAD'),
      syncId: generateUUID(),
      type: 'reading_list' as const,
    }));
  } catch (error) {
    console.warn('[Reading List] Failed to get reading list items:', error);
    return [];
  }
}
