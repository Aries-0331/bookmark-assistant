# Bug Analysis: Disconnect → Reconnect → Sync Failure

**Date:** December 27, 2025
**Status:** 🔴 Critical - Sync fails after reconnection
**Root Cause:** Incomplete cache cleanup during logout

---

## 🐛 Problem Description

**User Flow:**

1. User disconnects from Notion (clicks "Disconnect" button)
2. User reconnects to Notion (OAuth flow, creates new template page in Notion)
3. User clicks "Sync Now"
4. **Sync fails silently** - no bookmarks are synced

**Expected Behavior:**
After reconnection, sync should work immediately with the new template database.

**Actual Behavior:**
Sync fails because the server cannot find or access the database.

---

## 🔍 Root Cause Analysis

### 1. **Logout clears ALL local storage**

File: `packages/extension/src/background/server-api.ts:243-251`

```typescript
async logout(): Promise<void> {
  try {
    await this.makeRequest('/api/user/logout', { method: 'POST', timeoutMs: 5000 });
  } catch {}
  this.sessionToken = null;

  // Clear all local storage to ensure no user data persists
  await chrome.storage.local.clear(); // ❌ THIS IS THE PROBLEM
}
```

**Issue:** `chrome.storage.local.clear()` removes **everything**, including:

- ✅ `session_token` (correct - should be cleared)
- ✅ `user_id` (correct - should be cleared)
- ✅ `user_email` (correct - should be cleared)
- ❌ **`oauth_template_database_id`** (WRONG - needed for reconnection!)
- ❌ **Description cache** (problematic - loses user's cached data)
- ❌ **Pricing cache** (problematic - forces refetch)
- ❌ **User preferences** (problematic - resets settings)

### 2. **OAuth stores template database ID in local storage**

File: `packages/extension/src/background/server-api.ts:140-150`

```typescript
const toStore: Record<string, any> = {
  session_token: response.sessionToken,
  user_id: response.userId,
};
if (response.userEmail) {
  toStore.user_email = response.userEmail;
}
if (response.templateDatabaseId) {
  toStore.oauth_template_database_id = response.templateDatabaseId; // ✅ Stored
}
await chrome.storage.local.set(toStore);
```

### 3. **Server relies on database IDs being set**

File: `packages/server/src/routes/bookmarks.ts:120-137`

```typescript
const effectiveDataSourceId = userData.notionDataSourceId;
if (!effectiveDataSourceId) {
  return res.status(400).json({
    error: 'Bad Request',
    message: 'dataSourceId is required for sync...',
  });
}

// Check if notionDatabaseId exists
if (!userData.notionDatabaseId) {
  console.error('[Bookmark Sync] ❌ No notionDatabaseId found in user data');
  return res.status(400).json({
    error: 'Database Not Configured',
    message: 'No database ID found. Please reconnect your Notion integration.',
  });
}
```

### 4. **The Chain of Failure**

```
User disconnects
  └─> logout() called
      └─> chrome.storage.local.clear() removes EVERYTHING
          └─> oauth_template_database_id is lost ❌
  
User reconnects
  └─> OAuth flow completes
      └─> Server stores new database IDs in database ✅
      └─> Extension stores session_token ✅
      └─> Extension stores oauth_template_database_id ✅
  
User clicks sync
  └─> Extension sends sync request with session_token
      └─> Server looks up user in database
          └─> Server checks userData.notionDatabaseId
              └─> ⚠️ If server hasn't properly set this during OAuth...
              └─> ❌ SYNC FAILS: "Database Not Configured"
```

---

## 🎯 Why This Happens

The issue is **timing and state consistency**:

1. **During OAuth** (file: `packages/server/src/routes/oauth.ts:118-139`):

   - Server receives `duplicated_template_id` from Notion
   - Server tries to resolve it to a `databaseId`
   - If resolution fails (network error, API timeout, etc.), the user record is created but `notionDatabaseId` remains `null`
2. **During Sync**:

   - Server checks if `notionDatabaseId` exists
   - If `null`, sync fails with "Database Not Configured"
   - Extension has no way to recover automatically
3. **The Missing Link**:

   - Extension stores `oauth_template_database_id` locally
   - But this value is **never sent back to server** during sync
   - Server cannot use it to recover from missing `notionDatabaseId`

---

## 🔧 Solutions

### Solution 1: **Selective Logout Cleanup** (RECOMMENDED)

Only clear authentication-related data, preserve user preferences and cache.

**Changes needed:**

- ✅ Update `logout()` to selectively remove keys
- ✅ Add `oauth_template_database_id` to cache schema
- ✅ Preserve description cache, pricing cache, preferences

### Solution 2: **Server-Side Database Recovery**

Make sync endpoint more resilient by recovering database ID if missing.

**Changes needed:**

- ✅ Server checks if `notionDatabaseId` is missing
- ✅ If missing, attempt to resolve from `duplicatedTemplateId`
- ✅ Update user record with recovered database ID

### Solution 3: **Extension Sends Template ID During Sync**

Include `oauth_template_database_id` in sync requests for server-side recovery.

**Changes needed:**

- ✅ Extension reads `oauth_template_database_id` from storage
- ✅ Include it in sync request payload
- ✅ Server uses it as fallback if `notionDatabaseId` is missing

---

## 🛠️ Recommended Fix (Multi-Layered)

Implement **all three solutions** for maximum robustness:

### Layer 1: Selective Logout (Prevents the problem)

```typescript
// packages/extension/src/background/server-api.ts
async logout(): Promise<void> {
  try {
    await this.makeRequest('/api/user/logout', { method: 'POST', timeoutMs: 5000 });
  } catch {}
  this.sessionToken = null;

  // Clear ONLY authentication-related data
  const keysToRemove = [
    'session_token',
    'user_id',
    'user_email',
    'is_pro',
    'purchase_type',
    'last_sync',
    'last_sync_at',
    'last_sync_summary',
    'last_sync_count',
    'last_sync_fingerprint',
    'last_sync_hash',
    'sync_in_progress',
    'is_connecting',
    'auto_sync_enabled',
    'auto_sync_interval_minutes',
  ];
  
  await chrome.storage.local.remove(keysToRemove);
  
  // Preserve:
  // - oauth_template_database_id (needed for reconnection)
  // - description_cache_* (user's cached descriptions)
  // - cached_pricing (avoid unnecessary refetch)
}
```

### Layer 2: Server Recovery (Recovers from the problem)

```typescript
// packages/server/src/routes/bookmarks.ts
if (!userData.notionDatabaseId && userData.duplicatedTemplateId) {
  console.log('[Bookmark Sync] 🔄 Attempting database recovery from template...');
  try {
    const resolved = await notionService.resolveDatabaseFromTemplate(
      userData.duplicatedTemplateId,
      userData.notionAccessToken
    );
    // Update user record
    await userPrisma.update(userData.id!, {
      notionDatabaseId: resolved.databaseId,
      notionDataSourceId: resolved.dataSourceId,
    });
    userData.notionDatabaseId = resolved.databaseId;
    userData.notionDataSourceId = resolved.dataSourceId;
  } catch (e) {
    console.error('[Bookmark Sync] ❌ Database recovery failed:', e);
    return res.status(400).json({
      error: 'Database Not Configured',
      message: 'Failed to recover database configuration. Please reconnect.',
    });
  }
}
```

### Layer 3: Extension Sends Template ID (Belt and suspenders)

```typescript
// packages/extension/src/background/sync.ts
export async function syncAllBookmarksToNotion() {
  // ... existing code ...
  
  // Include template ID for server-side recovery
  const { oauth_template_database_id } = await chrome.storage.local.get(['oauth_template_database_id']);
  
  const result = await serverAPI.syncBookmarks(formatted as any, {
    templateDatabaseId: oauth_template_database_id, // NEW: send template ID
  });
  
  // ... rest of code ...
}
```

---

## 🚨 Other Potential Issues Found

### 1. **Description Cache is Lost on Logout**

**Current behavior:** `chrome.storage.local.clear()` removes all description cache.

**Impact:**

- User has 1000 cached descriptions (accumulated over weeks)
- User disconnects and reconnects
- All cache is lost
- Next sync requires re-fetching 1000 descriptions (slow, expensive)

**Fix:** Preserve description cache during logout.

### 2. **Auto-sync Settings Reset on Logout**

**Current behavior:** `auto_sync_enabled` is cleared on logout.

**Impact:**

- User has Pro plan with auto-sync enabled
- User disconnects and reconnects
- Auto-sync is disabled (user must re-enable it)

**Fix:** Preserve auto-sync settings during logout.

### 3. **No User Feedback on Sync Failure**

**Current behavior:** If sync fails due to missing database, error message is vague.

**Impact:**

- User doesn't know what went wrong
- User doesn't know how to fix it
- Support burden increases

**Fix:** Add user-friendly error messages with actionable steps.

### 4. **Zustand Store Not Updated After Logout**

**Current behavior:** `chrome.storage.local.clear()` clears storage, but Zustand store retains old values until next refresh.

**Impact:**

- UI shows stale state after logout
- User might see "connected" status briefly
- Confusing UX

**Fix:** Reset Zustand store state on logout.

---

## ✅ Testing Checklist

After implementing fixes, test:

1. **Happy Path:**

   - [ ] Connect → Sync → Works ✅
2. **Disconnect/Reconnect:**

   - [ ] Connect → Sync → Disconnect → Reconnect → Sync → Works ✅
3. **Cache Preservation:**

   - [ ] Connect → Sync (cache descriptions) → Disconnect → Reconnect → Sync → Cache still exists ✅
4. **Settings Preservation:**

   - [ ] Enable auto-sync → Disconnect → Reconnect → Auto-sync still enabled ✅
5. **Clean Slate:**

   - [ ] After logout, no authentication data remains ✅
   - [ ] After logout, non-sensitive data is preserved ✅
6. **Error Handling:**

   - [ ] If server can't find database, show helpful error message ✅
   - [ ] If recovery fails, show actionable steps ✅

---

## 📝 Priority

**Severity:** 🔴 **Critical**
**User Impact:** High - Blocks core functionality after reconnection
**Fix Complexity:** Low - Well-understood, straightforward changes
**Estimated Time:** 2-3 hours

**Recommendation:** Fix immediately before Chrome Web Store launch.

---

## 🎯 Next Steps

1. ✅ Implement selective logout (Layer 1)
2. ✅ Add server-side recovery (Layer 2)
3. ✅ Update cache schema to include `oauth_template_database_id`
4. ✅ Add comprehensive tests
5. ✅ Test disconnect/reconnect flow end-to-end
6. ✅ Update documentation
