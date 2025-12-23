# Complete Notion API Error Fix

## Issues Fixed

### 1. ❌ **ECONNRESET in `existingBookmarkUrls()`**
**Error**:
```
[Notion] Failed to fetch existing bookmarks for duplicate check: TypeError: fetch failed
  [cause]: Error: read ECONNRESET
```

**Root Cause**: Fetching 10,000+ bookmarks (100 pages) hit Notion API rate limits

**Solution**: ✅ Retry logic with exponential backoff, timeout, rate limiting

### 2. ❌ **ECONNRESET in `resolveDatabaseFromTemplate()`**
**Error**:
```
[Notion] Error reading children for block 2d29466d-e76d-81d0-b49f-eedc8b70e1b3
  TypeError: fetch failed
  [cause]: Error: read ECONNRESET
```

**Root Cause**: API call to fetch block children failed with network error

**Solution**: ✅ Retry logic with exponential backoff, timeout, rate limiting

### 3. ❌ **ECONNRESET in `verifyDatabaseAccess()`**
**Error**: Same pattern when verifying database access

**Root Cause**: API call to get database metadata failed

**Solution**: ✅ Retry logic with exponential backoff, timeout

---

## Complete Solution

### **Reusable Retry Helper**

Created a centralized `withRetry()` method in `NotionService`:

```typescript
private async withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 30-second timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 30s')), 30000);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      return result as T;
    } catch (error: any) {
      lastError = error;

      // Detect network errors
      const isNetworkError =
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNRESET' ||
        error.cause?.errno === -54;

      // Retry with exponential backoff (1s, 2s, 4s)
      if (isNetworkError && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`[Notion] ${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Handle rate limits (5s delay)
      if (error.status === 429 && attempt < maxRetries) {
        const delay = 5000;
        console.log(`[Notion] ${operationName} rate limited, waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
```

### **Functions Updated with Retry Logic**

#### 1. `existingBookmarkUrls()` ✅
- ✅ Retry logic (3 attempts)
- ✅ 30-second timeout per request
- ✅ Exponential backoff (1s, 2s, 4s)
- ✅ Rate limit handling (429 errors)
- ✅ 350ms delay between pages
- ✅ Reduced max pages (50 → 5,000 bookmarks)
- ✅ Return partial data on error

#### 2. `resolveDatabaseFromTemplate()` ✅
- ✅ Retry logic for `blocks.children.list()`
- ✅ Retry logic for `databases.get()`
- ✅ 30-second timeout per API call
- ✅ Exponential backoff
- ✅ Rate limiting (350ms between queue items)
- ✅ Continue on error instead of aborting

#### 3. `verifyDatabaseAccess()` ✅
- ✅ Retry logic for database verification
- ✅ 30-second timeout
- ✅ Enhanced logging
- ✅ Better error messages

#### 4. `getPrimaryDataSourceId()` ✅
- ✅ Retry logic for database metadata fetch
- ✅ 30-second timeout
- ✅ Better error handling

---

## How It Works

### **Network Error Recovery Flow**

```
1. API call fails with ECONNRESET
   ↓
2. Detect network error (ECONNRESET, fetch failed, timeout)
   ↓
3. Check retry count < 3
   ↓
4. Calculate delay: 1000 * 2^(attempt) = 1s, 2s, 4s
   ↓
5. Wait and retry
   ↓
6. On success: continue
   ↓
7. On final failure: throw error
```

### **Rate Limit Recovery Flow**

```
1. API call fails with 429 status
   ↓
2. Check retry count < 3
   ↓
3. Wait 5 seconds (fixed delay)
   ↓
4. Retry
   ↓
5. On success: continue
   ↓
6. On final failure: throw error
```

### **Timeout Protection**

```
1. Start API call
   ↓
2. Race between API call and 30s timeout
   ↓
3. If timeout wins: reject with timeout error
   ↓
4. Error handler detects timeout
   ↓
5. Retry with exponential backoff
```

---

## Expected Behavior

### **Success Case**
```
[Notion] Verifying database access for 2d29466d-e76d-81d0-b49f-eedc8b70e1b3...
[Notion] ✓ Database 2d29466d-e76d-81d0-b49f-eedc8b70e1b3 is accessible
```

### **Network Error with Retry**
```
[Notion] Verifying database access for 2d29466d-e76d-81d0-b49f-eedc8b70e1b3...
[Notion] Verify database 2d29466d... attempt 1 failed (ECONNRESET), retrying in 1000ms...
[Notion] Verify database 2d29466d... attempt 2 failed (timeout), retrying in 2000ms...
[Notion] ✓ Database 2d29466d-e76d-81d0-b49f-eedc8b70e1b3 is accessible
```

### **Rate Limited**
```
[Notion] Reading children for block 2d29466d... (depth 0)...
[Notion] Read children for 2d29466d... rate limited (attempt 1), waiting 5000ms...
[Notion] Reading children for block 2d29466d... (depth 0)...
[Notion] Found child_database: 3c295c66-...
```

### **Template Recovery**
```
[Notion] ✗ Failed to access database 2d29466d...: ECONNRESET
[Notion] Attempting database recovery from template
[Notion] 🔍 Starting template resolution for: 2d29466d-...
[Notion] Reading children for block 2d29466d... (depth 0)...
[Notion] Found child_database: 3c295c66-...
[Notion] ✓ Database recovered from template: 3c295c66-...
```

---

## Build Status

```bash
✔ Generated Prisma Client
✔ TypeScript compilation successful
✓ Build successful
```

---

## Testing Checklist

- [ ] Start server: `pnpm dev:server`
- [ ] Trigger bookmark sync
- [ ] Watch for retry logs (if network issues)
- [ ] Verify sync completes without ECONNRESET errors
- [ ] Check rate limit compliance
- [ ] Verify database recovery works if needed

---

## Files Modified

1. **`packages/server/src/services/notion.ts`**
   - Added `withRetry()` helper method
   - Updated `existingBookmarkUrls()` with retry logic
   - Updated `resolveDatabaseFromTemplate()` with retry logic
   - Updated `verifyDatabaseAccess()` with retry logic
   - Updated `getPrimaryDataSourceId()` with retry logic
   - Enhanced logging throughout

2. **`packages/server/src/routes/bookmarks.ts`**
   - Updated `existingBookmarkUrls()` call with options
   - Added comments about rate limiting

---

## Performance Impact

### **Before**
- ❌ No retry on network errors
- ❌ No timeout protection
- ❌ Failed completely on first ECONNRESET
- ❌ No rate limit handling

### **After**
- ✅ 3 retries with exponential backoff
- ✅ 30-second timeout per request
- ✅ Rate limit compliance (350ms delay, 5s for 429)
- ✅ Partial success on errors
- ✅ Comprehensive error logging

---

## Monitoring

Monitor these metrics:
- Retry rate (should be < 10% for healthy networks)
- Timeout rate (should be < 2%)
- Rate limit hits (should be < 5%)
- Template recovery success rate
- Time to complete operations

---

## Summary

All Notion API calls are now resilient to:
- ✅ Network errors (ECONNRESET)
- ✅ Timeouts
- ✅ Rate limits (429)
- ✅ Partial failures

The system will retry failed requests automatically and provide detailed logging for debugging.
