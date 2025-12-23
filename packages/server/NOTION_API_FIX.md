# Fix: Notion API ECONNRESET Error

## Problem
```
[Notion] Failed to fetch existing bookmarks for duplicate check: TypeError: fetch failed
  at node:internal/deps/undici/undici:13510:13
  ...
  [cause]: Error: read ECONNRESET
```

**Error Type**: Network connection reset by Notion's API server

## Root Cause

The `existingBookmarkUrls()` function was trying to fetch ALL existing bookmarks from the Notion database to check for duplicates, which caused:

1. **Too many API calls**: Fetching up to 100 pages × 100 bookmarks = 10,000 bookmarks
2. **Rate limiting**: Notion API allows ~3 requests/second for data sources
3. **Connection timeout**: Large datasets took too long to fetch
4. **No retry logic**: First failure would abort the entire operation

## Solution

### 1. **Retry Logic with Exponential Backoff**
```typescript
const attemptFetch = async (retryCount = 0): Promise<any> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    // API call with timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    return response;
  } catch (error: any) {
    // Detect network errors (ECONNRESET, timeout, etc.)
    const isNetworkError =
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('fetch failed') ||
      error.message?.includes('timeout');

    if (retryCount < maxRetries && isNetworkError) {
      const delay = baseDelay * Math.pow(2, retryCount); // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
      return attemptFetch(retryCount + 1);
    }

    // Rate limit handling (429 errors)
    if (error.status === 429) {
      const delay = baseDelay * 5; // 5 second delay
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (retryCount < maxRetries) {
        return attemptFetch(retryCount + 1);
      }
    }

    throw error;
  }
};
```

### 2. **Request Timeout**
```typescript
const timeoutMs = options.timeoutMs || 30000; // 30 second timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
});
const response = await Promise.race([fetchPromise, timeoutPromise]);
```

### 3. **Rate Limit Compliance**
```typescript
// Small delay between pages to respect rate limits
if (cursor && pageCount < maxPages) {
  await new Promise((resolve) => setTimeout(resolve, 350)); // ~3 requests per second
}
```

### 4. **Reduced Max Pages**
```typescript
const maxPages = options.maxPages || 50; // Reduced from 100
// Limits to 5,000 bookmarks instead of 10,000
```

### 5. **Partial Data Fallback**
```typescript
// Before: Return empty arrays on error
return { urls: [], syncIds: [] };

// After: Return partial data collected so far
return { urls, syncIds };
// This allows sync to continue with partial duplicate checking
```

### 6. **Better Logging**
```typescript
console.log(`[Notion] Fetching existing bookmarks page ${pageCount}/${maxPages}...`);
console.log(`[Notion] Fetched page ${pageCount} with ${results.length} bookmarks (total: ${urls.length})`);
console.log(`[Notion] ✓ Successfully fetched ${urls.length} URLs and ${syncIds.length} syncIds from ${pageCount} pages`);
```

## Files Modified

### 1. `packages/server/src/services/notion.ts`
- Added `attemptFetch()` function with retry logic
- Added exponential backoff for network errors
- Added 30-second timeout per request
- Added 350ms delay between pages
- Reduced max pages from 100 to 50
- Return partial data on error instead of empty arrays
- Enhanced logging throughout

### 2. `packages/server/src/routes/bookmarks.ts`
- Updated call to `existingBookmarkUrls()` with options:
  ```typescript
  const { urls, syncIds } = await notionService.existingBookmarkUrls(
    verifiedDataSourceId,
    userData.notionAccessToken,
    {
      maxPages: 50,
      timeoutMs: 45000,
    }
  );
  ```

## How It Works Now

1. **Fetch with Retry**: Try to fetch each page up to 3 times
2. **Exponential Backoff**: Wait 1s, 2s, 4s between retries
3. **Timeout Protection**: Fail if request takes > 30 seconds
4. **Rate Limit Compliance**: Wait 350ms between pages (~3 req/sec)
5. **Partial Success**: Return data collected so far if error occurs
6. **Smart Limits**: Stop after 50 pages (5,000 bookmarks) by default

## Expected Behavior

### Success Case
```
[Notion] Fetching existing bookmarks page 1/50...
[Notion] Fetched page 1 with 100 bookmarks (total: 100)
[Notion] Fetching existing bookmarks page 2/50...
[Notion] Fetched page 2 with 100 bookmarks (total: 200)
...
[Notion] ✓ Successfully fetched 5000 URLs and 5000 syncIds from 50 pages
```

### Network Error with Retry
```
[Notion] Fetching existing bookmarks page 1/50...
[Notion] Fetch attempt 1 failed: ECONNRESET
[Notion] Retrying in 1000ms (attempt 1/3)...
[Notion] Fetching existing bookmarks page 1/50...
[Notion] Fetched page 1 with 100 bookmarks (total: 100)
...
```

### Rate Limited
```
[Notion] Fetching existing bookmarks page 5/50...
[Notion] Fetch attempt 1 failed: 429 Too Many Requests
[Notion] Rate limited, waiting 5000ms before retry...
[Notion] Retrying in 5000ms (attempt 1/3)...
[Notion] Fetching existing bookmarks page 5/50...
[Notion] Fetched page 5 with 100 bookmarks (total: 500)
```

## Testing

To test the fix:

1. **Start the server**:
   ```bash
   cd packages/server
   pnpm dev
   ```

2. **Trigger a bookmark sync** with a large database (> 1000 bookmarks)

3. **Watch the logs** for:
   - Progress messages: `[Notion] Fetching existing bookmarks page X/50...`
   - Retry messages: `[Notion] Retrying in Xms...`
   - Success: `[Notion] ✓ Successfully fetched...`

4. **Verify**:
   - Sync completes without ECONNRESET errors
   - Partial data is returned if error occurs
   - Rate limits are respected (350ms delay)

## Future Improvements

1. **Caching**: Cache existing bookmarks in database to avoid refetching
2. **Pagination**: Use smaller page sizes (50 instead of 100) for better reliability
3. **Incremental Sync**: Track last sync timestamp, only fetch newer items
4. **Background Job**: Fetch existing bookmarks in background, not during sync
5. **Database Optimization**: Add index on URL and syncId for faster queries

## Production Monitoring

Monitor these metrics:
- Retry count (should be low, < 5%)
- Timeout rate (should be < 1%)
- Partial data returned rate
- Average pages fetched per sync
- Time to complete fetch

Alert if:
- Retry rate > 20%
- Timeout rate > 5%
- More than 10% of syncs use partial data
