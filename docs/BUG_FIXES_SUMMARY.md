# Bug Fixes Summary

> **Consolidated documentation for major bug fixes and their resolutions**

---

## 🐛 Bug #1: Disconnect/Reconnect Sync Failure

**Date:** Dec 2025  
**Impact:** HIGH - Users couldn't sync after disconnecting and reconnecting

### Problem

When user disconnected and then reconnected Notion:
1. New template page was created in Notion
2. Clicking "Sync Now" did nothing - sync failed silently
3. Extension appeared connected but sync was broken

### Root Causes

1. **Selective Logout Issue**
   - Logout cleared ALL storage including `oauth_template_database_id`
   - On reconnect, new template created but old database ID references lost

2. **Server Database Resolution Missing**
   - Server had `duplicatedTemplateId` but no logic to recover `notionDatabaseId`
   - Sync endpoint required `notionDatabaseId` but it was NULL

3. **UI State Desync**
   - Zustand store not immediately reset on disconnect
   - UI showed stale "Connected" status even after logout

### Fixes Applied

#### 1. Selective Logout (Extension)

**File:** `packages/extension/src/background/server-api.ts`

```typescript
async logout(): Promise<void> {
  // Clear only auth-related keys, preserve oauth_template_database_id
  const keysToRemove: (keyof ChromeLocalCache)[] = [
    'session_token',
    'user_id',
    'user_email',
    'is_pro',
    'last_sync',
    // ... other volatile keys
    // NOT removing: oauth_template_database_id
  ];
  await removeCache(keysToRemove);
}
```

#### 2. Server Database Recovery

**File:** `packages/server/src/routes/bookmarks.ts`

```typescript
if (!userData.notionDatabaseId && userData.duplicatedTemplateId) {
  console.log('[Bookmark Sync] Attempting database recovery...');
  const resolved = await notionService.resolveDatabaseFromTemplate(
    userData.duplicatedTemplateId,
    userData.notionAccessToken
  );
  verifiedDatabaseId = resolved.databaseId;
  await userPrisma.update(userData.id!, {
    notionDatabaseId: verifiedDatabaseId,
    templateDatabaseId: userData.duplicatedTemplateId,
  });
}
```

#### 3. UI State Synchronization

**File:** `packages/extension/src/options/components/ConnectionSection.tsx`

```typescript
const onDisconnect = async () => {
  await sendMessage({ type: Messages.LOGOUT });
  
  // Immediately reset Zustand store
  useAppStore.setState({
    isConnected: false,
    isPro: false,
    userId: '',
    // ... reset all state
  });
}
```

---

## 🐛 Bug #2: OAuth Connection Pool Exhaustion

**Date:** Dec 2025  
**Impact:** MEDIUM - OAuth failed intermittently with "max clients reached"

### Problem

During OAuth exchange:
```
PrismaClientUnknownRequestError: FATAL: MaxClientsInSessionMode: max clients reached
```

### Root Cause

Multiple concurrent Prisma operations during OAuth flow exhausted connection pool.

### Fix Applied

**File:** `packages/server/src/routes/oauth.ts`

```typescript
// Helper for Prisma operations with retry logic
async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      const isPoolExhausted = 
        error?.code === 'P2024' ||
        error?.message?.includes('MaxClientsInSessionMode');
      
      if (isPoolExhausted && attempt < maxRetries) {
        const delayMs = 200 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

// Apply to all Prisma operations
const user = await retryPrismaOperation(
  () => prisma.user.findUnique({ where: { notionUserId } })
);
```

---

## 🐛 Bug #3: OAuth Network Errors (ECONNRESET)

**Date:** Dec 2025  
**Impact:** MEDIUM - OAuth failed with "fetch failed" errors

### Problem

```
OAuth exchange network error (TypeError:ECONNRESET): fetch failed
```

### Root Cause

Transient network errors when communicating with Notion API during OAuth flow.

### Fix Applied

**File:** `packages/server/src/services/notion.ts`

```typescript
async function retryNetworkOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      const isNetworkError =
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.includes('fetch failed');
      
      if (isNetworkError && attempt < maxRetries) {
        const delayMs = 500 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

// Applied to OAuth methods
async exchangeOAuthCode(code: string, redirectUri: string): Promise<any> {
  return retryNetworkOperation(async () => {
    // ... fetch logic ...
  });
}
```

---

## 🐛 Bug #4: Popup UI Layout Shift

**Date:** Dec 2025  
**Impact:** LOW - Visual glitch when "Upgrade to Pro" button appeared

### Problem

When user connected to Notion, "Upgrade to Pro" button appeared for free users, causing popup to expand vertically and leave white space below settings button.

### Fix Applied

**File:** `packages/extension/src/popup/PopupComponent.tsx`

**Solution:** Removed "Upgrade to Pro" button from popup entirely, kept only on options page.

```typescript
// Simplified popup - no upgrade button
{!isConnected ? (
  <button onClick={handleConnect}>Connect to Notion</button>
) : (
  <button onClick={handleSync}>Sync Now</button>
)}
// Settings button always at bottom
<button onClick={openSettings}>Settings & Billing</button>
```

---

## 📊 Fix Summary

| Bug | Severity | Status | Files Changed |
|-----|----------|--------|---------------|
| Disconnect/Reconnect | HIGH | ✅ Fixed | 3 files |
| OAuth Connection Pool | MEDIUM | ✅ Fixed | 1 file |
| OAuth Network Errors | MEDIUM | ✅ Fixed | 1 file |
| Popup UI Layout | LOW | ✅ Fixed | 1 file |

---

## 🧪 Testing Recommendations

1. **Disconnect/Reconnect:**
   - Disconnect from Notion
   - Reconnect with same account
   - Verify sync works immediately

2. **OAuth Reliability:**
   - Test OAuth flow 10+ times
   - Should succeed consistently

3. **Popup UI:**
   - Connect as free user
   - Verify no layout shifts
   - Check settings button position

---

**Related Documentation:**
- Connection Pool: `docs/CONNECTION_POOL_ANALYSIS.md`
- Error Monitoring: `docs/ERROR_MONITORING_SIMPLE.md`

