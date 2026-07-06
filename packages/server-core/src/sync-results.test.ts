import { describe, expect, it } from 'vitest';
import {
  isRetryableSyncError,
  mergeRetryResults,
  selectRetryableSyncFailures,
  type BookmarkSyncResultWithRetryState,
} from './sync-results';

describe('server sync result core', () => {
  it('classifies transient network sync errors as retryable', () => {
    expect(isRetryableSyncError('fetch failed')).toBe(true);
    expect(isRetryableSyncError('Fetch Failed while creating page')).toBe(true);
    expect(isRetryableSyncError('read ECONNRESET')).toBe(true);
  });

  it('keeps Notion/API validation style errors non-retryable', () => {
    expect(isRetryableSyncError('Notion API validation error')).toBe(false);
    expect(isRetryableSyncError('Unauthorized')).toBe(false);
    expect(isRetryableSyncError(undefined)).toBe(false);
  });

  it('selects only unretried failed results with retryable errors', () => {
    const retryable: BookmarkSyncResultWithRetryState = {
      success: false,
      bookmark: 'Retry me',
      error: 'fetch failed',
      retryCount: 0,
    };
    const alreadyRetried: BookmarkSyncResultWithRetryState = {
      success: false,
      bookmark: 'Already retried',
      error: 'fetch failed',
      retryCount: 1,
    };
    const notionFailure: BookmarkSyncResultWithRetryState = {
      success: false,
      bookmark: 'Bad request',
      error: 'Notion API validation error',
      retryCount: 0,
    };
    const success: BookmarkSyncResultWithRetryState = {
      success: true,
      bookmark: 'Created',
      action: 'created',
    };

    expect(selectRetryableSyncFailures([retryable, alreadyRetried, notionFailure, success])).toEqual(
      [retryable]
    );
  });

  it('requires explicit retryCount 0 for retry selection', () => {
    expect(
      selectRetryableSyncFailures([
        {
          success: false,
          bookmark: 'No retry state',
          error: 'fetch failed',
        },
      ])
    ).toEqual([]);
  });

  it('merges retry results without mutating the original batch results', () => {
    const original = [
      {
        success: false,
        bookmark: 'Retry me',
        error: 'fetch failed',
        retryCount: 0,
      },
      {
        success: false,
        bookmark: 'Keep failure',
        error: 'Notion API validation error',
        retryCount: 0,
      },
    ] satisfies BookmarkSyncResultWithRetryState[];
    const retryResult = {
      success: true,
      bookmark: 'Retry me',
      action: 'created',
      retryCount: 1,
    } satisfies BookmarkSyncResultWithRetryState;

    const merged = mergeRetryResults(original, [retryResult]);

    expect(merged).toEqual([retryResult, original[1]]);
    expect(original[0]).toEqual({
      success: false,
      bookmark: 'Retry me',
      error: 'fetch failed',
      retryCount: 0,
    });
  });

  it('ignores retry results that do not match a batch result bookmark', () => {
    const original = [
      {
        success: false,
        bookmark: 'Original',
        error: 'fetch failed',
        retryCount: 0,
      },
    ] satisfies BookmarkSyncResultWithRetryState[];
    const retryResult = {
      success: true,
      bookmark: 'Other',
      action: 'created',
      retryCount: 1,
    } satisfies BookmarkSyncResultWithRetryState;

    expect(mergeRetryResults(original, [retryResult])).toEqual(original);
  });
});
