/// <reference types="chrome" />
/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { CACHE_KEYS, WATCHED_CACHE_KEYS } from '../utils/cache';
import { sendMessage, Messages } from '../utils/message';

export const FREE_INTERVAL_HOURS = 24;
export const PRO_MIN_INTERVAL_HOURS = 6; // 6 hours
export const PRO_MIN_INTERVAL_MINUTES = Math.round(PRO_MIN_INTERVAL_HOURS * 60);

export type AppState = {
  // Overview
  version: string;
  isConnecting: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  isRefreshingProfile: boolean;
  hasTriedInitialLoad: boolean;
  bookmarkCount: number;
  lastSync: string;
  isPro: boolean;
  setIsConnecting: (v: boolean) => void;
  setIsSyncing: (v: boolean) => void;

  // Sync feedback
  lastSyncSummary?: {
    type: 'success' | 'no_changes' | 'error';
    message?: string;
  };
  setLastSyncSummary: (summary?: AppState['lastSyncSummary']) => void;

  // User info
  userId: string;
  userEmail: string;
  setUserInfo: (userId: string, userEmail?: string) => void;

  // Sync settings
  autoSync: boolean;
  intervalHours: number;
  setAutoSync: (v: boolean) => void;
  setIntervalHours: (v: number) => void;

  // Lifecycle
  initFromStorage: () => Promise<void>;
  saveSyncSettings: (nextIntervalHours?: number) => Promise<void>;
  refreshProfile: (forceRefresh?: boolean) => Promise<void>;
  refreshConnection: () => Promise<void>;

  getEffectiveLimits: () => { minIntervalHours: number };
};

