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
  id: { value: string };
  title: { content: string };
  url: { url: string };
  dateAdded: number;
  readState: { state: 'UNREAD' | 'READ' };
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
  // Check if chrome.readingList API is available (Chrome 120+)
  if (!chrome.readingList) {
    console.warn('[Reading List] API not available. Chrome 120+ required.');
    return [];
  }

  try {
    const items = await chrome.readingList.getContents();

    return items.map((item: ChromeReadingListItem) => ({
      title: item.title.content,
      url: item.url.url,
      dateAdded: new Date(item.dateAdded).toISOString(),
      readState: item.readState.state,
      syncId: generateUUID(),
      type: 'reading_list' as const,
    }));
  } catch (error) {
    console.warn('[Reading List] Failed to get reading list items:', error);
    return [];
  }
}