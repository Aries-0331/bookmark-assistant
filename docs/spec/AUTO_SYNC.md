# Auto-Sync Feature

The auto-sync feature automatically synchronizes your bookmarks with Notion at configured intervals.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Implementation Components](#implementation-components)
3. [Flow Diagrams](#flow-diagrams)
4. [User Flow](#user-flow)
5. [Technical Details](#technical-details)
6. [Testing](#testing)
7. [Debugging](#debugging)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Chrome Extension (Auto-Sync)                       │
│  ┌──────────────────┐    ┌─────────────────────┐    │
│  │  Options Page    │    │  Background Worker  │    │
│  │  (React UI)      │◄──►│  (Service Worker)   │    │
│  │  - Toggle ON/OFF │    │  - Scheduler        │    │
│  │  - Set Interval  │    │  - Alarm Listener   │    │
│  │  - View Status   │    │  - Sync Trigger     │    │
│  └──────────────────┘    └─────────────────────┘    │
│         │                           │               │
│         │  chrome.storage.onChanged │               │
│         └───────────────────────────┘               │
└─────────────────────────────────────────────────────┘
              │                     │
              │ Schedule Request    │ Periodic Sync
              ▼                     ▼
┌─────────────────────────────────────────────────────┐
│  Chrome Platform APIs                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │ chrome.      │  │ chrome.      │  │ Bookmark │   │
│  │ alarms       │  │ storage      │  │ Sync     │   │
│  │ - Create     │  │ - Persist    │  │ Logic    │   │
│  │ - Clear      │  │ - Restore    │  │          │   │
│  │ - Fire Event │  │ - Listen     │  │          │   │
│  └──────────────┘  └──────────────┘  └──────────┘   │
└─────────────────────────────────────────────────────┘
              │                     │
              │ Alarm Triggers      │ Update State
              ▼                     ▼
       ┌─────────────┐      ┌─────────────┐
       │  Notion API │      │  Extension  │
       │  (Sync)     │      │  Storage    │
       └─────────────┘      └─────────────┘
```

**Flow:**

1. User toggles auto-sync ON in Options UI
2. Store sends `SCHEDULE_AUTO_SYNC` message to background
3. Background worker calls `scheduleAutoSync()` → creates Chrome alarm
4. Alarm fires periodically (every 6-24 hours based on plan)
5. Listener checks storage state, triggers `performBookmarkSync()`
6. Bookmarks synced to Notion API
7. Storage updated with `last_sync` timestamp
8. UI listens to storage changes and updates display

---

## Implementation Components

### Components

1. **Auto-Sync Scheduler** (`src/background/auto-sync.ts`)
   - Manages Chrome Alarms API for background scheduling
   - Creates/clears periodic alarms based on user settings
   - Triggers bookmark sync when alarm fires
   - Prevents duplicate syncs and respects rate limits

2. **Background Service Worker** (`src/background/index.ts`)
   - Registers alarm listener on startup
   - Executes bookmark sync via `performBookmarkSync()` function
   - Handles SCHEDULE_AUTO_SYNC messages from options page

3. **Options Store** (`src/options/store.ts`)
   - Manages auto-sync state (enabled/disabled)
   - Persists interval settings to chrome.storage
   - Sends schedule messages to background worker when settings change
   - Restores alarm on extension startup

4. **Settings UI** (`src/options/components/SyncSettingsSection.tsx`)
   - Toggle switch for enabling/disabling auto-sync
   - Interval input field (respects plan limits)
   - Pro feature badge (free users see disabled state)

### Plan Limits

- **Free Plan**: 24-hour minimum interval, auto-sync disabled by default
- **Pro Plan**: 6-hour minimum interval, auto-sync enabled

### Chrome Alarms API

The extension uses `chrome.alarms` API (not `setInterval`) because:

- Service workers can't use `setInterval` (they're event-driven)
- Alarms persist across browser restarts
- Alarms are power-efficient (browser optimizes scheduling)

### Permissions

Required permissions in `manifest.json`:

```json
{
  "permissions": ["alarms", "bookmarks", "storage"]
}
```

---

---

## User Flow

### 1. Enable Auto-Sync (Pro Users Only)

**Steps:**

1. Navigate to Options → Sync Settings
2. Toggle "Auto Sync" switch to ON
3. Set desired interval (minimum 6 hours for Pro)
4. System immediately schedules first alarm

**What Happens:**

- `setAutoSync(true)` updates Zustand store
- State persisted to `chrome.storage.local`
- Message sent to background: `SCHEDULE_AUTO_SYNC`
- Background creates Chrome alarm with configured interval
- First sync scheduled for 6+ hours from now

### 2. Change Sync Interval

**Steps:**

1. Modify interval input field
2. Click outside field (blur event)
3. New interval validated and saved

**What Happens:**

- `saveSyncSettings(newValue)` called
- Interval validated against plan limits (6h min for Pro, 24h for Free)
- Persisted to storage
- If auto-sync enabled, alarm rescheduled with new interval

### 3. Alarm Fires (Background Sync)

**What Happens:**

1. Chrome triggers `chrome.alarms.onAlarm` event
2. Auto-sync listener validates:
   - Auto-sync still enabled in storage
   - No manual sync currently in progress
3. Calls `performBookmarkSync()` to sync bookmarks
4. Updates `last_sync` timestamp in storage
5. Next alarm auto-scheduled by Chrome (periodic alarm)

### 4. Browser Restart (Catch-up Strategy)

**What Happens:**

1. Service worker starts, calls `restoreAutoSync()`
2. Loads settings from storage:
   - `auto_sync_enabled`
   - `auto_sync_interval_minutes`
   - `last_sync` timestamp
3. Calculates time elapsed since last sync

**Scenarios:**

- **Overdue** (elapsed ≥ interval): Triggers immediate sync, schedules next for full interval
- **Not Overdue** (elapsed < interval): Schedules alarm for remaining time
- **Auto-sync Disabled**: Does nothing

### 5. Disable Auto-Sync

**Steps:**

1. Toggle "Auto Sync" switch to OFF

**What Happens:**

- `setAutoSync(false)` updates store
- Chrome alarm cleared immediately
- State persisted: `auto_sync_enabled: false`
- No more background syncs until re-enabled

---

---

## Technical Details

### Alarm Scheduling

```typescript
chrome.alarms.create('bookmarks-auto-sync', {
  periodInMinutes: intervalHours * 60,
  delayInMinutes: intervalHours * 60, // First alarm fires after one period
});
```

**Parameters:**

- `periodInMinutes`: How often the alarm repeats (after first trigger)
- `delayInMinutes`: When the first alarm fires (can differ from period)

**Interval Limits:**

- **Free Plan**: 24 hours minimum (1440 minutes)
- **Pro Plan**: 6 hours minimum (360 minutes)
- **Hard Floor**: 30 minutes (enforced in `scheduleAutoSync`)

### State Persistence

Auto-sync state is stored in `chrome.storage.local`:

| Key                          | Type       | Description                       |
| ---------------------------- | ---------- | --------------------------------- |
| `auto_sync`                  | boolean    | User's toggle state (from UI)     |
| `auto_sync_enabled`          | boolean    | Scheduler's active state          |
| `auto_sync_interval_minutes` | number     | Actual interval used by alarm     |
| `sync_interval_hours`        | number     | User-configured interval          |
| `last_sync`                  | ISO string | Timestamp of last successful sync |
| `sync_in_progress`           | boolean    | Prevents concurrent syncs         |

**Why Multiple Keys?**

- `auto_sync`: UI state (Zustand store syncs to this)
- `auto_sync_enabled`: Scheduler's confirmation after alarm creation
- This separation allows detecting mismatches during debugging

### Conflict Prevention

Before triggering auto-sync, the scheduler checks:

1. ✅ Auto-sync is still enabled in storage
2. ✅ No manual sync is currently in progress (`sync_in_progress` flag)
3. ✅ Service worker is active (alarm won't fire otherwise)

**Race Condition Handling:**

```typescript
const { sync_in_progress } = await chrome.storage.local.get('sync_in_progress');
if (sync_in_progress) {
  console.log('⚠️ Sync already in progress, skipping auto-sync');
  return;
}
```

### Error Handling

- **Failed Syncs**: Don't disable the alarm (retry next period)
- **Rate Limit (429)**:
  - Short retry-after (<1h): Treated as cooldown
  - Long retry-after (≥1h): Treated as daily limit
- **Network Errors**: Logged, alarm continues
- **Daily Limit**: Sets `last_sync_summary: 'limit'` to prevent retries

### Catch-up Logic (Browser Restart)

```typescript
// Calculate elapsed time since last sync
const elapsedMinutes = (now - lastSyncTime) / (1000 * 60);

if (elapsedMinutes >= intervalMinutes) {
  // OVERDUE: Trigger immediate sync
  await onSyncNeeded();
  // Schedule next for full interval
  await scheduleAutoSync(true, intervalHours, intervalMinutes);
} else {
  // NOT OVERDUE: Calculate remaining time
  const remainingMinutes = intervalMinutes - elapsedMinutes;
  await scheduleAutoSync(true, intervalHours, remainingMinutes);
}
```

**Benefits:**

- No missed syncs when browser closed overnight
- Preserves user's intended sync frequency
- Minimal delay on startup (only if overdue)

### Plan Limit Enforcement

**UI Layer** (`SyncSettingsSection.tsx`):

```typescript
const minIntervalHours = isPro ? PRO_MIN_INTERVAL_HOURS : FREE_INTERVAL_HOURS;
// Input field: min={minIntervalHours}
// Toggle: disabled={!isPro}
```

**Store Layer** (`store.ts`):

```typescript
const interval = isPro ? Math.max(PRO_MIN_INTERVAL_HOURS, userInput) : FREE_INTERVAL_HOURS;
```

**Scheduler Layer** (`auto-sync.ts`):

```typescript
const minMinutes = 30; // Absolute floor
const periodInMinutes = Math.max(minMinutes, Math.round(intervalHours * 60));
```

**Server Layer** (future): API validates entitlements before sync

---

---

## Testing

### Manual Testing Steps

1. **Enable Auto-Sync** (Pro user required)
   - Navigate to Options → Sync Settings
   - Toggle auto-sync ON
   - Set interval to 6 hours (minimum)
   - Check console: "✅ Auto-sync scheduled: every 360 minutes"

2. **Verify Alarm Creation**
   - Open DevTools: `chrome://extensions` → "Inspect views: Service Worker"
   - Run: `chrome.alarms.getAll(console.log)`
   - Verify `bookmarks-auto-sync` alarm exists

3. **Test Alarm Trigger**
   - Manually trigger: `chrome.alarms.clear('bookmarks-auto-sync')`
   - Then: `chrome.alarms.create('bookmarks-auto-sync', { delayInMinutes: 0.1 })`
   - Watch logs for "⏰ Auto-sync alarm triggered"

4. **Verify Sync Execution**
   - Check `last_sync` timestamp updated
   - Verify `sync_in_progress` returns to `false`
   - Confirm bookmarks synced to Notion

5. **Test Browser Restart**
   - Close browser completely
   - Wait 7+ hours (past 6h interval)
   - Reopen browser
   - Check logs for "⏰ Catch-up sync triggered on startup"

6. **Test Catch-up Strategy**
   - Set `last_sync` to 10 hours ago (past 6h interval)
   - Restart extension
   - Verify immediate sync triggered

7. **Test Interval Change**
   - Change interval from 6h → 12h
   - Verify alarm rescheduled
   - Run: `chrome.alarms.get('bookmarks-auto-sync', console.log)`
   - Check `periodInMinutes: 720`

### Unit Test Coverage

The auto-sync feature has **comprehensive test coverage** (7 passing tests):

```bash
pnpm test features.spec.ts
```

**Test Cases:**

✅ **scheduleAutoSync**

- Should create alarm when enabled
- Should clear alarm when disabled
- Should respect minimum interval (30 mins)
- Should support custom initial delays

✅ **restoreAutoSync** (Catch-up Strategy)

- Should do nothing if auto-sync disabled
- Should trigger immediate sync if overdue
- Should schedule partial delay if not overdue

### Integration Testing (Manual)

1. **End-to-End Flow:**

   ```
   Enable → Wait 6h → Alarm fires → Sync completes → Verify Notion
   ```

2. **Error Scenarios:**
   - Network offline during alarm trigger
   - Rate limit (429) response from server
   - Daily limit exceeded
   - Notion API unavailable

3. **Edge Cases:**
   - Free user tries to enable auto-sync (should be disabled)
   - Pro user downgrades (alarm should clear)
   - Multiple rapid interval changes
   - Browser restart during active sync

### Test Coverage Stats

- **Overall Extension**: 27% coverage
- **auto-sync.ts**: 54.9% coverage
- **store.ts**: 36.6% coverage
- **Unit Tests**: 13 passing (0 failing)

Run coverage report:

```bash
pnpm test:coverage
```

---

## Debugging

View auto-sync logs in the background service worker console:

```
chrome://extensions → "Inspect views: Service Worker"
```

Check alarm status:

```javascript
chrome.alarms.getAll((alarms) => console.log(alarms));
```

Clear alarms manually (for testing):

```javascript
chrome.alarms.clear('bookmarks-auto-sync');
```
