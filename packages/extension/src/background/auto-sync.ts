/**
 * Auto-Sync Scheduler
 *
 * Manages background sync scheduling using Chrome Alarms API.
 * This module handles:
 * - Creating/clearing sync alarms based on user settings
 * - Triggering automatic bookmark syncs at configured intervals
 * - Respecting plan limits (free: 12h min, pro: 30min min)
 */

const ALARM_NAME = 'bookmarks-auto-sync';

/**
 * Schedule or reschedule the auto-sync alarm
 * @param enabled Whether auto-sync is enabled
 * @param intervalHours Sync interval in hours
 */
export async function scheduleAutoSync(
  enabled: boolean,
  intervalHours: number,
  initialDelayMinutes?: number
): Promise<void> {
  console.log(`📅 Auto-sync schedule request: enabled=${enabled}, interval=${intervalHours}h`);

  // Clear existing alarm first
  await chrome.alarms.clear(ALARM_NAME);

  if (!enabled) {
    console.log('✅ Auto-sync disabled, alarm cleared');
    await chrome.storage.local.set({ auto_sync_enabled: false });
    return;
  }

  // Validate interval (minimum 30 minutes for pro, 12 hours for free)
  const minMinutes = 30; // Will be validated against plan limits in the caller
  const periodInMinutes = Math.max(minMinutes, Math.round(intervalHours * 60));

  // Create the alarm
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes,
    delayInMinutes:
      typeof initialDelayMinutes === 'number' ? Math.max(1, initialDelayMinutes) : periodInMinutes,
  });

  // Persist state
  await chrome.storage.local.set({
    auto_sync_enabled: true,
    auto_sync_interval_minutes: periodInMinutes,
  });

  console.log(
    `✅ Auto-sync scheduled: every ${periodInMinutes} minutes (next run in ${
      typeof initialDelayMinutes === 'number' ? initialDelayMinutes : periodInMinutes
    }m)`
  );
}

/**
 * Get the current auto-sync alarm info
 */
export async function getAutoSyncStatus(): Promise<{
  enabled: boolean;
  intervalMinutes: number | null;
  nextScheduledTime: number | null;
}> {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  const storage = await chrome.storage.local.get([
    'auto_sync_enabled',
    'auto_sync_interval_minutes',
  ]);

  return {
    enabled: storage.auto_sync_enabled === true,
    intervalMinutes: storage.auto_sync_interval_minutes || null,
    nextScheduledTime: alarm?.scheduledTime || null,
  };
}

/**
 * Setup alarm listener to trigger syncs
 * Should be called once during background script initialization
 */
export function setupAutoSyncListener(onSync: () => Promise<void>): void {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;

    console.log('⏰ Auto-sync alarm triggered:', new Date().toISOString());

    // Double-check that auto-sync is still enabled
    const { auto_sync_enabled } = await chrome.storage.local.get('auto_sync_enabled');
    if (!auto_sync_enabled) {
      console.log('⚠️ Auto-sync disabled in storage, skipping sync');
      await chrome.alarms.clear(ALARM_NAME);
      return;
    }

    // Check if a sync is already in progress
    const { sync_in_progress } = await chrome.storage.local.get('sync_in_progress');
    if (sync_in_progress) {
      console.log('⚠️ Sync already in progress, skipping auto-sync');
      return;
    }

    try {
      await onSync();
      console.log('✅ Auto-sync completed successfully');
    } catch (err) {
      console.error('❌ Auto-sync failed:', err);
      // Don't disable the alarm, let it retry next time
    }
  });

  console.log('✅ Auto-sync alarm listener registered');
}
