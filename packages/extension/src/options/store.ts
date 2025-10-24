/// <reference types="chrome" />
/// <reference types="vite/client" />
import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Plan, PublicConfig } from './types';

export const FREE_DAILY_LIMIT = 50;
export const FREE_INTERVAL_HOURS = 12;
export const PRO_MIN_INTERVAL_HOURS = 0.5; // 30 minutes
export const PRO_MIN_INTERVAL_MINUTES = Math.round(PRO_MIN_INTERVAL_HOURS * 60);

// Pricing constants
export const PRICE_MONTHLY_USD = 10; // $/month
export const DISCOUNT_YEARLY = 0.4; // 40% off the annual total

export type AppState = {
  // Entitlements
  plan: Plan;
  setPlan: (p: Plan) => void;

  // Sync settings
  autoSync: boolean;
  intervalHours: number;
  setAutoSync: (v: boolean) => void;
  setIntervalHours: (v: number) => void;

  // Lifecycle
  initFromStorage: () => Promise<void>;
  saveSyncSettings: (nextAuto?: boolean, nextIntervalHours?: number) => Promise<void>;
  fetchEntitlements: () => Promise<void>;
  isPro: () => boolean;

  // Config
  publicConfig?: PublicConfig;
  fetchPublicConfig: () => Promise<void>;
  getEffectiveLimits: () => { dailyLimit: number; minIntervalHours: number };
  getPricing: () => { currency: string; monthly: number; yearlyDiscount: number };
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>('free');
  const [autoSync, setAutoSync] = useState(false);
  const [intervalHours, setIntervalHours] = useState<number>(FREE_INTERVAL_HOURS);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | undefined>(undefined);

  const isPro = () => plan === 'pro';

  const initFromStorage = async () => {
    try {
      const { auto_sync, sync_interval_hours } = await chrome.storage.local.get([
        'auto_sync',
        'sync_interval_hours',
      ]);
      const interval = Number(sync_interval_hours);
      const coerced = isPro()
        ? Math.max(
            PRO_MIN_INTERVAL_HOURS,
            Number.isFinite(interval) ? interval : PRO_MIN_INTERVAL_HOURS
          )
        : FREE_INTERVAL_HOURS;
      setAutoSync(!!auto_sync);
      setIntervalHours(coerced);
      if (!isPro() && interval !== FREE_INTERVAL_HOURS) {
        await chrome.storage.local.set({ sync_interval_hours: FREE_INTERVAL_HOURS });
      }
    } catch {}
  };

  const saveSyncSettings = async (nextAuto?: boolean, nextIntervalHours?: number) => {
    const auto = typeof nextAuto === 'boolean' ? nextAuto : autoSync;
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : intervalHours;
    const interval = isPro()
      ? Math.max(PRO_MIN_INTERVAL_HOURS, Math.floor(raw * 100) / 100)
      : FREE_INTERVAL_HOURS;
    await chrome.storage.local.set({ auto_sync: auto, sync_interval_hours: interval });
    setAutoSync(auto);
    setIntervalHours(interval);
  };

  const fetchEntitlements = async () => {
    if (import.meta.env.DEV && (window as any).__DEV_PLAN__) {
      setPlan((window as any).__DEV_PLAN__ as Plan);
      return;
    }
    try {
      const { session_token } = await chrome.storage.local.get(['session_token']);
      if (!session_token) return;
      const { serverAPI } = await import('../lib/server-api');
      const ent = await serverAPI.getEntitlements();
      setPlan(ent.plan);
      await initFromStorage();
    } catch {
      setPlan('free');
    }
  };

  const fetchPublicConfig = async () => {
    try {
      const { public_config_cache } = await chrome.storage.local.get(['public_config_cache']);
      const cache: { etag?: string; ts?: number; data?: PublicConfig } | undefined =
        public_config_cache;
      const now = Date.now();
      const FRESH_MS = 6 * 60 * 60 * 1000; // 6h
      if (cache?.data && cache?.ts && now - cache.ts < FRESH_MS) {
        setPublicConfig(cache.data);
        return;
      }
      const base = (import.meta.env.VITE_OAUTH_SERVER_URL || '').replace(/\/$/, '');
      if (!base) return; // optional when running OSS-only
      const url = `${base}/v1/public-config`;
      const headers: Record<string, string> = {};
      if (cache?.etag) headers['If-None-Match'] = cache.etag;
      const res = await fetch(url, { headers });
      if (res.status === 304 && cache?.data) {
        setPublicConfig(cache.data);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as PublicConfig;
      setPublicConfig(data);
      const etag = res.headers.get('ETag') || undefined;
      await chrome.storage.local.set({ public_config_cache: { etag, ts: now, data } });
    } catch {
      // soft-fail; use defaults
    }
  };

  const getEffectiveLimits = () => {
    const dailyLimit = FREE_DAILY_LIMIT; // could be refined per entitlements later
    const minIntervalHours = isPro()
      ? (publicConfig?.limits?.pro?.minIntervalHours ?? PRO_MIN_INTERVAL_HOURS)
      : (publicConfig?.limits?.free?.minIntervalHours ?? FREE_INTERVAL_HOURS);
    return { dailyLimit, minIntervalHours };
  };

  const getPricing = () => {
    return {
      currency: publicConfig?.pricing.currency ?? 'USD',
      monthly: publicConfig?.pricing.monthly ?? PRICE_MONTHLY_USD,
      yearlyDiscount: publicConfig?.pricing.yearlyDiscount ?? DISCOUNT_YEARLY,
    };
  };

  const value = useMemo<AppState>(
    () => ({
      plan,
      setPlan,
      autoSync,
      intervalHours,
      setAutoSync,
      setIntervalHours,
      initFromStorage,
      saveSyncSettings,
      fetchEntitlements,
      isPro,
      publicConfig,
      fetchPublicConfig,
      getEffectiveLimits,
      getPricing,
    }),
    [plan, autoSync, intervalHours, publicConfig]
  );

  return React.createElement(AppContext.Provider, { value }, children);
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
