import { useEffect, useState } from 'react';
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
import { ALLOW_OAUTH, SHOW_BILLING } from './features';
export default function Options() {
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
  } = useAppStore();
  // UI state
  // connection method is a binary choice now (decided by build flags)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // derive connection from status; no separate connected state needed
  const [version, setVersion] = useState<string>('');

  // data state
  const [status, setStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: '',
  });
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [autoSync, setAutoSync] = useState<boolean>(autoSyncStore);
  const [interval, setInterval] = useState<number>(intervalHours);

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
        'sync_in_progress' in changes || 'last_sync' in changes || 'last_sync_error' in changes;
      if (!hasWatched) return;

      if (storageTimer) window.clearTimeout(storageTimer);
      storageTimer = window.setTimeout(() => {
        if (!isMounted) return;
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

  // init
  useEffect(() => {
    (async () => {
      try {
        const { session_token, notion_token, notion_database_id, auto_sync, sync_interval_hours } =
          await chrome.storage.local.get([
            'session_token',
            'notion_token',
            'notion_database_id',
            'auto_sync',
            'sync_interval_hours',
          ]);
        setStatus((prev) => ({ ...prev, isConnected: !!session_token }));
        setToken(notion_token || '');
        setDatabaseId(notion_database_id || '');
        setAutoSync(!!auto_sync);
        setInterval(Number(sync_interval_hours) || 0.5);
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

  // Reflect store changes into local UI state
  useEffect(() => {
    setAutoSync(autoSyncStore);
  }, [autoSyncStore]);
  useEffect(() => {
    setInterval(intervalHours);
  }, [intervalHours]);

  // no-op memo removed after refactor; saving is passed to child components directly

  // actions
  const connectOAuth = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'NOTION_OAUTH' });
      if (res?.ok) {
        setStatus((prev) => ({ ...prev, isConnected: true }));
        // Refresh entitlements after login (store will enforce)
        await fetchEntitlementsStore();
      } else {
        setError(res?.error || 'OAuth failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setStatus((prev) => ({ ...prev, isLoading: false, error: undefined, isConnected: false }));
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    setPlan('free');
  };

  const saveManual = async () => {
    setSaving(true);
    setError(null);
    try {
      await chrome.storage.local.set({
        notion_token: token.trim(),
        notion_database_id: databaseId.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save token');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAllBookmarks = async () => {
    if (!status.isConnected) return;
    setStatus((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SYNC_ALL_BOOKMARKS' });
      if (!response?.success) {
        setStatus((prev) => ({
          ...prev,
          error: response?.error || 'Failed to start sync',
          isLoading: false,
        }));
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
          return;
        }
        if (Date.now() - start > maxDurationMs) {
          setStatus((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Sync taking longer than expected. It may still continue in the background.',
          }));
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
    }
  };

  const saveSyncSettings = async (nextAuto?: boolean, nextInterval?: number) => {
    try {
      await saveSyncSettingsStore(nextAuto, nextInterval);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save sync settings');
    }
  };

  const onToggleAuto = async () => {
    const next = !autoSync;
    setAutoSync(next);
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
                mode={ALLOW_OAUTH ? 'oauth' : 'manual'}
                status={status}
                saving={saving}
                error={error}
                token={token}
                setToken={setToken}
                databaseId={databaseId}
                setDatabaseId={setDatabaseId}
                onConnectOAuth={connectOAuth}
                onDisconnect={handleDisconnect}
                onSaveManual={saveManual}
                onSyncNow={handleSyncAllBookmarks}
              />
              <SyncSettingsSection
                autoSync={autoSync}
                onToggleAuto={onToggleAuto}
                interval={interval}
                onIntervalChange={onIntervalChange}
                onIntervalBlur={onIntervalBlur}
                isPro={isPro()}
              />
            </>
          )}
          {route === 'billing' && SHOW_BILLING && <BillingSection plan={plan} />}
          {route === 'tutorials' && <TutorialsSection plan={plan} />}
          {route === 'faq' && <FAQSection />}
          {route === 'about' && <AboutSection version={version} />}
        </section>
      </main>
    </div>
  );
}
