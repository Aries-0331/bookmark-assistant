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
export const PRICE_LIFETIME_USD = 29.99; // $ one-time purchase

export type AppState = {
  // Overview
  version: string;
  isConnecting: boolean;
  isConnected: boolean;
  isSyncing: boolean;
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
    count?: number;
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
        is_pro,
        session_token,
        auto_sync_enabled,
        sync_in_progress,
        is_connecting,
      } = await chrome.storage.local.get([
        'last_sync',
        'sync_interval_hours',
        'user_id',
        'user_email',
        'is_pro',
        'session_token',
        'auto_sync_enabled',
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

      // Load entitlements
      if (typeof is_pro === 'boolean') set({ isPro: is_pro });

      const interval = Number(sync_interval_hours);
      const { minIntervalHours } = get().getEffectiveLimits();
      const next = Number.isFinite(interval) ? (interval as number) : minIntervalHours;
      const coerced = Math.max(minIntervalHours, next);
      set({ lastSync: typeof last_sync === 'string' ? last_sync : '' });

      // Load auto-sync state (only enabled for Pro users)
      const allowedAuto = get().isPro && auto_sync_enabled === true;
      set({ autoSync: allowedAuto, intervalHours: coerced });

      if (!get().isPro && interval !== minIntervalHours) {
        await chrome.storage.local.set({ sync_interval_hours: minIntervalHours });
      }

      // Reschedule auto-sync alarm if enabled
      if (allowedAuto) {
        try {
          await sendMessage({
            type: Messages.SCHEDULE_AUTO_SYNC,
            enabled: true,
            intervalHours: coerced,
          });
        } catch (error) {
          console.error('❌ Failed to schedule auto-sync on init:', error);
        }
      }
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
    try {
      const response = await sendMessage({ type: Messages.GET_USER_PROFILE });

      if (response.success && response.profile) {
        const isPro = response.profile.isPro === true;
        const purchaseType = response.profile.purchaseType as 'monthly' | 'lifetime' | undefined;
        set({ isPro, purchaseType });
        // Also persist to storage
        chrome.storage.local.set({ is_pro: isPro, purchase_type: purchaseType });
        console.log('✅ User profile refreshed:', { isPro, purchaseType });
      }
    } catch (error) {
      console.error('❌ Failed to refresh user profile:', error);
    }
  },
  refreshConnection: async () => {
    try {
      const { session_token } = await chrome.storage.local.get(['session_token']);
      set({ isConnected: !!session_token });

      if (session_token) {
        // Also refresh user profile when connected
        await get().refreshEntitlements();
      }
    } catch (error) {
      console.error('❌ Failed to refresh connection state:', error);
    }
  },
  saveSyncSettings: async (nextIntervalHours?: number) => {
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : get().intervalHours;
    const { minIntervalHours } = get().getEffectiveLimits();
    const rounded = Math.floor(raw * 100) / 100;
    const interval = get().isPro ? Math.max(minIntervalHours, rounded) : minIntervalHours;
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

  getEffectiveLimits: () => {
    const st = get();
    const minIntervalHours = st.isPro ? PRO_MIN_INTERVAL_HOURS : FREE_INTERVAL_HOURS;
    return { minIntervalHours };
  },
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
        const newToken = changes[CACHE_KEYS.session_token].newValue;
        const wasConnected = useAppStore.getState().isConnected;
        const isNowConnected = !!newToken;
        useAppStore.setState({ isConnected: isNowConnected });

        // Refresh entitlements when connection state changes to connected
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
        // Parse and set sync summary for UI feedback
        if (summary === 'no_changes') {
          // Get count from storage
          chrome.storage.local.get(['last_sync_count'], (result) => {
            const count = result.last_sync_count as number | undefined;
            useAppStore.setState({
              lastSyncSummary: {
                type: 'no_changes',
                message: 'Everything is up to date',
                count: count || 0,
              },
            });
          });
        } else if (!summary) {
          // Clear summary after successful sync
          // Note: summary is undefined when the key is deleted (set to null)
          useAppStore.setState({ lastSyncSummary: undefined });
        }
      }
      if (changes['last_sync_count']) {
        const count = changes['last_sync_count'].newValue as number | undefined;
        const currentSummary = useAppStore.getState().lastSyncSummary;
        if (currentSummary?.type === 'no_changes' && count) {
          useAppStore.setState({
            lastSyncSummary: {
              ...currentSummary,
              count,
            },
          });
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
        const isPro = useAppStore.getState().isPro;
        useAppStore.setState({ autoSync: isPro && autoSyncEnabled });
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

  // Refresh entitlements on visibility change (e.g. returning from payment tab)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && useAppStore.getState().isConnected) {
        useAppStore.getState().refreshEntitlements();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Kick off config + settings load
  useEffect(() => {
    (async () => {
      await useAppStore.getState().initFromStorage();
      // Fetch latest pricing
      await useAppStore.getState().fetchPricing();

      // If user is connected, refresh entitlements
      const { isConnected } = useAppStore.getState();
      if (isConnected) {
        await useAppStore.getState().refreshEntitlements();
      }
    })();
  }, []);

  return children as any;
}