// Zustand store
export const useAppStore = create<AppState>((set, get) => ({
  version: '',
  isConnecting: false,
  isConnected: false,
  isSyncing: false,
  isRefreshingProfile: false,
  hasTriedInitialLoad: false,
  bookmarkCount: 0,
  lastSync: '',
  isPro: false,
  userId: '',
  userEmail: '',
  lastSyncSummary: undefined,
  setIsConnecting: (v: boolean) => set({ isConnecting: v }),
  setIsSyncing: (v: boolean) => set({ isSyncing: v }),
  setLastSyncSummary: (summary) => set({ lastSyncSummary: summary }),
  setUserInfo: (userId: string, userEmail?: string) => {
    set({ userId, userEmail: userEmail || '' });
    chrome.storage.local.set({
      user_id: userId,
      user_email: userEmail || '',
    });
  },

  autoSync: false,
  intervalHours: FREE_INTERVAL_HOURS,
  setAutoSync: async (v: boolean) => {
    // Optimistic update - update state FIRST so UI always reflects current state
    set({ autoSync: v });

    // Then validate managed-feature access with the server if enabling.
    if (v) {
      try {
        const response = await sendMessage({ type: Messages.GET_USER_PROFILE });
        if (!response.success || !response.profile?.isPro) {
          console.warn('🚫 Auto-sync blocked: User is not Pro (server-verified)');
          // Revert state if validation fails
          set({ autoSync: false });
          return;
        }
      } catch (error) {
        console.error('❌ Failed to verify Pro status for auto-sync:', error);
        // Revert state on error
        set({ autoSync: false });
        return;
      }
    }

    // Persist using single source of truth
    await chrome.storage.local.set({
      auto_sync_enabled: v,
    });
    // Schedule the auto-sync alarm
    const intervalHours = get().intervalHours;
    await sendMessage({
      type: Messages.SCHEDULE_AUTO_SYNC,
      enabled: v,
      intervalHours,
    });
  },
  setIntervalHours: (v: number) => set({ intervalHours: v }),

  initFromStorage: async () => {
    try {
      const {
        last_sync,
        sync_interval_hours,
        user_id,
        user_email,
        session_token,
        sync_in_progress,
        is_connecting,
        profile_refresh_in_progress,
      } = await chrome.storage.local.get([
        'last_sync',
        'sync_interval_hours',
        'user_id',
        'user_email',
        'session_token',
        'sync_in_progress',
        'is_connecting',
        'profile_refresh_in_progress',
      ]);

      // Load connection state
      if (session_token) {
        set({ isConnected: true });
      }
      if (is_connecting) {
        set({ isConnecting: true });
      }
      if (sync_in_progress) {
        set({ isSyncing: true });
      }
      // Clear any stale refreshing state from previous page loads/crashes
      if (profile_refresh_in_progress) {
        console.log('[Init] Clearing stale profile refresh state');
        await chrome.storage.local.set({
          profile_refresh_in_progress: false,
        });
        // Also clear the Zustand store state to ensure UI updates
        set({ isRefreshingProfile: false });
      }

      // Load cached is_pro for immediate display
      // Server will still be queried to verify, but user sees cached value first
      const { is_pro } = await chrome.storage.local.get(['is_pro']);
      if (typeof is_pro === 'boolean') {
        set({ isPro: is_pro });
      }

      // Load user info
      if (user_id) set({ userId: user_id });
      if (user_email) set({ userEmail: user_email });

      const interval = Number(sync_interval_hours);
      const minIntervalHours = FREE_INTERVAL_HOURS;
      const next = Number.isFinite(interval) ? (interval as number) : minIntervalHours;
      const coerced = Math.max(minIntervalHours, next);
      set({ lastSync: typeof last_sync === 'string' ? last_sync : '' });

      // Load auto-sync state. Managed-feature access is refreshed from the server.
      set({ autoSync: false, intervalHours: coerced });

      // Ensure isRefreshingProfile is false on page load (shouldn't be refreshing on initial load)
      set({ isRefreshingProfile: false });
    } catch (error) {
      console.error('❌ Failed to initialize from storage:', error);
    }
  },

  refreshProfile: async (forceRefresh = false) => {
    // Check BEFORE setting state - this prevents the bug where we check after setting to true
    // which always returns true (causing the function to never complete)
    const { profile_refresh_in_progress } = await chrome.storage.local.get([
      'profile_refresh_in_progress',
    ]);
    if (profile_refresh_in_progress && !forceRefresh) {
      console.log('[Profile] Already refreshing, skipping');
      return;
    }

    // Set storage FIRST to prevent race conditions with concurrent calls
    await chrome.storage.local.set({ profile_refresh_in_progress: true });
    set({ isRefreshingProfile: true });

    // Add timeout fallback - auto-reset after 30 seconds for network issues
    const TIMEOUT_MS = 30000;
    const timeoutId = setTimeout(() => {
      console.warn('[Profile] Refresh timeout - resetting state');
      chrome.storage.local.set({ profile_refresh_in_progress: false });
      set({ isRefreshingProfile: false });
    }, TIMEOUT_MS);

    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const { is_pro, profile_cached_at } = await chrome.storage.local.get([
          'is_pro',
          'profile_cached_at',
        ]);

        // Use cache if less than 30 minutes old
        const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
        const now = Date.now();
        const cachedAt = typeof profile_cached_at === 'number' ? profile_cached_at : 0;
        const isCacheValid = now - cachedAt < CACHE_TTL_MS;

        if (isCacheValid && typeof is_pro === 'boolean') {
          console.log('[Profile] Using cached managed-feature status:', is_pro);
          // Combine into single set() for performance
          set({ isPro: is_pro, isRefreshingProfile: false });
          return;
        }
      }

      console.log('[Profile] Fetching fresh profile from server');
      const response = await sendMessage({ type: Messages.GET_USER_PROFILE });

      if (response.success && response.profile) {
        const isPro = response.profile.isPro === true;
        set({ isPro });

        // Cache with timestamp for performance
        await chrome.storage.local.set({
          is_pro: isPro,
          profile_cached_at: Date.now(),
        });
      }
    } catch (error: any) {
      console.error('Failed to refresh user profile:', error);

      const is401 =
        error?.status === 401 || error?.message?.includes('401') || error?.code === 'UNAUTHORIZED';
      if (is401) {
        set({ isConnected: false, isPro: false });
        chrome.storage.local.remove(['session_token', 'user_id', 'user_email']);
      }
    } finally {
      clearTimeout(timeoutId);
      set({ isRefreshingProfile: false });
      // Clear storage state for cross-component sync
      await chrome.storage.local.set({ profile_refresh_in_progress: false });
    }
  },
  refreshConnection: async () => {
    try {
      const { session_token } = await chrome.storage.local.get(['session_token']);

      if (!session_token) {
        set({ isConnected: false, isPro: false });
        return;
      }

      // hasTriedInitialLoad is obsolete - remove it if present
      const { hasTriedInitialLoad } = await chrome.storage.local.get(['hasTriedInitialLoad']);
      if (hasTriedInitialLoad) {
        await chrome.storage.local.remove(['hasTriedInitialLoad']);
      }

      set({ hasTriedInitialLoad: false });

      await get().refreshProfile();
    } catch (error) {
      console.error('Failed to refresh connection state:', error);
    }
  },
  saveSyncSettings: async (nextIntervalHours?: number) => {
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : get().intervalHours;
    // Always use local limits here; managed-feature access is server-verified.
    const minIntervalHours = FREE_INTERVAL_HOURS;
    const rounded = Math.floor(raw * 100) / 100;
    const interval = Math.max(minIntervalHours, rounded);
    await chrome.storage.local.set({
      sync_interval_hours: interval,
      auto_sync_interval_minutes: Math.round(interval * 60), // Keep in sync
    });
    set({ intervalHours: interval });

    // Reschedule auto-sync if enabled
    const autoSync = get().autoSync;
    if (autoSync) {
      await sendMessage({
        type: Messages.SCHEDULE_AUTO_SYNC,
        enabled: true,
        intervalHours: interval,
      });
    }
  },

  getEffectiveLimits: () => ({ minIntervalHours: FREE_INTERVAL_HOURS }),
}));

