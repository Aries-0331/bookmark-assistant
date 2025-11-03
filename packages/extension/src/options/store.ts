/// <reference types="chrome" />
/// <reference types="vite/client" />
import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import type { PublicConfig } from '../utils/config';
import { CACHE_KEYS, WATCHED_CACHE_KEYS } from '../utils/cache';

export const FREE_DAILY_LIMIT = 50;
export const FREE_INTERVAL_HOURS = 12;
export const PRO_MIN_INTERVAL_HOURS = 0.5; // 30 minutes
export const PRO_MIN_INTERVAL_MINUTES = Math.round(PRO_MIN_INTERVAL_HOURS * 60);

// Pricing constants
export const PRICE_MONTHLY_USD = 10; // $/month
export const DISCOUNT_YEARLY = 0.4; // 40% off the annual total

export type AppState = {
  // Overview
  version: string;
  isConnecting: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  bookmarkCount: number;
  lastSync: string;
  isPro: boolean;
  features: string[];
  setIsConnecting: (v: boolean) => void;
  setIsSyncing: (v: boolean) => void;

  // Sync settings
  autoSync: boolean;
  intervalHours: number;
  minIntervalHours: number;
  setAutoSync: (v: boolean) => void;
  setIntervalHours: (v: number) => void;

  // Lifecycle
  initFromStorage: () => Promise<void>;
  saveSyncSettings: (nextAuto?: boolean, nextIntervalHours?: number) => Promise<void>;
  hasFeature: (f: string) => boolean;

  // Config
  publicConfig?: PublicConfig;
  fetchPublicConfig: () => Promise<void>;
  getEffectiveLimits: () => { dailyLimit: number; minIntervalHours: number };
  getPricing: () => { currency: string; monthly: number; yearlyDiscount: number };
};

// ------- helpers -------
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function sanitizePublicConfig(json: unknown): PublicConfig | null {
  try {
    if (!json || typeof json !== 'object') return null;
    const j: any = json;

    const currency = typeof j?.pricing?.currency === 'string' ? j.pricing.currency : 'USD';
    const monthly = isFiniteNumber(j?.pricing?.monthly)
      ? Math.max(0, j.pricing.monthly)
      : PRICE_MONTHLY_USD;
    const rawDiscount = isFiniteNumber(j?.pricing?.yearlyDiscount)
      ? j.pricing.yearlyDiscount
      : DISCOUNT_YEARLY;
    const yearlyDiscount = clamp(rawDiscount > 1 ? rawDiscount / 100 : rawDiscount, 0, 1);

    const freeDaily = isFiniteNumber(j?.limits?.free?.dailyLimit)
      ? Math.max(1, Math.floor(j.limits.free.dailyLimit))
      : FREE_DAILY_LIMIT;
    const freeMinInt = isFiniteNumber(j?.limits?.free?.minIntervalHours)
      ? clamp(j.limits.free.minIntervalHours, 0.1, 24)
      : FREE_INTERVAL_HOURS;

    const proDaily = isFiniteNumber(j?.limits?.pro?.dailyLimit)
      ? Math.max(1, Math.floor(j.limits.pro.dailyLimit))
      : FREE_DAILY_LIMIT;
    const proMinInt = isFiniteNumber(j?.limits?.pro?.minIntervalHours)
      ? clamp(j.limits.pro.minIntervalHours, 0.1, 24)
      : PRO_MIN_INTERVAL_HOURS;

    return {
      pricing: { currency, monthly, yearlyDiscount },
      limits: {
        free: { dailyLimit: freeDaily, minIntervalHours: freeMinInt },
        pro: { dailyLimit: proDaily, minIntervalHours: proMinInt },
      },
    } as PublicConfig;
  } catch {
    return null;
  }
}

