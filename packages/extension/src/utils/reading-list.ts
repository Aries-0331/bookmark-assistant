/**
 * Reading List Utility
 * Provides utilities for interacting with Chrome's Reading List API (Chrome 120+)
 */

import {
  formatReadingListItemsForSync,
  type ChromeReadingListItemLike,
} from '@bookmark-assistant/extension-core';
import type { ReadingListSyncItem } from '@bookmark-assistant/contracts';

export type ReadingListItem = ReadingListSyncItem;

// Chrome API type augmentation for readingList (Chrome 120+)
interface ChromeWithReadingList {
  readingList?: {
    query?(queryInfo?: Record<string, unknown>): Promise<ChromeReadingListItemLike[]>;
    getContents?(): Promise<ChromeReadingListItemLike[]>;
  };
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

    return formatReadingListItemsForSync(items);
  } catch (error) {
    console.warn('[Reading List] Failed to get reading list items:', error);
    return [];
  }
}