// Thin provider to run init effects and listeners
export function AppProvider({ children }: { children: ReactNode }) {
  // Version
  useEffect(() => {
    try {
      const mf = chrome.runtime.getManifest?.();
      if (mf?.version) useAppStore.setState({ version: mf.version });
    } catch {}
  }, []);

  useEffect(() => {
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const shot = WATCHED_CACHE_KEYS.some((key) => key in changes);
      if (!shot) return;

      if (changes[CACHE_KEYS.session_token]) {
        const oldToken = changes[CACHE_KEYS.session_token].oldValue;
        const newToken = changes[CACHE_KEYS.session_token].newValue;
        const wasConnected = useAppStore.getState().isConnected;
        const isNowConnected = !!newToken;

        useAppStore.setState({ isConnected: isNowConnected });

        if (newToken && (!oldToken || oldToken !== newToken)) {
          // hasTriedInitialLoad is obsolete - no longer needed
          useAppStore.setState({ hasTriedInitialLoad: false });
        }

        if (!wasConnected && isNowConnected) {
          useAppStore.getState().refreshProfile();
        }
      }
      if (changes['is_connecting']) {
        useAppStore.setState({ isConnecting: !!changes['is_connecting'].newValue });
      }
      if (changes['last_sync']) {
        const s = changes['last_sync'].newValue as string | undefined;
        useAppStore.setState({ lastSync: s || '' });
      }
      if (changes[CACHE_KEYS.last_sync_summary]) {
        const summary = changes[CACHE_KEYS.last_sync_summary].newValue as string | undefined;
        if (summary === 'no_changes') {
          useAppStore.setState({
            lastSyncSummary: {
              type: 'no_changes',
              message: 'Everything is up to date',
            },
          });
        } else if (!summary) {
          useAppStore.setState({ lastSyncSummary: undefined });
        }
      }
      if (changes['last_sync']) {
        // Update lastSync when sync completes
        const lastSync = changes['last_sync'].newValue as string | undefined;
        if (lastSync) {
          useAppStore.setState({ lastSync });
        }
      }
      if (changes['sync_in_progress']) {
        useAppStore.setState({ isSyncing: !!changes['sync_in_progress'].newValue });
      }
      if (changes['profile_refresh_in_progress']) {
        useAppStore.setState({
          isRefreshingProfile: !!changes['profile_refresh_in_progress'].newValue,
        });
      }
      if (changes['user_id']) {
        const userId = changes['user_id'].newValue as string | undefined;
        useAppStore.setState({ userId: userId || '' });
      }
      if (changes['user_email']) {
        const userEmail = changes['user_email'].newValue as string | undefined;
        useAppStore.setState({ userEmail: userEmail || '' });
      }
      if (changes['is_pro']) {
        const isPro = !!changes['is_pro'].newValue;
        useAppStore.setState({ isPro });
      }
      if (changes['auto_sync_enabled']) {
        const autoSyncEnabled = !!changes['auto_sync_enabled'].newValue;
        // Note: autoSync is now controlled by setAutoSync which validates with server
        // We only reflect the storage state here, but actual sync requires server validation
        useAppStore.setState({ autoSync: autoSyncEnabled });
      }
      if (changes['auto_sync_interval_minutes']) {
        const minutes = changes['auto_sync_interval_minutes'].newValue as number | undefined;
        if (minutes) {
          useAppStore.setState({ intervalHours: minutes / 60 });
        }
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // Initial bookmark count
  useEffect(() => {
    (async () => {
      try {
        const tree = await chrome.bookmarks.getTree();
        let count = 0;
        function walk(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
          for (const n of nodes) {
            if ((n as any).url) count += 1;
            if (n.children && n.children.length) walk(n.children);
          }
        }
        walk(tree);
        useAppStore.setState({ bookmarkCount: count });
      } catch {}
    })();
  }, []);

  // Visibility change handler: refresh hosted profile state when the page becomes visible.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // Page became visible - refresh hosted profile state if connected.
        const { session_token } = await chrome.storage.local.get(['session_token']);
        if (session_token) {
          await useAppStore.getState().refreshProfile();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Kick off config + settings load
  useEffect(() => {
    (async () => {
      await useAppStore.getState().initFromStorage();
      // Refresh hosted profile state on mount if connected.
      const { session_token } = await chrome.storage.local.get(['session_token']);
      if (session_token) {
        await useAppStore.getState().refreshProfile();
      }
    })();
  }, []);

  return children as any;
}
