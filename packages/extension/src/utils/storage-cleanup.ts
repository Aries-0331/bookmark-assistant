/// <reference types="chrome" />

interface PartialSyncInfo {
  new_count?: number;
  failed_count?: number;
  total_synced?: number;
  message?: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
  userAgent: string;
  version: string;
}

/**
 * Validate and sanitize partial sync info to prevent NaN issues
 */
export function validatePartialSyncInfo(info: any): PartialSyncInfo | null {
  if (!info || typeof info !== 'object') {
    return null;
  }

  const validated: PartialSyncInfo = {};

  // Validate numeric fields - always return valid numbers, never NaN
  if ('new_count' in info) {
    const val = Number(info.new_count);
    validated.new_count = Number.isFinite(val) ? val : 0;
  }

  if ('failed_count' in info) {
    const val = Number(info.failed_count);
    validated.failed_count = Number.isFinite(val) ? val : 0;
  }

  if ('total_synced' in info) {
    const val = Number(info.total_synced);
    validated.total_synced = Number.isFinite(val) ? val : 0;
  }

  if ('message' in info && typeof info.message === 'string') {
    validated.message = info.message;
  }

  return validated;
}

/**
 * Clean up old error reports
 * Keeps only recent errors (last 48h) and limits to last 10 errors
 */
export function cleanErrorReports(errorReports: ErrorReport[]): ErrorReport[] {
  if (!Array.isArray(errorReports)) {
    return [];
  }

  const now = Date.now();
  const cutoff = now - 48 * 60 * 60 * 1000; // 48 hours ago

  // Filter by time and limit count
  const recentErrors = errorReports
    .filter((err) => {
      const timestamp = new Date(err.timestamp).getTime();
      return !isNaN(timestamp) && timestamp > cutoff;
    })
    .slice(-10); // Keep only last 10 errors

  return recentErrors;
}

/**
 * Main storage cleanup function
 * Call this on service worker startup to clean up storage
 */
export async function cleanupStorage(): Promise<void> {
  try {
    console.log('[StorageCleanup] Starting storage cleanup...');

    // Get all storage
    const storage = await chrome.storage.local.get(null);

    // Build cleanup operations
    const toRemove: string[] = [];
    const toUpdate: Record<string, any> = {};

    // 1. Remove redundant/obsolete fields
    if (storage['last_sync_hash']) {
      toRemove.push('last_sync_hash');
      console.log('[StorageCleanup] Removed redundant last_sync_hash field');
    }

    if (storage['hasTriedInitialLoad']) {
      toRemove.push('hasTriedInitialLoad');
      console.log('[StorageCleanup] Removed obsolete hasTriedInitialLoad field');
    }

    // 2. Fix partial sync info NaN issue
    if (storage['last_sync_partial_info']) {
      const partialInfo = storage['last_sync_partial_info'];

      // If it's a string, try to parse it
      let parsedInfo: any;
      if (typeof partialInfo === 'string') {
        try {
          parsedInfo = JSON.parse(partialInfo);
        } catch {
          // If parsing fails, it's malformed, remove it
          toRemove.push('last_sync_partial_info');
          console.log('[StorageCleanup] Removed malformed last_sync_partial_info');
        }
      } else {
        parsedInfo = partialInfo;
      }

      // Validate and fix the partial info
      if (parsedInfo && typeof parsedInfo === 'object') {
        const validated = validatePartialSyncInfo(parsedInfo);
        if (validated) {
          toUpdate['last_sync_partial_info'] = validated;
          console.log('[StorageCleanup] Validated last_sync_partial_info');
        } else {
          toRemove.push('last_sync_partial_info');
          console.log('[StorageCleanup] Removed invalid last_sync_partial_info');
        }
      }
    }

    // 3. Clean error reports
    if (storage['error_reports']) {
      const cleanedErrors = cleanErrorReports(storage['error_reports']);
      if (cleanedErrors.length !== storage['error_reports'].length) {
        toUpdate['error_reports'] = cleanedErrors;
        console.log(
          `[StorageCleanup] Cleaned error_reports: ${storage['error_reports'].length} → ${cleanedErrors.length}`
        );
      }
    }

    // Apply cleanup operations
    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
      console.log(`[StorageCleanup] Removed ${toRemove.length} obsolete fields`);
    }

    if (Object.keys(toUpdate).length > 0) {
      await chrome.storage.local.set(toUpdate);
      console.log(`[StorageCleanup] Updated ${Object.keys(toUpdate).length} fields`);
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
