/// <reference types="chrome" />
/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { CACHE_KEYS, WATCHED_CACHE_KEYS } from '../utils/cache';
import { sendMessage, Messages } from '../utils/message';

export const FREE_INTERVAL_HOURS = 24;
export const PRO_MIN_INTERVAL_HOURS = 6; // 6 hours
export const PRO_MIN_INTERVAL_MINUTES = Math.round(PRO_MIN_INTERVAL_HOURS * 60);

// Pricing constants
export const PRICE_MONTHLY_REGULAR_USD = 5; // Regular $/month
export const PRICE_MONTHLY_EARLY_BIRD_USD = 2.99; // Early bird $/month
export const PRICE_LIFETIME_USD = 29.9; // $ one-time purchase

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
  purchaseType?: 'monthly' | 'lifetime';
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
  refreshEntitlements: () => Promise<void>;
  refreshConnection: () => Promise<void>;

  // Config
  pricing: { monthly: number; lifetime: number };
  fetchPricing: () => Promise<void>;
  getEffectiveLimits: () => { minIntervalHours: number };
  getPricing: () => { monthly: number; lifetime: number };
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
    // Also persist to storage for Paddle checkout
    chrome.storage.local.set({
      user_id: userId,
      user_email: userEmail || '',
    });
  },

  autoSync: false,
  intervalHours: FREE_INTERVAL_HOURS,
  setAutoSync: async (v: boolean) => {
    // Security: Validate with server before enabling auto-sync
    // Users cannot bypass payment by modifying localStorage
    if (v) {
      try {
        const response = await sendMessage({ type: Messages.GET_USER_PROFILE });
        if (!response.success || !response.profile?.isPro) {
          console.warn('🚫 Auto-sync blocked: User is not Pro (server-verified)');
          // Show error notification if possible
          return; // Don't enable auto-sync
        }
      } catch (error) {
        console.error('❌ Failed to verify Pro status for auto-sync:', error);
        return; // Don't enable auto-sync on error
      }
    }

    set({ autoSync: v });
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

  // Default pricing (fallback)
  pricing: {
    monthly: PRICE_MONTHLY_EARLY_BIRD_USD,
    lifetime: PRICE_LIFETIME_USD,
  },

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
      } = await chrome.storage.local.get([
        'last_sync',
        'sync_interval_hours',
        'user_id',
        'user_email',
        'session_token',
        'sync_in_progress',
        'is_connecting',
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

      // Load user info
      if (user_id) set({ userId: user_id });
      if (user_email) set({ userEmail: user_email });

      // NOTE: is_pro is no longer loaded from localStorage as truth
      // Pro status is determined by server response only
      // See: refreshEntitlements() which fetches from server
      // Users CANNOT bypass payment by modifying localStorage

      const interval = Number(sync_interval_hours);
      const minIntervalHours = FREE_INTERVAL_HOURS;
      const next = Number.isFinite(interval) ? (interval as number) : minIntervalHours;
      const coerced = Math.max(minIntervalHours, next);
      set({ lastSync: typeof last_sync === 'string' ? last_sync : '' });

      // Load auto-sync state (default to disabled, will be enabled by refreshEntitlements if Pro)
      // Users cannot bypass payment by modifying localStorage
      set({ autoSync: false, intervalHours: coerced });
    } catch (error) {
      console.error('❌ Failed to initialize from storage:', error);
    }
  },

  fetchPricing: async () => {
    try {
      const response = await sendMessage({ type: Messages.GET_PRICING });
      if (response.success && response.pricing) {
        set({ pricing: response.pricing });
        // Cache it
        chrome.storage.local.set({ cached_pricing: response.pricing });
      }
    } catch (error) {
      console.error('❌ Failed to fetch pricing:', error);
    }
  },

  refreshEntitlements: async () => {
    if (get().isRefreshingProfile) return;
    set({ isRefreshingProfile: true });

    try {
      const response = await sendMessage({ type: Messages.GET_USER_PROFILE });

      if (response.success && response.profile) {
        const isPro = response.profile.isPro === true;
        const purchaseType = response.profile.purchaseType as 'monthly' | 'lifetime' | undefined;
        set({ isPro, purchaseType });
        chrome.storage.local.set({ is_pro: isPro, purchase_type: purchaseType });
      }
    } catch (error: any) {
      console.error('Failed to refresh user profile:', error);

      const is401 =
        error?.status === 401 || error?.message?.includes('401') || error?.code === 'UNAUTHORIZED';
      if (is401) {
        set({ isConnected: false, isPro: false, purchaseType: undefined });
        chrome.storage.local.remove(['session_token', 'user_id', 'user_email']);
      }
    } finally {
      set({ isRefreshingProfile: false });
    }
  },
  refreshConnection: async () => {
    try {
      const { session_token } = await chrome.storage.local.get(['session_token']);

      if (!session_token) {
        set({ isConnected: false, isPro: false, purchaseType: undefined });
        return;
      }

      // hasTriedInitialLoad is obsolete - remove it if present
      const { hasTriedInitialLoad } = await chrome.storage.local.get(['hasTriedInitialLoad']);
      if (hasTriedInitialLoad) {
        await chrome.storage.local.remove(['hasTriedInitialLoad']);
      }

      set({ hasTriedInitialLoad: false });

      await get().refreshEntitlements();
    } catch (error) {
      console.error('Failed to refresh connection state:', error);
    }
  },
  saveSyncSettings: async (nextIntervalHours?: number) => {
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : get().intervalHours;
    // Always use free tier limits - Pro status must be server-verified
    // Users cannot bypass payment by modifying localStorage
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
  getPricing: () => {
    return get().pricing;
  },
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
          useAppStore.getState().refreshEntitlements();
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
      if (changes['purchase_type']) {
        const purchaseType = changes['purchase_type'].newValue as
          | 'monthly'
          | 'lifetime'
          | undefined;
        useAppStore.setState({ purchaseType });
      }
      if (changes['cached_pricing']) {
        const pricing = changes['cached_pricing'].newValue;
        if (pricing) useAppStore.setState({ pricing });
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

  // Visibility change handler (disabled to prevent unnecessary API calls)
  useEffect(() => {
    // Currently disabled
  }, []);

  // Kick off config + settings load
  useEffect(() => {
    (async () => {
      await useAppStore.getState().initFromStorage();
      await useAppStore.getState().fetchPricing();
    })();
  }, []);

  return children as any;
}
