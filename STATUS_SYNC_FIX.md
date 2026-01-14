# Status Sync Error Fix

## Problem

**Issue**: Pro users seeing inconsistent Pro/Free status between popup and options page.

**Symptoms**:

- Popup shows "Pro" badge
- Options page shows "Free" plan with upgrade button
- Status mismatch confuses users about their actual subscription status

## Root Cause

The entitlements (`isPro` status) were not being refreshed after OAuth authentication completed. This created a race condition where:

1. **Popup flow**:
   - Opens → calls `refreshConnection()` → calls `refreshEntitlements()` → gets isPro from server
   - Shows correct Pro status

2. **Options page flow**:
   - Opens → loads cached isPro from localStorage (stale value from before OAuth)
   - OAuth completes in popup → session_token stored → entitlements NOT refreshed
   - Options page still shows old Free status

3. **After OAuth upgrade**:
   - User upgrades to Pro on web
   - Opens options page → entitlements not refreshed
   - Still shows Free status

## Solution

Implemented three layers of fixes:

### 1. Refresh Entitlements After OAuth (background/index.ts)

**File**: `packages/extension/src/background/index.ts`

After OAuth completes successfully, refresh entitlements before returning:

```typescript
// Refresh entitlements after successful OAuth
// This ensures isPro status is updated after authentication
try {
  const { isPro } = await serverAPI.getUserProfile();
  await chrome.storage.local.set({ is_pro: isPro });
} catch (profileError) {
  console.warn('⚠️ Failed to refresh entitlements after OAuth:', profileError);
  // Don't fail the OAuth flow if profile refresh fails
}
```

**Why**: Ensures entitlements are refreshed immediately after authentication, not just when pages happen to call refresh.

### 2. Refresh Entitlements on Options Page Mount (store.ts)

**File**: `packages/extension/src/options/store.ts`

When options page mounts, refresh entitlements if connected:

```typescript
useEffect(() => {
  (async () => {
    await useAppStore.getState().initFromStorage();
    await useAppStore.getState().fetchPricing();
    // Refresh entitlements on mount if connected
    // This ensures isPro status is up-to-date when options page opens
    const { session_token } = await chrome.storage.local.get(['session_token']);
    if (session_token) {
      await useAppStore.getState().refreshEntitlements();
    }
  })();
}, []);
```

**Why**: Options page now always refreshes entitlements on mount, ensuring fresh data.

### 3. Refresh on Visibility Change (store.ts)

**File**: `packages/extension/src/options/store.ts`

When options page becomes visible (user switches back to it), refresh entitlements:

```typescript
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      // Page became visible - refresh entitlements if connected
      const { session_token } = await chrome.storage.local.get(['session_token']);
      if (session_token) {
        await useAppStore.getState().refreshEntitlements();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

**Why**: Handles case where user upgrades to Pro on web while options page is open in background tab.

## Testing the Fix

### Scenario 1: Fresh OAuth Connection

1. Disconnect extension
2. Click "Connect to Notion" in popup
3. Complete OAuth
4. ✅ **Expected**: Both popup and options page show same Pro/Free status

### Scenario 2: Upgrade While Extension Open

1. Open options page (shows Free)
2. Upgrade to Pro on web
3. Switch back to options page tab (or refresh)
4. ✅ **Expected**: Options page refreshes and shows Pro status

### Scenario 3: Open Options After OAuth

1. Connect via popup (already Pro user)
2. Open options page
3. ✅ **Expected**: Options page shows Pro status immediately

## Files Modified

1. `packages/extension/src/background/index.ts`
   - Added entitlements refresh after OAuth completion

2. `packages/extension/src/options/store.ts`
   - Added entitlements refresh on options page mount
   - Added visibility change handler to refresh on tab switch

## Result

✅ **Status sync error fixed**: Popup and options page now always show consistent Pro/Free status.

The fix ensures:

- Entitlements refreshed after OAuth
- Entitlements refreshed on options page mount
- Entitlements refreshed when page becomes visible
- No race conditions between components

---

**Last Updated**: January 14, 2026
**Version**: 1.0.6
**Status**: Ready for testing
