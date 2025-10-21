import { useEffect, useState } from 'react';
import { serverAPI } from '../lib/server-api';
import { Sidebar } from './components/Sidebar';
import { PageHeader } from './components/SectionCard';
import { OverviewSection } from './components/OverviewSection';
import { ConnectionSection } from './components/ConnectionSection';
import { SyncSettingsSection } from './components/SyncSettingsSection';
import { AboutSection } from './components/AboutSection';
import {
  BillingSection,
  NotificationsSection,
  AdvancedSection,
  FAQSection,
  TutorialsSection,
} from './components/Placeholders';
import { useHashRoute } from './router';
import type { Plan, Tab, SyncStatus } from './types';
export default function Options() {
  const { route, navigate } = useHashRoute();
  const [plan, setPlan] = useState<Plan>('free');
  const isPro = plan === 'pro';
  // UI state
  const [active, setActive] = useState<Tab>('oauth');
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
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [interval, setInterval] = useState<number>(30);

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
        const {
          session_token,
          notion_token,
          notion_database_id,
          auto_sync,
          sync_interval_minutes,
        } = await chrome.storage.local.get([
          'session_token',
          'notion_token',
          'notion_database_id',
          'auto_sync',
          'sync_interval_minutes',
        ]);
        setStatus((prev) => ({ ...prev, isConnected: !!session_token }));
        setToken(notion_token || '');
        setDatabaseId(notion_database_id || '');
        setAutoSync(!!auto_sync);
        setInterval(Number(sync_interval_minutes) || 30);
      } catch (e) {
        console.error(e);
      }
    })();

    try {
      const mf = chrome.runtime.getManifest?.();
      if (mf?.version) setVersion(mf.version);
    } catch {}
  }, []);

  // Fetch entitlements from server once session is present
  useEffect(() => {
    (async () => {
      try {
        const { session_token } = await chrome.storage.local.get(['session_token']);
        if (!session_token) return;
        const ent = await serverAPI.getEntitlements();
        setPlan(ent.plan);
        setActive(ent.plan === 'pro' ? 'oauth' : 'manual');
      } catch (e) {
        // If entitlements fail (e.g., no server), default to 'free'
        setPlan('free');
        setActive('manual');
      }
    })();
  }, []);

  // Normalize sync interval when on Free plan: force 12 hours (720 minutes)
  useEffect(() => {
    (async () => {
      if (plan !== 'free') return;
      try {
        const { sync_interval_minutes } = await chrome.storage.local.get(['sync_interval_minutes']);
        const current = Number(sync_interval_minutes) || interval;
        if (current !== 720) {
          await chrome.storage.local.set({ sync_interval_minutes: 720 });
          setInterval(720);
        } else if (interval !== 720) {
          setInterval(720);
        }
      } catch {}
    })();
  }, [plan]);

  // no-op memo removed after refactor; saving is passed to child components directly

  // actions
  const connectOAuth = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'NOTION_OAUTH' });
      if (res?.ok) {
        setStatus((prev) => ({ ...prev, isConnected: true }));
        // Refresh entitlements after login
        try {
          const ent = await serverAPI.getEntitlements();
          setPlan(ent.plan);
        } catch {}
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
    const valAuto = typeof nextAuto === 'boolean' ? nextAuto : autoSync;
    // Enforce 12h for Free plan, otherwise apply min validation
    let valInterval: number;
    if (plan === 'free') {
      valInterval = 720;
    } else {
      const min = 5;
      const raw = typeof nextInterval === 'number' ? nextInterval : interval;
      valInterval = Math.max(min, Math.floor(raw));
    }
    try {
      await chrome.storage.local.set({ auto_sync: valAuto, sync_interval_minutes: valInterval });
      setInterval(valInterval);
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
      <main className="flex-1 w-full bg-gray-50 flex flex-row items-start p-10 gap-6">
        <Sidebar active={route} onNavigate={navigate} />
        <section className="w-full space-y-6 max-w-3xl">
          {route === 'general' && (
            <>
              <OverviewSection status={status} plan={plan} bookmarkCount={bookmarkCount} />
              <ConnectionSection
                isPro={isPro}
                active={active}
                setActive={setActive}
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
                isPro={isPro}
              />
            </>
          )}
          {route === 'billing' && <BillingSection />}
          {route === 'tutorials' && <TutorialsSection />}
          {route === 'faq' && <FAQSection />}
          {route === 'about' && <AboutSection version={version} />}
        </section>
      </main>
    </div>
  );
}
