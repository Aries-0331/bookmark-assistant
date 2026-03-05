---
title: Fix isRefreshingProfile State Stuck Bug
type: fix
date: 2026-03-05
---

# Fix isRefreshingProfile State Stuck Bug

## Overview

The status banner in the BillingSection keeps displaying the spinning "Refreshing..." animation indefinitely. This is a critical bug in the state management synchronization between Chrome's `chrome.storage.local` and the Zustand store.

## Problem Statement

**Current Behavior:**
- The "Refresh" button in the BillingSection shows "Refreshing..." with a spinning animation permanently
- Manually modifying `is_refreshing_entitlements` in extension storage does not fix it
- The status banner never returns to the normal "Active" state

**Root Cause:**

The bug is in `packages/extension/src/options/store.ts`, specifically in the `refreshEntitlements` function (lines 212-218).

### The Problematic Code

```typescript
refreshEntitlements: async (forceRefresh = false) => {
  // Set storage FIRST to prevent race conditions with concurrent calls
  await chrome.storage.local.set({ is_refreshing_entitlements: true });
  set({ isRefreshingProfile: true });

  // Check after setting storage to prevent race conditions
  if (get().isRefreshingProfile && !forceRefresh) return;  // BUG HERE!
  // ...
}
```

### Why It's Broken

1. **Logic Error:** The check `if (get().isRefreshingProfile && !forceRefresh) return;` is executed AFTER setting the state to `true` on line 215.

2. **Always Returns Early:** Since we just set `isRefreshingProfile: true` on line 215, `get().isRefreshingProfile` will **always** be `true` when this check runs.

3. **Result:** Every call to `refreshEntitlements(false)` immediately returns without doing any actual work because the condition is always true.

4. **No Cleanup:** The function sets `isRefreshingProfile: true` but then returns immediately without reaching the `finally` block that would reset it to `false`.

### State Flow Diagram

```
User clicks "Refresh" (forceRefresh=true)
  ↓
Sets is_refreshing_entitlements = true in storage
  ↓
Sets isRefreshingProfile = true in Zustand store
  ↓
Check: get().isRefreshingProfile && !forceRefresh
  → true && false = false → continues to execute
  ↓
Refresh completes → finally block → sets isRefreshingProfile = false ✓

---
Next refresh call without forceRefresh (e.g., auto-refresh)
  ↓
Sets is_refreshing_entitlements = true in storage
  ↓
Sets isRefreshingProfile = true in Zustand store
  ↓
Check: get().isRefreshingProfile && !forceRefresh
  → true && true = true → RETURNS IMMEDIATELY!
  ↓
NEVER reaches finally block → isRefreshingProfile stays true forever ← BUG
```

## Proposed Solution

### Fix 1: Check BEFORE Setting State (Primary Fix)

Move the check to BEFORE setting the state to true:

```typescript
refreshEntitlements: async (forceRefresh = false) => {
  // Check if already refreshing (without force flag)
  const { is_refreshing_entitlements } = await chrome.storage.local.get(['is_refreshing_entitlements']);
  if (is_refreshing_entitlements && !forceRefresh) {
    console.log('[Entitlements] Already refreshing, skipping');
    return;
  }

  // Set storage FIRST to prevent race conditions
  await chrome.storage.local.set({ is_refreshing_entitlements: true });
  set({ isRefreshingProfile: true });

  // Add timeout fallback - auto-reset after 30 seconds
  const TIMEOUT_MS = 30000;
  const timeoutId = setTimeout(() => {
    console.warn('[Entitlements] Refresh timeout - resetting state');
    chrome.storage.local.set({ is_refreshing_entitlements: false });
    set({ isRefreshingProfile: false });
  }, TIMEOUT_MS);

  try {
    // ... existing logic ...
  } finally {
    clearTimeout(timeoutId);
    set({ isRefreshingProfile: false });
    await chrome.storage.local.set({ is_refreshing_entitlements: false });
  }
}
```

### Fix 2: Ensure State Resets on Page Load (Secondary Fix)

Keep the existing fix in `initFromStorage` to ensure stale state is cleared on page load:

```typescript
// In initFromStorage - always reset isRefreshingProfile on page load
set({ isRefreshingProfile: false });
```

## Files to Modify

1. `packages/extension/src/options/store.ts` - Fix the race condition check in `refreshEntitlements`

## Acceptance Criteria

- [ ] Refresh button returns to "Refresh" state after completion
- [ ] Multiple refresh calls work correctly without getting stuck
- [ ] Auto-refresh scenarios don't cause stuck state
- [ ] Manual storage modification is properly reflected in UI
- [ ] No console errors related to state management

## Technical Notes

- **Chrome Storage**: Acts as the single source of truth for cross-component sync
- **Zustand Store**: React state that mirrors storage for UI reactivity
- **Race Condition**: The original code had a timing bug where state was checked AFTER being set
