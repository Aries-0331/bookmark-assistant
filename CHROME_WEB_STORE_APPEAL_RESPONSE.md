# Chrome Web Store Appeal Response

## Violation Reference ID: Purple Potassium

### Issue
The extension was rejected for requesting but not using the `notifications` permission.

### Root Cause
The `notifications` permission was declared in `manifest.json` but the code that used `chrome.notifications` API was in a **legacy unused function** (`syncAllBookmarksViaServer`) that was never called in production.

### Actions Taken

#### 1. Removed Unused Permission
**File:** `packages/extension/public/manifest.json`

**Before:**
```json
"permissions": ["bookmarks", "storage", "identity", "notifications", "alarms"]
```

**After:**
```json
"permissions": ["bookmarks", "storage", "identity", "alarms"]
```

#### 2. Removed Dead Code
**File:** `packages/extension/src/background/server-api.ts`

Removed the entire `syncAllBookmarksViaServer()` function (lines 321-370) which contained:
- `chrome.notifications.create()` calls (lines 352-357, 361-366)
- This function was **never imported or called** anywhere in the codebase

**Verification:**
```bash
# Confirmed no references to this function:
grep -r "syncAllBookmarksViaServer" packages/extension/src
# Result: No matches found (except the function definition itself)
```

#### 3. Current Bookmark Sync Implementation
The extension uses `performBookmarkSync()` in `packages/extension/src/background/index.ts` (lines 217-397), which:
- Does NOT use notifications
- Handles sync through UI feedback in the popup/options page
- Updates `chrome.storage.local` state for UI to reflect sync status

### Verification of All Permissions

| Permission | Usage | Location |
|------------|-------|----------|
| `bookmarks` | ✅ Used | `background/index.ts:233` - `chrome.bookmarks.getTree()` |
| `storage` | ✅ Used | Throughout - `chrome.storage.local.get/set()` |
| `identity` | ✅ Used | `background/oauth.ts:23` - `chrome.identity.launchWebAuthFlow()` |
| `alarms` | ✅ Used | `background/auto-sync.ts:33,46,73,91,100` - Auto-sync scheduling |
| ~~`notifications`~~ | ❌ **REMOVED** | Was in unused legacy code |

### Compliance Statement

The extension now:
1. ✅ Only requests permissions that are **actively used**
2. ✅ Follows the principle of **narrowest permissions necessary**
3. ✅ Does not "future proof" with unused permissions
4. ✅ All remaining permissions are essential for core functionality:
   - **bookmarks**: Read Chrome bookmarks for sync
   - **storage**: Store user session and sync state
   - **identity**: OAuth authentication with Notion
   - **alarms**: Schedule periodic auto-sync (Pro feature)

### Resubmission Notes

**Version:** 1.0.0 → 1.0.1 (increment for resubmission)

**Changes Summary for Reviewer:**
- Removed unused `notifications` permission from manifest
- Removed dead code containing `chrome.notifications` API calls
- All remaining permissions are actively used and necessary

---

**Build Status:** ✅ Successful
**Date:** 2025-12-29
**Routing ID:** FZSL

