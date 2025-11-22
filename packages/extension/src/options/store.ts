/// <reference types="chrome" />
/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import { CACHE_KEYS, WATCHED_CACHE_KEYS } from '../utils/cache';
import { sendMessage, Messages } from '../utils/message';

export const FREE_INTERVAL_HOURS = 12;
export const PRO_MIN_INTERVAL_HOURS = 0.5; // 30 minutes
export const PRO_MIN_INTERVAL_MINUTES = Math.round(PRO_MIN_INTERVAL_HOURS * 60);

// Pricing constants
export const PRICE_MONTHLY_USD = 5; // $/month
export const DISCOUNT_YEARLY = 0.3; // 30% off the annual total

export type AppState = {
  // Overview
  version: string;
  isConnecting: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  bookmarkCount: number;
  lastSync: string;
  isPro: boolean;
  setIsConnecting: (v: boolean) => void;
  setIsSyncing: (v: boolean) => void;

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

  // Config
  pricing: { monthly: number; yearlyDiscount: number };
  fetchPricing: () => Promise<void>;
  getEffectiveLimits: () => { minIntervalHours: number };
  getPricing: () => { monthly: number; yearlyDiscount: number };
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
  setIsConnecting: (v: boolean) => set({ isConnecting: v }),
  setIsSyncing: (v: boolean) => set({ isSyncing: v }),
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
  setAutoSync: (v: boolean) => set({ autoSync: v }),
  setIntervalHours: (v: number) => set({ intervalHours: v }),

  // Default pricing (fallback)
  pricing: {
    monthly: PRICE_MONTHLY_USD,
    yearlyDiscount: DISCOUNT_YEARLY,
  },

  initFromStorage: async () => {
    try {
      const { last_sync, sync_interval_hours, user_id, user_email, is_pro, session_token } =
        await chrome.storage.local.get([
          'last_sync',
          'sync_interval_hours',
          'user_id',
          'user_email',
          'is_pro',
          'session_token',
        ]);

      // Load connection state
      if (session_token) {
        set({ isConnected: true });
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
      const allowedAuto = get().isPro;
      set({ autoSync: allowedAuto, intervalHours: coerced });
      if (!get().isPro && interval !== minIntervalHours) {
        await chrome.storage.local.set({ sync_interval_hours: minIntervalHours });
      }
    } catch {}
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
        set({ isPro });
        // Also persist to storage
        chrome.storage.local.set({ is_pro: isPro });
        console.log('✅ User profile refreshed:', { isPro });
      }
    } catch (error) {
      console.error('❌ Failed to refresh user profile:', error);
    }
  },
  saveSyncSettings: async (nextIntervalHours?: number) => {
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : get().intervalHours;
    const { minIntervalHours } = get().getEffectiveLimits();
    const rounded = Math.floor(raw * 100) / 100;
    const interval = get().isPro ? Math.max(minIntervalHours, rounded) : minIntervalHours;
    await chrome.storage.local.set({ sync_interval_hours: interval });
    set({ intervalHours: interval });
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

  // Reflect connection status from storage token and last sync time
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
      if (changes['last_sync']) {
        const s = changes['last_sync'].newValue as string | undefined;
        useAppStore.setState({ lastSync: s || '' });
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
      if (changes['cached_pricing']) {
        const pricing = changes['cached_pricing'].newValue;
        if (pricing) useAppStore.setState({ pricing });
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
