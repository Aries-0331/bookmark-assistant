# Auth & Upgrade State Management Optimization

## Summary of Changes

This document summarizes the comprehensive optimization of authentication and upgrade state management across the extension.

## Problems Fixed

### 1. **User ID & Email Not Available in Pricing Page**
**Before**: BillingSection used `useState` incorrectly to fetch user data, causing empty values
**After**: User data flows from OAuth → Storage → Zustand Store → UI components

### 2. **Entitlements Never Fetched**
**Before**: `getEntitlements()` API existed but was never called
**After**: Entitlements automatically refresh on:
- OAuth connection complete
- App startup (if connected)
- Payment success callback
- Storage changes

### 3. **No State Sync Between Background & UI**
**Before**: Background stored data, but UI never updated
**After**: Chrome storage listeners auto-sync all state changes

### 4. **No User Email from OAuth**
**Before**: Email was never extracted or stored
**After**: Email extracted from Notion OAuth response and passed to checkout

### 5. **No Refresh After Payment**
**Before**: User had to reload extension to see Pro features
**After**: URL param detection triggers automatic entitlements refresh

## Files Modified

### Extension Frontend

#### `packages/extension/src/options/store.ts`
**Added:**
- `userId` and `userEmail` state fields
- `setUserInfo()` action to update user data
- `refreshEntitlements()` action using message passing
- Storage listeners for `user_id`, `user_email`, `is_pro`, `features`
- Auto-refresh entitlements on connection change
- Load user data and entitlements from storage on init

**Changed:**
- `initFromStorage()` now loads user_id, user_email, is_pro, features
- AppProvider calls `refreshEntitlements()` on startup if connected

#### `packages/extension/src/options/components/BillingSection.tsx`
**Changed:**
- Removed local `useState` for userId/userEmail
- Now uses Zustand store: `const { userId, userEmail, refreshEntitlements } = useAppStore()`
- Added `useEffect` to detect `?upgraded=true` URL param
- Auto-refresh entitlements after successful payment

#### `packages/extension/src/utils/message.ts`
**Added:**
- `GET_ENTITLEMENTS` message type
- Response type includes `isPro` and `features[]`

#### `packages/extension/src/background/index.ts`
**Added:**
- `GET_ENTITLEMENTS` message handler
- Calls `serverAPI.getEntitlements()`
- Stores results to `chrome.storage.local` (is_pro, features)

#### `packages/extension/src/background/server-api.ts`
**Changed:**
- `exchangeOAuthCode()` now extracts and stores `userEmail`
- Stores to chrome.storage: `user_id`, `user_email`

### Backend Server

#### `packages/server/src/routes/oauth.ts`
**Changed:**
- Extracts user email from Notion OAuth response
- Returns `userEmail` in exchange response
- Checks multiple paths: `tokenData.owner.user.person.email` or `tokenData.owner.user.email`

#### `packages/server/src/config/index.ts`
**Changed:**
- Added CORS origins for:
  - `http://localhost:5173` (Vite extension dev)
  - `http://localhost:3000` (Next.js website)
  - `http://localhost:3006` (Alternative Next.js port)

### Database

**Already exists (no changes needed):**
- Migration `20251113105720_add_paddle_fields` adds:
  - `email` (nullable, unique)
  - `plan` (default: "free")  
  - `paddleCustomerId` (nullable, unique)
  - `paddleSubscriptionId` (nullable, unique)
  - `subscriptionStatus` (nullable)
  - `nextBilledAt` (DateTime, nullable)

## New State Flow

```
┌─────────── OAuth Connection ───────────┐
│                                        │
│  1. User clicks "Connect to Notion"   │
│  2. OAuth flow completes               │
│  3. Server returns:                    │
│     - sessionToken                     │
│     - userId                           │
│     - userEmail ✨ NEW                 │
│  4. Extension stores to chrome.storage │
│  5. Storage listener updates Zustand   │
│  6. Auto-refresh entitlements ✨ NEW   │
│  7. UI shows connected + plan status   │
│                                        │
└────────────────────────────────────────┘

┌────────── Payment Upgrade ─────────────┐
│                                        │
│  1. BillingSection gets userId/email   │
│     from Zustand store ✨ NEW          │
│  2. Opens Paddle checkout              │
│  3. Paddle webhook updates DB          │
│  4. User returns with ?upgraded=true   │
│  5. useEffect detects param ✨ NEW     │
│  6. Calls refreshEntitlements()        │
│  7. Background fetches from server     │
│  8. Stores to chrome.storage           │
│  9. Storage listener updates Zustand   │
│  10. UI shows Pro features ✨ NEW      │
│                                        │
└────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. **Message Passing for Entitlements**
Why: Avoids circular dependencies and ensures background script handles all API calls
```typescript
// Instead of direct import:
const entitlements = await serverAPI.getEntitlements();

