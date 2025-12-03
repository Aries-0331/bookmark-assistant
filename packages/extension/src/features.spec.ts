/**
 * 🧪 MASTER TEST SPECIFICATION & DEVELOPMENT GUIDE
 * ================================================
 *
 * This file serves as the central "Development Process Document" for the extension.
 * It outlines all feature requirements as test cases.
 *
 * 🎯 HOW TO USE THIS FILE:
 * 1. This file contains `describe` blocks for every major feature.
 * 2. Implemented features have actual `it(...)` tests.
 * 3. Planned/Pending features have `it.todo(...)` placeholders.
 * 4. Use this to track progress: As you implement features, convert `todo` to real tests.
 *
 * 🛠 TESTING STRATEGY:
 * - **Unit Tests**: Focus on logic in isolation (e.g., parsers, schedulers). Mock Chrome APIs.
 * - **Integration**: Test interaction between modules (e.g., Store -> Background).
 * - **Mocks**: We use `vi.stubGlobal('chrome', ...)` to simulate the browser environment.
 *
 * 🚀 RUNNING TESTS:
 * $ npx vitest run packages/extension/src/features.spec.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleAutoSync, restoreAutoSync } from './background/auto-sync';

// -----------------------------------------------------------------------------
// 🎭 GLOBAL MOCKS (Browser Environment Simulation)
// -----------------------------------------------------------------------------
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
  runtime: {
    sendMessage: vi.fn(),
  },
  bookmarks: {
    getTree: vi.fn(),
  },
};

// Stub the global `chrome` object available in the extension
vi.stubGlobal('chrome', chromeMock);

describe('🧩 Extension Feature Specifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // 🟢 FEATURE 1: AUTO-SYNC (Implemented)
  // ===========================================================================
  describe('Feature: Auto-Sync Scheduler', () => {
    /**
     * Requirement: The system must automatically sync bookmarks in the background
     * without user intervention, respecting the user's configured interval.
     */
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

      it('should respect minimum interval (30 mins) for Pro users', async () => {
        await scheduleAutoSync(true, 0.1); // 6 mins requested

        expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
          periodInMinutes: 30, // Min capped at 30
          delayInMinutes: 30,
        });
      });

      it('should support custom initial delays', async () => {
        await scheduleAutoSync(true, 1, 15); // 1 hour interval, 15 min delay

        expect(chromeMock.alarms.create).toHaveBeenCalledWith('bookmarks-auto-sync', {
          periodInMinutes: 60,
          delayInMinutes: 15,
        });
      });
    });

    /**
     * Requirement: If the browser was closed and a sync was missed,
     * the system must "catch up" immediately upon startup.
     */
    describe('restoreAutoSync (Catch-up Strategy)', () => {
      const mockSync = vi.fn().mockResolvedValue({ success: true });

      it('should do nothing if auto-sync is disabled', async () => {
        chromeMock.storage.local.get.mockResolvedValue({ auto_sync_enabled: false });
        await restoreAutoSync(mockSync);
        expect(mockSync).not.toHaveBeenCalled();
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

  // ===========================================================================
  // 🟡 FEATURE 2: AUTHENTICATION (Pending)
  // ===========================================================================
  describe('Feature: Authentication', () => {
    it.todo('should initiate OAuth flow when login button is clicked', () => {
      // Guide: Mock `chrome.identity.launchWebAuthFlow`
      // Verify it calls the correct Notion auth URL
    });

    it.todo('should exchange auth code for session token', () => {
      // Guide: Mock `fetch` or `serverAPI`
      // Verify token is stored in `chrome.storage.local`
    });

    it.todo('should handle auth errors gracefully', () => {
      // Guide: Simulate network failure
      // Verify error state is set in store
    });
  });

  // ===========================================================================
  // 🟡 FEATURE 3: MANUAL SYNC (Pending)
  // ===========================================================================
  describe('Feature: Manual Sync', () => {
    it.todo('should read all bookmarks from Chrome', () => {
      // Guide: Mock `chrome.bookmarks.getTree`
      // Verify the tree is flattened correctly
    });

    it.todo('should format bookmarks into Notion-compatible structure', () => {
      // Guide: Check `formatBookmarkForServer` output
    });

    it.todo('should send bookmarks to backend API', () => {
      // Guide: Mock `serverAPI.syncBookmarks`
    });

    it.todo('should update last_sync timestamp on success', () => {
      // Guide: Check `chrome.storage.local.set`
    });
  });

  // ===========================================================================
  // 🟡 FEATURE 4: PAYMENTS & ENTITLEMENTS (Pending)
  // ===========================================================================
  describe('Feature: Payments', () => {
    it.todo('should fetch pricing from server on init', () => {
      // Guide: Mock `serverAPI.getPricing`
    });

    it.todo('should unlock Pro features when isPro is true', () => {
      // Guide: Set `isPro: true` in store
      // Verify `autoSync` toggle becomes enabled
    });

    it.todo('should lock Pro features when subscription expires', () => {
      // Guide: Set `isPro: false`
      // Verify `autoSync` is disabled
    });
  });
});
