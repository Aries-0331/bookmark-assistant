import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleAutoSync, restoreAutoSync } from './auto-sync';

// Mock Chrome API
const chromeMock = {
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
  },
  storage: {
    local: {
      set: vi.fn(),
      get: vi.fn(),
    },
  },
};

// Stub global chrome object
vi.stubGlobal('chrome', chromeMock);

describe('Auto-Sync Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('scheduleAutoSync', () => {
    it('should clear existing alarm and create a new one when enabled', async () => {
      await scheduleAutoSync(true, 1); // 1 hour

      expect(chromeMock.alarms.clear).toHaveBeenCalledWith('bookmarks-auto-sync');
      expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
        periodInMinutes: 60,
        delayInMinutes: 60,
      });
      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        auto_sync_enabled: true,
        auto_sync_interval_minutes: 60,
      });
    });

    it('should clear alarm and disable storage when disabled', async () => {
      await scheduleAutoSync(false, 1);

      expect(chromeMock.alarms.clear).toHaveBeenCalledWith('bookmarks-auto-sync');
      expect(chromeMock.alarms.create).not.toHaveBeenCalled();
      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        auto_sync_enabled: false,
      });
    });

    it('should respect minimum interval (30 mins)', async () => {
      await scheduleAutoSync(true, 0.1); // 6 mins

      expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
        periodInMinutes: 30, // Min capped at 30
        delayInMinutes: 30,
      });
    });

    it('should handle initialDelayMinutes', async () => {
      await scheduleAutoSync(true, 1, 15); // 1 hour interval, 15 min delay

      expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
        periodInMinutes: 60,
        delayInMinutes: 15,
      });
    });
  });

  describe('restoreAutoSync (Catch-up Strategy)', () => {
    const mockSync = vi.fn().mockResolvedValue({ success: true });

    it('should do nothing if auto-sync is disabled', async () => {
      chromeMock.storage.local.get.mockResolvedValue({ auto_sync_enabled: false });

      await restoreAutoSync(mockSync);

      expect(mockSync).not.toHaveBeenCalled();
      expect(chromeMock.alarms.create).not.toHaveBeenCalled();
    });

    it('should schedule normal sync if enabled but no last_sync record', async () => {
      chromeMock.storage.local.get.mockResolvedValue({
        auto_sync_enabled: true,
        auto_sync_interval_minutes: 60,
        last_sync: undefined,
      });

      await restoreAutoSync(mockSync);

      expect(mockSync).not.toHaveBeenCalled(); // No immediate sync
      expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
        periodInMinutes: 60,
        delayInMinutes: 60, // Full delay
      });
    });

    it('should trigger IMMEDIATE sync if overdue (Catch-up)', async () => {
      const now = new Date('2023-01-01T12:00:00Z').getTime();
      vi.setSystemTime(now);

      // Last sync was 2 hours ago, interval is 1 hour -> OVERDUE
      const lastSync = new Date(now - 2 * 60 * 60 * 1000).toISOString();

      chromeMock.storage.local.get.mockResolvedValue({
        auto_sync_enabled: true,
        auto_sync_interval_minutes: 60,
        last_sync: lastSync,
      });

      await restoreAutoSync(mockSync);

      expect(mockSync).toHaveBeenCalled(); // Immediate sync triggered
      expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
        periodInMinutes: 60,
        delayInMinutes: 60, // Next one scheduled for full interval
      });
    });

    it('should schedule PARTIAL delay if not yet overdue', async () => {
      const now = new Date('2023-01-01T12:00:00Z').getTime();
      vi.setSystemTime(now);

      // Last sync was 30 mins ago, interval is 60 mins -> 30 mins remaining
      const lastSync = new Date(now - 30 * 60 * 1000).toISOString();

      chromeMock.storage.local.get.mockResolvedValue({
        auto_sync_enabled: true,
        auto_sync_interval_minutes: 60,
        last_sync: lastSync,
      });

      await restoreAutoSync(mockSync);

      expect(mockSync).not.toHaveBeenCalled(); // No immediate sync
      expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
        periodInMinutes: 60,
        delayInMinutes: 30, // Only wait remaining 30 mins
      });
    });
  });
});