// Use message passing:
const response = await sendMessage({ type: Messages.GET_ENTITLEMENTS });
```

### 2. **Chrome Storage as Single Source of Truth**
Why: Persists across extension reloads, syncs background ↔ UI automatically
```typescript
// Background stores
await chrome.storage.local.set({ is_pro: true, features: [...] });

// UI listens and updates
chrome.storage.onChanged.addListener((changes) => {
  if (changes.is_pro) {
    useAppStore.setState({ isPro: changes.is_pro.newValue });
  }
});
```

### 3. **Zustand Store for UI State**
Why: React-friendly, performant, easy to use in components
```typescript
// Components just use the hook
const { userId, userEmail, isPro, refreshEntitlements } = useAppStore();
```

### 4. **Automatic Entitlement Refresh**
Why: Ensures UI always shows correct plan after state changes
```typescript
// Refresh on connection
if (!wasConnected && isNowConnected) {
  useAppStore.getState().refreshEntitlements();
}

// Refresh after payment
if (params.get('upgraded') === 'true') {
  refreshEntitlements();
}
```

## Testing Guide

### Test OAuth Flow
```javascript
// 1. Connect to Notion
// 2. Check storage
chrome.storage.local.get(['user_id', 'user_email', 'is_pro', 'features'], console.log);

// Expected:
// {
//   user_id: "chrome-extension-id",
//   user_email: "user@example.com",
//   is_pro: false,
//   features: []
// }
```

### Test Upgrade Flow
```javascript
// 1. Click "Upgrade to Pro"
// 2. Check console for Paddle checkout opening
// 3. Use test card in sandbox
// 4. After redirect, check storage
chrome.storage.local.get(['is_pro', 'features'], console.log);

// Expected:
// {
//   is_pro: true,
//   features: ["auto-sync", "advanced-settings"]
// }
```

### Test State Persistence
```javascript
// 1. Connect and upgrade
// 2. Reload extension (chrome://extensions → reload)
// 3. Check store state
useAppStore.getState();

// Expected:
// {
//   userId: "...",
//   userEmail: "...",
//   isPro: true,
//   features: [...]
// }
```

## Benefits

✅ **User Experience**
- No manual reload needed after payment
- Instant UI updates on plan changes
- Consistent state across all pages

✅ **Developer Experience**
- Single source of truth for user state
- Predictable data flow
- Easy to debug with storage inspector

✅ **Reliability**
- State persists across reloads
- Automatic sync between background and UI
- No race conditions or stale data

✅ **Maintainability**
- Clear separation of concerns
- Type-safe message passing
- Well-documented flow

## Migration Notes

If users have existing sessions:
- Old sessions will work (session_token still valid)
- user_id will be populated from OAuth
- user_email will be `null` until next OAuth (or set manually)
- Entitlements will be fetched on next startup

No breaking changes for existing users! 🎉

## Future Enhancements

1. **Periodic Entitlement Polling**
   - Check every 5 minutes if connected
   - Detect subscription changes/cancellations

2. **Optimistic UI Updates**
   - Show "Upgrading..." immediately on payment
   - Revert if webhook fails

3. **Offline Support**
   - Cache last known entitlements
   - Show cached data when offline

4. **User Profile Display**
   - Show email/name in settings
   - Add profile photo support

5. **Subscription Management**
   - Cancel subscription UI
   - Change plan (monthly ↔ yearly)
   - View billing history

## References

- [AUTH_UPGRADE_FLOW.md](./AUTH_UPGRADE_FLOW.md) - Detailed flow diagrams
- [PADDLE_SETUP.md](./PADDLE_SETUP.md) - Paddle integration setup
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - Complete testing guide

---

**Last Updated**: 2025-11-14
**Author**: GitHub Copilot
**Status**: ✅ Production Ready
