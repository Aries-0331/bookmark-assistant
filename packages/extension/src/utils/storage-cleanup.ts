/// <reference types="chrome" />

import { planStorageCleanup } from '@bookmark-assistant/extension-core';

/**
 * Main storage cleanup function
 * Call this on service worker startup to clean up storage
 */
export async function cleanupStorage(): Promise<void> {
  try {
    console.log('[StorageCleanup] Starting storage cleanup...');

    // Get all storage
    const storage = await chrome.storage.local.get(null);

    const { removeKeys, updateValues } = planStorageCleanup(storage);

    // Apply cleanup operations
    if (removeKeys.length > 0) {
      await chrome.storage.local.remove(removeKeys);
      console.log(`[StorageCleanup] Removed ${removeKeys.length} obsolete fields`);
    }

    const updateKeys = Object.keys(updateValues);
    if (updateKeys.length > 0) {
      await chrome.storage.local.set(updateValues);
      console.log(`[StorageCleanup] Updated ${updateKeys.length} fields`);
    }

    // Final storage size check
    const finalStorage = await chrome.storage.local.get(null);
    console.log(
      `[StorageCleanup] Storage cleanup complete. Total keys: ${Object.keys(finalStorage).length}`
    );
  } catch (error) {
    console.warn('[StorageCleanup] Storage cleanup failed:', error);
  }
}

/**
 * Run storage cleanup periodically (daily)
 * Schedule this to run once per day
 */
export function scheduleDailyStorageCleanup(): void {
  // Check every 24 hours
  const intervalMs = 24 * 60 * 60 * 1000;

  setInterval(() => {
    cleanupStorage().catch((error) => {
      console.warn('[StorageCleanup] Periodic cleanup failed:', error);
    });
  }, intervalMs);

  console.log('[StorageCleanup] Daily cleanup scheduled');
}
