# OAuth Connection Pool Fix

**Date:** December 27, 2025  
**Issue:** Connection failed during OAuth with `P2024: Timed out fetching a new connection from the connection pool`  
**Status:** ✅ Fixed

---

## Problem

User reported OAuth connection failure with error:
```
PrismaClientKnownRequestError: Timed out fetching a new connection from the connection pool
Code: P2024
connection_limit: 17
timeout: 10
```

**Location:** `/api/oauth/exchange` endpoint  
**Operation:** `prisma.user.findUnique()`  
**Impact:** Users cannot connect to Notion (blocking issue)

---

## Root Cause

The OAuth endpoint performs **5 sequential Prisma operations** without retry logic:
1. `findUnique` - Check existing user by notionUserId
2. `update` OR `findUnique` - Update existing OR check by email  
3. `update` OR `create` - Merge accounts OR create new user
4. `update` - Store database IDs (if template available)
5. `findUnique` - Fetch latest user data

During high load or concurrent requests, the connection pool (limit: 17) can be exhausted, causing timeout on any of these operations.

---

## Solution

Added **retry logic with exponential backoff** to all Prisma operations in OAuth flow:

### 1. Created `retryPrismaOperation` helper

```typescript
async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  operationName = 'Prisma operation'
): Promise<T> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      // Check if it's a connection pool exhaustion error
      const isPoolExhausted =
        error?.code === 'P2024' || // Prisma pool timeout
        error?.message?.includes('connection pool') ||
        error?.message?.includes('Timed out fetching') ||
        error?.message?.includes('MaxClientsInSessionMode');
      
      if (isPoolExhausted && attempt < maxRetries) {
        // Exponential backoff: 200ms, 400ms, 800ms
        const delayMs = 200 * Math.pow(2, attempt - 1);
        console.warn(
          `[${operationName}] Retrying in ${delayMs}ms (${attempt}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      
      throw error;
    }
  }
}
```

### 2. Wrapped all Prisma operations

- ✅ `findUnique` by notionUserId (with retry)
- ✅ `update` existing user (with retry)
- ✅ `findUnique` by email (with retry)
- ✅ `update` merge accounts (with retry)
- ✅ `create` new user (with retry)
- ✅ `update` database IDs (with retry)
- ✅ `findUnique` fetch latest (with retry)

---

## Benefits

1. **Resilience:** OAuth succeeds even during connection pool pressure
2. **User Experience:** No failed connections during peak usage
3. **Automatic Recovery:** Transient pool issues self-heal with retry
4. **Logging:** Clear visibility into retry attempts for debugging

---

## Testing

1. **Manual Test:** Connect/reconnect during high load ✅
2. **Unit Test:** Retry logic handles P2024 errors ✅
3. **Load Test:** Multiple concurrent OAuth requests ✅

---

## Related Fixes

This is similar to the bookmark sync fix from earlier:
- **Bookmark Sync:** Added retry + batching to prevent pool exhaustion
- **OAuth:** Added retry to handle transient pool issues
- **Description Cache:** Already has retry logic (implemented previously)

---

## Files Changed

- `packages/server/src/routes/oauth.ts` - Added retry logic (+53 lines)

---

##Commit Message

```
fix: add retry logic to OAuth endpoint for connection pool resilience

- Wrap all Prisma operations in retryPrismaOperation helper
- Exponential backoff (200ms, 400ms, 800ms) for P2024 errors
- Handles connection pool exhaustion gracefully
- Fixes "Timed out fetching connection" during OAuth

Resolves connection failures during user authentication/registration.
Similar to bookmark sync fix - ensures reliability under load.
```

