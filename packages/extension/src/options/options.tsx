import { useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { AboutSection } from './components/AboutSection';
import { FAQSection, TutorialsSection } from './components/Placeholders';
import { BillingSection } from './components/BillingSection';
import { useHashRoute } from './router';
import type { SyncStatus } from './types';
import { useAppStore } from './store';
import { sendMessage, Messages } from '../shared/messaging';
import { useToast } from './components/Toast';

export default function Options() {
  const { show } = useToast();
  const { route, navigate } = useHashRoute();
  const {
    plan,
    isPro,
    autoSync: autoSyncStore,
    intervalHours,
    initFromStorage,
    saveSyncSettings: saveSyncSettingsStore,
    fetchEntitlements: fetchEntitlementsStore,
    setPlan,
    fetchPublicConfig,
    hasFeature,
    getEffectiveLimits,
  } = useAppStore();

  const [version, setVersion] = useState<string>('');
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: '',
  });
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [interval, setInterval] = useState<number>(intervalHours);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [tick, setTick] = useState(0); // drives countdown re-render
  const tickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Iterative bookmark count (avoids deep recursion) + debounced recount
    const countBookmarks = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
      let count = 0;
      const stack: chrome.bookmarks.BookmarkTreeNode[] = [...nodes];
      while (stack.length) {
        const n = stack.pop()!;
        if ((n as any).url) count++;
        if (n.children && n.children.length) stack.push(...n.children);
      }
      return count;
    };

    const recount = async () => {
      try {
        const tree = await chrome.bookmarks?.getTree?.();
        if (!isMounted || !tree) return;
        setBookmarkCount(countBookmarks(tree));
      } catch {
        // ignore
      }
    };

    // Debounce helpers
    let bmTimer: number | undefined;
    const scheduleRecount = () => {
      if (bmTimer) window.clearTimeout(bmTimer);
      bmTimer = window.setTimeout(recount, 150);
    };

    // Initial count
    recount();

    // Listen to bookmark changes, throttle heavy recounts
    const bmHandlers = [
      () => scheduleRecount(), // onCreated
      () => scheduleRecount(), // onRemoved
      () => scheduleRecount(), // onChanged
      () => scheduleRecount(), // onMoved
      () => scheduleRecount(), // onImportEnded
    ] as const;
    try {
      chrome.bookmarks?.onCreated.addListener(bmHandlers[0]);
      chrome.bookmarks?.onRemoved.addListener(bmHandlers[1]);
      chrome.bookmarks?.onChanged.addListener(bmHandlers[2]);
      chrome.bookmarks?.onMoved.addListener(bmHandlers[3]);
      chrome.bookmarks?.onImportEnded?.addListener?.(bmHandlers[4]);
    } catch {
      // silently ignore if API not available in dev HMR
    }

    // Debounced storage status updates (batch multiple key changes into one render)
    let storageTimer: number | undefined;
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const hasWatched =
        'sync_in_progress' in changes ||
        'last_sync' in changes ||
        'last_sync_error' in changes ||
        'last_sync_summary' in changes ||
        'sync_cooldown_until' in changes;
      if (!hasWatched) return;

      if (storageTimer) window.clearTimeout(storageTimer);
      storageTimer = window.setTimeout(() => {
        if (!isMounted) return;
        // reflect sync status
        setStatus((prev) => {
          const nextLoading =
            'sync_in_progress' in changes ? !!changes.sync_in_progress.newValue : prev.isLoading;
          const nextLast = 'last_sync' in changes ? changes.last_sync.newValue : prev.lastSync;
          const nextErr =
            'last_sync_error' in changes
              ? (changes.last_sync_error.newValue as any) || undefined
              : prev.error;
          if (
            prev.isLoading === nextLoading &&
            prev.lastSync === nextLast &&
            prev.error === nextErr
          )
            return prev;
          return { ...prev, isLoading: nextLoading, lastSync: nextLast, error: nextErr };
        });

        // handle cooldown and summary user feedback
        if ('sync_cooldown_until' in changes) {
          const until = Number(changes.sync_cooldown_until.newValue);
          if (Number.isFinite(until)) {
            setCooldownUntil(until);
          } else {
            setCooldownUntil(null);
          }
        }
        if ('last_sync_summary' in changes) {
          const summary = changes.last_sync_summary.newValue as string | null | undefined;
          if (summary === 'no_changes') {
            show({ variant: 'info', title: 'No changes detected', description: 'Your bookmarks are already in sync.' });
          } else if (summary === 'cooldown') {
            show({ variant: 'warning', title: 'Please wait before syncing again', description: 'You hit the cooldown. Try again shortly.' });
          } else if (summary === 'limit') {
            show({ variant: 'error', title: 'Daily limit reached', description: 'You’ve reached today’s sync limit on the Free plan.' });
          } else if (summary === 'in_progress') {
            show({ variant: 'info', title: 'Sync already in progress' });
          }
        }
      }, 80);
    };
    chrome.storage.onChanged.addListener(onChanged);

    return () => {
      isMounted = false;
      if (bmTimer) window.clearTimeout(bmTimer);
      if (storageTimer) window.clearTimeout(storageTimer);
      try {
        chrome.bookmarks?.onCreated.removeListener(bmHandlers[0]);
        chrome.bookmarks?.onRemoved.removeListener(bmHandlers[1]);
        chrome.bookmarks?.onChanged.removeListener(bmHandlers[2]);
        chrome.bookmarks?.onMoved.removeListener(bmHandlers[3]);
        chrome.bookmarks?.onImportEnded?.removeListener?.(bmHandlers[4]);
      } catch {}
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  // init (connection status + version only; store initializes settings)
  useEffect(() => {
    (async () => {
      try {
        const { session_token, sync_cooldown_until } = await chrome.storage.local.get([
          'session_token',
          'sync_cooldown_until',
        ]);
        setStatus((prev) => ({ ...prev, isConnected: !!session_token }));
        if (Number.isFinite(sync_cooldown_until)) setCooldownUntil(Number(sync_cooldown_until));
        // settings are initialized via store; avoid local duplication here
      } catch (e) {
        console.error(e);
      }
    })();

    try {
      const mf = chrome.runtime.getManifest?.();
      if (mf?.version) setVersion(mf.version);
    } catch {}
  }, []);

  // Initialize store and entitlements once
  useEffect(() => {
    (async () => {
      await fetchPublicConfig();
      await fetchEntitlementsStore();
      await initFromStorage();
      // default method depends on build flags; Pro status no longer gates OAuth
    })();
    if (import.meta.env.DEV) {
      const onDevPlan = (e: any) => {
        const p = e?.detail?.plan as 'free' | 'pro' | undefined;
        if (p === 'free' || p === 'pro') {
          setPlan(p);
          // connection method no longer switches by plan
        }
      };
      window.addEventListener('dev:plan-change', onDevPlan);
      return () => window.removeEventListener('dev:plan-change', onDevPlan);
    }
  }, []);

  // Reflect store changes into local UI state (interval is staged for input)
  useEffect(() => {
    setInterval(intervalHours);
  }, [intervalHours]);

  // drive countdown ticks while cooldown active
  useEffect(() => {
    if (cooldownUntil && cooldownUntil > Date.now()) {
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = window.setInterval(() => setTick((t) => t + 1), 1000) as any;
      return () => {
        if (tickTimerRef.current) {
          window.clearInterval(tickTimerRef.current);
          tickTimerRef.current = null;
        }
      };
    } else {
      if (tickTimerRef.current) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
    }
  }, [cooldownUntil]);

  const remainSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    const s = Math.ceil((cooldownUntil - Date.now()) / 1000);
    return s > 0 ? s : 0;
  }, [cooldownUntil, tick]);

  // actions
  const connectOAuth = async () => {
    try {
      setStatus((prev) => ({ ...prev, isLoading: true, error: undefined }));
      const res = await sendMessage({ type: Messages.NOTION_OAUTH });
      if (res?.ok) {
        setStatus((prev) => ({ ...prev, isConnected: true, isLoading: false }));
        // Refresh entitlements after login (store will enforce)
        await fetchEntitlementsStore();
        show({
          variant: 'success',
          title: 'Connected successfully!',
          description: 'Your Notion workspace is now connected.',
        });
      } else {
        setStatus((prev) => ({ ...prev, isLoading: false }));
        show({
          variant: 'error',
          title: 'Connection failed',
          description: res?.error,
        });
      }
    } catch (e) {
      setStatus((prev) => ({ ...prev, isLoading: false }));
      show({ variant: 'error', title: 'Connection failed', description: String(e) });
    }
  };

  const handleDisconnect = async () => {
    setStatus((prev) => ({ ...prev, isLoading: false, error: undefined, isConnected: false }));
    await sendMessage({ type: Messages.LOGOUT });
    setPlan('free');
    show({
      variant: 'info',
      title: 'Disconnected',
      description: 'Your Notion connection has been removed.',
    });
  };

  const handleSyncAllBookmarks = async () => {
    if (remainSeconds > 0) {
      show({ variant: 'warning', title: `Please wait ${remainSeconds}s`, description: 'You are in cooldown. Try again shortly.' });
      return;
    }
    if (!status.isConnected || status.isLoading) return;
    setStatus((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await sendMessage({ type: Messages.SYNC_ALL_BOOKMARKS });
      if (!response?.success) {
        setStatus((prev) => ({
          ...prev,
          error: response?.error || 'Failed to start sync',
          isLoading: false,
        }));
        show({ variant: 'error', title: 'Sync failed to start', description: response?.error });
        return;
      }
      const pollInterval = 1000;
      const maxDurationMs = 5 * 60 * 1000;
      const start = Date.now();
      const poll = async (): Promise<void> => {
        const { sync_in_progress, last_sync, last_sync_error } = await chrome.storage.local.get([
          'sync_in_progress',
          'last_sync',
          'last_sync_error',
        ]);
        if (!sync_in_progress) {
          setStatus((prev) => ({
            ...prev,
            isLoading: false,
            lastSync: last_sync || new Date().toISOString(),
            error: last_sync_error || undefined,
          }));
          if (last_sync_error) {
            show({ variant: 'error', title: 'Sync failed', description: String(last_sync_error) });
          } else {
            show({ variant: 'success', title: 'Sync complete' });
          }
          return;
        }
        if (Date.now() - start > maxDurationMs) {
          setStatus((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Sync taking longer than expected. It may still continue in the background.',
          }));
          show({
            variant: 'warning',
            title: 'Sync is taking longer than expected',
            description: 'It may still continue in the background.',
          });
          return;
        }
        setTimeout(poll, pollInterval);
      };
      setTimeout(poll, pollInterval);
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') return;
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
      show({
        variant: 'error',
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const saveSyncSettings = async (nextAuto?: boolean, nextInterval?: number) => {
    try {
      await saveSyncSettingsStore(nextAuto, nextInterval);
    } catch (e) {
      show({
        variant: 'error',
        title: 'Failed to save sync settings',
        description: String(e),
      });
    }
  };

  const onToggleAuto = async () => {
    if (!hasFeature('auto-sync')) return;
    const next = !autoSyncStore;
    await saveSyncSettings(next, undefined);
  };
  const onIntervalChange = (v: string) => {
    const n = Number(v);
    if (!Number.isNaN(n)) setInterval(n);
  };
  const onIntervalBlur = async () => {
    await saveSyncSettings(undefined, interval);
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      <PageHeader />
      <main className="flex-1 w-full bg-gray-50 flex flex-row justify-center items-start p-10 gap-6">
        <Sidebar active={route} onNavigate={navigate} />
        <section className="w-full space-y-6 max-w-3xl">
          {route === 'general' && (
            <>
              <OverviewSection status={status} plan={plan} bookmarkCount={bookmarkCount} />
              <ConnectionSection
                status={status}
                onConnectOAuth={connectOAuth}
                onDisconnect={handleDisconnect}
                onSyncNow={handleSyncAllBookmarks}
                cooldownSeconds={remainSeconds}
              />
              <SyncSettingsSection
                autoSync={autoSyncStore}
                onToggleAuto={onToggleAuto}
                interval={interval}
                onIntervalChange={onIntervalChange}
                onIntervalBlur={onIntervalBlur}
                isPro={isPro()}
                canAutoSync={hasFeature('auto-sync')}
                minIntervalHours={getEffectiveLimits().minIntervalHours}
              />
            </>
          )}
          {route === 'billing' && <BillingSection plan={plan} />}
          {route === 'tutorials' && <TutorialsSection plan={plan} />}
          {route === 'faq' && <FAQSection />}
          {route === 'about' && <AboutSection version={version} />}
        </section>
      </main>
    </div>
  );
}