// Zustand store
export const useAppStore = create<AppState>((set, get) => ({
  version: '',
  isConnecting: false,
  isConnected: false,
  isSyncing: false,
  bookmarkCount: 0,
  lastSync: '',
  isPro: false,
  features: [],
  setIsConnecting: (v: boolean) => set({ isConnecting: v }),
  setIsSyncing: (v: boolean) => set({ isSyncing: v }),

  autoSync: false,
  intervalHours: FREE_INTERVAL_HOURS,
  minIntervalHours: FREE_INTERVAL_HOURS,
  setAutoSync: (v: boolean) => set({ autoSync: v }),
  setIntervalHours: (v: number) => set({ intervalHours: v }),

  initFromStorage: async () => {
    try {
      const { last_sync, auto_sync, sync_interval_hours } = await chrome.storage.local.get([
        'last_sync',
        'auto_sync',
        'sync_interval_hours',
      ]);
      const interval = Number(sync_interval_hours);
      const { minIntervalHours } = get().getEffectiveLimits();
      const next = Number.isFinite(interval) ? (interval as number) : minIntervalHours;
      const coerced = Math.max(minIntervalHours, next);
      set({ lastSync: typeof last_sync === 'string' ? last_sync : '' });
      const allowedAuto = !!auto_sync && get().hasFeature('auto-sync');
      set({ autoSync: allowedAuto, intervalHours: coerced, minIntervalHours });
      if (!get().isPro && interval !== minIntervalHours) {
        await chrome.storage.local.set({ sync_interval_hours: minIntervalHours });
      }
    } catch {}
  },
  saveSyncSettings: async (nextAuto?: boolean, nextIntervalHours?: number) => {
    const autoRequested = typeof nextAuto === 'boolean' ? nextAuto : get().autoSync;
    const auto = get().hasFeature('auto-sync') ? autoRequested : false;
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : get().intervalHours;
    const { minIntervalHours } = get().getEffectiveLimits();
    const rounded = Math.floor(raw * 100) / 100;
    const interval = get().isPro ? Math.max(minIntervalHours, rounded) : minIntervalHours;
    await chrome.storage.local.set({ auto_sync: auto, sync_interval_hours: interval });
    set({ autoSync: auto, intervalHours: interval });
  },
  hasFeature: (f: string) => get().features.includes(f),

  publicConfig: undefined,
  fetchPublicConfig: async () => {
    try {
      const { public_config_cache } = await chrome.storage.local.get(['public_config_cache']);
      const cache: { etag?: string; ts?: number; data?: PublicConfig } | undefined =
        public_config_cache;
      const now = Date.now();
      const FRESH_MS = 6 * 60 * 60 * 1000; // 6h
      if (cache?.data && cache?.ts && now - cache.ts < FRESH_MS) {
        set({ publicConfig: cache.data });
        return;
      }
      const base = (import.meta.env.VITE_OAUTH_SERVER_URL || '').replace(/\/$/, '');
      if (!base) return; // optional when running OSS-only
      const url = `${base}/v1/public-config`;
      const headers: Record<string, string> = {};
      if (cache?.etag) headers['If-None-Match'] = cache.etag;
      const res = await fetch(url, { headers });
      if (res.status === 304 && cache?.data) {
        set({ publicConfig: cache.data });
        return;
      }
      if (!res.ok) return;
      const raw = await res.json();
      const data = sanitizePublicConfig(raw);
      if (!data) return;
      set({ publicConfig: data });
      const etag = res.headers.get('ETag') || undefined;
      await chrome.storage.local.set({ public_config_cache: { etag, ts: now, data } });
    } catch {
      // soft-fail; use defaults
    }
  },
  getEffectiveLimits: () => {
    const st = get();
    const dailyLimit = st.isPro
      ? (st.publicConfig?.limits?.pro?.dailyLimit ?? FREE_DAILY_LIMIT)
      : (st.publicConfig?.limits?.free?.dailyLimit ?? FREE_DAILY_LIMIT);
    const minIntervalHours = st.isPro
      ? (st.publicConfig?.limits?.pro?.minIntervalHours ?? PRO_MIN_INTERVAL_HOURS)
      : (st.publicConfig?.limits?.free?.minIntervalHours ?? FREE_INTERVAL_HOURS);
    return { dailyLimit, minIntervalHours };
  },
  getPricing: () => {
    const st = get();
    return {
      currency: st.publicConfig?.pricing.currency ?? 'USD',
      monthly: st.publicConfig?.pricing.monthly ?? PRICE_MONTHLY_USD,
      yearlyDiscount: st.publicConfig?.pricing.yearlyDiscount ?? DISCOUNT_YEARLY,
    };
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
        useAppStore.setState({ isConnected: !!newToken });
      }
      if (changes['last_sync']) {
        const s = changes['last_sync'].newValue as string | undefined;
        if (typeof s === 'string') useAppStore.setState({ lastSync: s });
      }
      if (changes['sync_in_progress']) {
        useAppStore.setState({ isSyncing: !!changes['sync_in_progress'].newValue });
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

  // Kick off config + settings load
  useEffect(() => {
    (async () => {
      await useAppStore.getState().fetchPublicConfig();
      await useAppStore.getState().initFromStorage();
    })();
  }, []);

  return children as any;
}
