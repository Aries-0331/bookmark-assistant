import type { BookmarkSyncResult } from '@bookmark-assistant/contracts';

export type BookmarkSyncResultWithRetryState = BookmarkSyncResult & {
  retryCount?: number;
};

export function isRetryableSyncError(errorMessage: unknown): boolean {
  if (typeof errorMessage !== 'string') {
    return false;
  }

  const normalized = errorMessage.toLowerCase();
  return normalized.includes('fetch failed') || normalized.includes('econnreset');
}

export function selectRetryableSyncFailures<T extends BookmarkSyncResultWithRetryState>(
  results: readonly T[]
): T[] {
  return results.filter(
    (result) =>
      !result.success && result.retryCount === 0 && isRetryableSyncError(result.error)
  );
}

export function mergeRetryResults<T extends { bookmark: string }>(
  batchResults: readonly T[],
  retryResults: readonly T[]
): T[] {
  const merged = [...batchResults];

  for (const retryResult of retryResults) {
    const index = merged.findIndex((result) => result.bookmark === retryResult.bookmark);
    if (index >= 0) {
      merged[index] = retryResult;
    }
  }

  return merged;
}
