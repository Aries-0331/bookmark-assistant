---
title: Fix Auto-Sync Switch Styling and Refresh Button Stuck Issue
type: fix
date: 2026-03-04
status: reviewed
---

# Fix Auto-Sync Switch Styling and Refresh Button Stuck Issue

## Overview

Two bugs need to be fixed in the Bookmark Assistant options page:

1. **Switch styling**: The Auto-Sync toggle switch displays incorrectly - the parent's padding compresses the inner circular thumb element, making it appear as a line instead of a circle
2. **Refresh button stuck**: The "Refresh" button in BillingSection continues to show spinning animation indefinitely (displays "Refreshing...")

## Problem Statement

### Issue 1: Switch Styling

**Current behavior:** The Switch component's circular thumb (handle) is compressed and displays incorrectly due to parent container padding.

**Root cause:** The parent container in SyncSettingsSection has padding that affects the flex layout of the Switch component. Even though `shrink-0` is in the class, the explicit min-width may not be sufficient in certain flex contexts.

**Expected behavior:** The switch should display as a proper toggle with a circular thumb that slides left/right.

### Issue 2: Refresh Button Stuck

**Current behavior:** After clicking "Refresh" button in BillingSection, the button stays in "Refreshing..." state with spinning animation indefinitely.

**Root cause:** The `is_refreshing_entitlements` key in chrome.storage.local can get stuck in `true` state from:
- Previous page load crash
- Browser crash during refresh
- Race conditions between multiple components

**Current mitigation:** The code at store.ts lines 161-164 already clears stale state on page init, and the try/finally block (lines 264-266) ensures cleanup on both success and error.

**Expected behavior:** The refresh should complete and the button should return to "Refresh" state.

## Proposed Solution

### Fix 1: Switch Styling

The Switch already has `shrink-0` in its className, but may need additional safeguards. Try these in order:

**Step 1:** Add wrapper with `flex-shrink-0` in SyncSettingsSection.tsx:
```tsx
<div className="flex-shrink-0">
  <Switch checked={autoSync} onCheckedChange={onToggleAuto} disabled={!isPro} />
</div>
```

**Step 2:** If that doesn't work, also add explicit min-width to the Switch root (already done in previous commit).

### Fix 2: Refresh Button Stuck

The current code is already robust. Add a timeout fallback as a safety net for network issues:

```typescript
// In store.ts - refreshEntitlements function - ADD timeout fallback
refreshEntitlements: async (forceRefresh = false) => {
  // Set storage FIRST to prevent race conditions
  await chrome.storage.local.set({ is_refreshing_entitlements: true });
  set({ isRefreshingProfile: true });

  // Add timeout fallback - auto-reset after 30 seconds for network issues
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

**Note:** The existing code at lines 161-164 (clear stale state on init) and lines 264-266 (try/finally cleanup) is already correct - no changes needed there.

## Technical Considerations

- Chrome Extension MV3 - using chrome.storage.local for state persistence
- React + Zustand for state management
- Radix UI Switch component (@radix-ui/react-switch)
- Tailwind CSS for styling

## Files to Modify

1. `packages/extension/src/options/components/SyncSettingsSection.tsx` - Add wrapper with flex-shrink-0 around Switch
2. `packages/extension/src/options/store.ts` - Add timeout fallback for refreshEntitlements

## Acceptance Criteria

- [x] Auto-Sync switch displays as a proper toggle with circular thumb
- [x] Switch thumb slides left when unchecked, right when checked
- [x] Refresh button returns to "Refresh" state after completion
- [x] Refresh button handles timeout gracefully (max 30 seconds)
- [x] No console errors related to these components

## Testing

1. Load options page with Auto-Sync section visible
2. Verify switch displays correctly (circular thumb, proper size)
3. Click refresh button and verify it returns to normal state
4. Simulate crash mid-refresh and verify state clears on next load

## References

- Radix UI Switch: https://www.radix-ui.com/primitives/docs/components/switch
- Chrome Storage: https://developer.chrome.com/docs/extensions/reference/storage
