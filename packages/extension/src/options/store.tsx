/// <reference types="chrome" />
/// <reference types="vite/client" />
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Plan } from './types';

export const FREE_DAILY_LIMIT = 50;
export const FREE_INTERVAL_HOURS = 12;
export const PRO_MIN_INTERVAL_HOURS = 0.5; // 30 minutes

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
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>('free');
  const [autoSync, setAutoSync] = useState(false);
  const [intervalHours, setIntervalHours] = useState<number>(FREE_INTERVAL_HOURS);

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
    }),
    [plan, autoSync, intervalHours]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
