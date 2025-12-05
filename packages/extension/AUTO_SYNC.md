# Auto-Sync Feature

The auto-sync feature automatically synchronizes your bookmarks with Notion at configured intervals.

## Implementation Overview

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

## User Flow

1. **User enables auto-sync** (Pro users only):
   - Toggle switch in Sync Settings section
   - `setAutoSync(true)` called in store
   - Message sent to background: `SCHEDULE_AUTO_SYNC`
   - Background creates alarm with configured interval

2. **User changes interval**:
   - Input field updates `intervalHours`
   - `saveSyncSettings()` called on blur
   - If auto-sync enabled, alarm is rescheduled

3. **Alarm fires**:
   - Chrome triggers `chrome.alarms.onAlarm` event
   - Auto-sync listener checks if sync is enabled
   - Verifies no sync is already in progress
   - Calls `performBookmarkSync()` to sync bookmarks
   - Next alarm scheduled automatically (periodic alarm)

4. **Extension restarts**:
   - `initFromStorage()` loads saved settings
   - If auto-sync was enabled, alarm is rescheduled
   - Preserves user's sync schedule across browser sessions

## Technical Details

### Alarm Scheduling

```typescript
chrome.alarms.create('bookmarks-auto-sync', {
  periodInMinutes: intervalHours * 60,
  delayInMinutes: intervalHours * 60, // First alarm fires after one period
});
```

### State Persistence

Auto-sync state is stored in `chrome.storage.local`:

- `auto_sync_enabled`: boolean
- `auto_sync_interval_minutes`: number
- `sync_interval_hours`: number

### Conflict Prevention

Before triggering auto-sync, the scheduler checks:

1. Auto-sync is still enabled in storage
2. No manual sync is currently in progress (`sync_in_progress` flag)

### Error Handling

- Failed syncs don't disable the alarm (retry next period)
- Rate limit errors (429) are handled gracefully
- Daily limit errors prevent unnecessary sync attempts

## Testing

1. **Enable auto-sync** as Pro user
2. **Set interval** to minimum (6 hours)
3. **Wait for first alarm** (check in `chrome://extensions` → "Inspect views: Service Worker" → Console)
4. **Check logs** for "⏰ Auto-sync alarm triggered"
5. **Verify sync** completed successfully
6. **Restart browser** and confirm alarm persists
7. **Test catch-up strategy**: Close browser past sync interval, reopen, verify immediate sync

## Test Coverage

The auto-sync feature has comprehensive unit test coverage:

- ✅ 7 passing tests in `features.spec.ts`
- ✅ Scheduling, disabling, minimum intervals
- ✅ Catch-up strategy (immediate sync if overdue)
- ✅ Partial delay calculation (if not yet overdue)

Run tests: `pnpm test` or `pnpm test:coverage`

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
