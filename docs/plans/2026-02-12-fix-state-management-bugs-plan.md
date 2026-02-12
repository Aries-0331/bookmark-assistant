---
title: Fix State Management - Use Storage-Driven State
type: fix
date: 2026-02-12
---

# State Management: Remove Dual State Management

## Overview

Remove dual state management in the Chrome extension by using storage-driven state instead of local useState for loading indicators.

## Problem Statement

UI components use local `useState` for loading indicators while background controls global state in `chrome.storage.local`. This creates:
1. Dual state management
2. Risk of state inconsistency
3. Finally block issues

**Solution:** Use storage-driven state - let background drive state changes, UI reacts via storage listener.

## Implementation Approach

### Step 1: Add Loading State to Background Storage

Add loading states to `chrome.storage.local` that Background manages:
- `is_syncing` - for sync operations
- `is_connecting` - for OAuth
- `is_refreshing_entitlements` - for billing refresh

### Step 2: Add Storage Keys to Zustand Store

Add these keys to `options/store.ts`:
- `isSyncing: boolean`
- `isConnecting: boolean`
- `isRefreshingEntitlements: boolean`

### Step 3: Update Storage Listener

Update `options/store.ts` to sync these new keys from storage to store.

### Step 4: Update UI Components

Replace local useState loading flags with Zustand store values:
- Read from store instead of useState
- Remove finally blocks that clear loading state

## Files to Modify

1. `packages/extension/src/background/index.ts` - Set storage state
2. `packages/extension/src/options/store.ts` - Add state keys + storage sync
3. `packages/extension/src/options/components/BillingSection.tsx` - Use store
4. `packages/extension/src/options/components/ConnectionSection.tsx` - Use store
5. `packages/extension/src/options/ErrorLog.tsx` - Use store

## Acceptance Criteria

- [x] Add loading state keys to background storage
- [x] Add loading state keys to Zustand store
- [x] Update storage listener for new keys
- [x] Update BillingSection to use store
- [x] Update ConnectionSection to use store
- [x] Verify build passes
