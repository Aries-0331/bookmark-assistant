/// <reference types="chrome" />
/// <reference types="vite/client" />
import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Plan, PublicConfig } from './types';
import { serverAPI } from '../lib/server-api';

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
  features: string[];

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
  hasFeature: (f: string) => boolean;

  // Config
  publicConfig?: PublicConfig;
  fetchPublicConfig: () => Promise<void>;
  getEffectiveLimits: () => { dailyLimit: number; minIntervalHours: number };
  getPricing: () => { currency: string; monthly: number; yearlyDiscount: number };
};

const AppContext = createContext<AppState | null>(null);

// ------- helpers -------
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * Best-effort validation/sanitization for server-provided PublicConfig
 * Keeps UI resilient against malformed payloads without introducing a runtime dep.
 */
function sanitizePublicConfig(json: unknown): PublicConfig | null {
  try {
    if (!json || typeof json !== 'object') return null;
    const j: any = json;

    const currency = typeof j?.pricing?.currency === 'string' ? j.pricing.currency : 'USD';
    const monthly = isFiniteNumber(j?.pricing?.monthly)
      ? Math.max(0, j.pricing.monthly)
      : PRICE_MONTHLY_USD;
    // allow 0..1 or 0..100; normalize >1 as percent
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>('free');
  const [features, setFeatures] = useState<string[]>([]);
  const [autoSync, setAutoSync] = useState(false);
  const [intervalHours, setIntervalHours] = useState<number>(FREE_INTERVAL_HOURS);
  const [publicConfig, setPublicConfig] = useState<PublicConfig | undefined>(undefined);

  const isPro = () => plan === 'pro';
  const hasFeature = (f: string) => features.includes(f);

  const initFromStorage = async () => {
    try {
      const { auto_sync, sync_interval_hours } = await chrome.storage.local.get([
        'auto_sync',
        'sync_interval_hours',
      ]);
      const interval = Number(sync_interval_hours);
      const { minIntervalHours } = getEffectiveLimits();
      const next = Number.isFinite(interval) ? (interval as number) : minIntervalHours;
      const coerced = Math.max(minIntervalHours, next);
      // gate auto-sync client-side by feature (server should enforce as well)
      const allowedAuto = !!auto_sync && hasFeature('auto-sync');
      setAutoSync(allowedAuto);
      setIntervalHours(coerced);
      if (!isPro() && interval !== minIntervalHours) {
        await chrome.storage.local.set({ sync_interval_hours: minIntervalHours });
      }
    } catch {}
  };

  const saveSyncSettings = async (nextAuto?: boolean, nextIntervalHours?: number) => {
    const autoRequested = typeof nextAuto === 'boolean' ? nextAuto : autoSync;
    const auto = hasFeature('auto-sync') ? autoRequested : false;
    const raw = typeof nextIntervalHours === 'number' ? nextIntervalHours : intervalHours;
    const { minIntervalHours } = getEffectiveLimits();
    const rounded = Math.floor(raw * 100) / 100;
    const interval = isPro() ? Math.max(minIntervalHours, rounded) : minIntervalHours;
    await chrome.storage.local.set({ auto_sync: auto, sync_interval_hours: interval });
    setAutoSync(auto);
    setIntervalHours(interval);
  };

  const fetchEntitlements = async () => {
    if (import.meta.env.DEV && (window as any).__DEV_PLAN__) {
      setPlan((window as any).__DEV_PLAN__ as Plan);
      setFeatures((window as any).__DEV_FEATURES__ ?? []);
      return;
    }
    try {
      const { session_token } = await chrome.storage.local.get(['session_token']);
      if (!session_token) return;
      const ent = await serverAPI.getEntitlements();
      setPlan(ent.plan);
      setFeatures(ent.features || []);
      await initFromStorage();
    } catch {
      setPlan('free');
      setFeatures([]);
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
      const raw = await res.json();
      const data = sanitizePublicConfig(raw);
      if (!data) return;
      setPublicConfig(data);
      const etag = res.headers.get('ETag') || undefined;
      await chrome.storage.local.set({ public_config_cache: { etag, ts: now, data } });
    } catch {
      // soft-fail; use defaults
    }
  };

  const getEffectiveLimits = () => {
    const dailyLimit = isPro()
      ? (publicConfig?.limits?.pro?.dailyLimit ?? FREE_DAILY_LIMIT)
      : (publicConfig?.limits?.free?.dailyLimit ?? FREE_DAILY_LIMIT);
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
      features,
      autoSync,
      intervalHours,
      setAutoSync,
      setIntervalHours,
      initFromStorage,
      saveSyncSettings,
      fetchEntitlements,
      isPro,
      hasFeature,
      publicConfig,
      fetchPublicConfig,
      getEffectiveLimits,
      getPricing,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, features, autoSync, intervalHours, publicConfig]
  );

  return React.createElement(AppContext.Provider, { value }, children);
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
