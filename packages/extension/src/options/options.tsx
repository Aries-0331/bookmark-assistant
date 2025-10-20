import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  CheckCircle,
  ExternalLink,
  RefreshCcw,
  RefreshCwOff,
  Shield,
} from 'lucide-react';
import Button from './button';

type Tab = 'oauth' | 'manual';
interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  isLoading?: boolean;
}
export default function Options() {
  // UI state
  const [active, setActive] = useState<Tab>('oauth');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
    checkConnectionStatus();
    (async () => {
      try {
        const tree = await chrome.bookmarks.getTree();
        let count = 0;
        const walk = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
          for (const n of nodes) {
            if (n.url) count++;
            if (n.children) walk(n.children);
          }
        };
        if (tree?.length) walk(tree);
        setBookmarkCount(count);
      } catch {}
    })();
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') return;
      const watchedKeys = ['sync_in_progress', 'last_sync', 'last_sync_error'];
      const hasWatched = watchedKeys.some((k) => k in changes);
      if (!hasWatched) return;
      setStatus((prev) => ({
        ...prev,
        isLoading: changes.sync_in_progress ? !!changes.sync_in_progress.newValue : prev.isLoading,
        lastSync: changes.last_sync ? changes.last_sync.newValue : prev.lastSync,
        error: changes.last_sync_error ? changes.last_sync_error.newValue || undefined : prev.error,
      }));
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const result = await chrome.storage.local.get([
        'session_token',
        'last_sync',
        'sync_in_progress',
        'last_sync_error',
        'notion_token',
      ]);
      setStatus({
        isConnected: !!result.session_token,
        lastSync: result.last_sync,
        error: result.last_sync_error || undefined,
        isLoading: !!result.sync_in_progress,
      });
    } catch {
      setStatus({
        isConnected: false,
        error: 'Failed to check connection status',
        isLoading: false,
      });
    }
  };

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

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1200);
    return () => clearTimeout(t);
  }, [saved]);

  const disableSave = useMemo(() => saving, [saving]);

  // actions
  const connectOAuth = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'NOTION_OAUTH' });
      if (res?.ok) {
        setStatus((prev) => ({ ...prev, isConnected: true }));
        setSaved(true);
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
  };

  const saveManual = async () => {
    setSaving(true);
    setError(null);
    try {
      await chrome.storage.local.set({
        notion_token: token.trim(),
        notion_database_id: databaseId.trim(),
      });
      setSaved(true);
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
    const min = 5;
    const raw = typeof nextInterval === 'number' ? nextInterval : interval;
    const valInterval = Math.max(min, Math.floor(raw));
    try {
      await chrome.storage.local.set({ auto_sync: valAuto, sync_interval_minutes: valInterval });
      setSaved(true);
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

  const lastUpdated = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date()),
    []
  );

  const relativeTime = (iso?: string) => {
    if (!iso) return 'No sync yet';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'No sync yet';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="w-full px-4 md:px-6 h-14 flex items-center justify-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">Notion Bookmark Sync</span>
              <span className="text-[11px] text-gray-500">Settings</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full bg-gray-50 flex flex-col items-center p-8 gap-6">
        <section className="w-full space-y-6 max-w-2xl">
          {/* Status */}
          <div
            id="status"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">Status</h2>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${
                  status.isConnected
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {status.isConnected ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Disconnected
                  </>
                )}
              </span>
            </div>

            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Bookmarks</span>
                <span className="text-gray-900">{bookmarkCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Last sync</span>
                <span className="text-gray-900">{relativeTime(status.lastSync)}</span>
              </div>
              {status.error && (
                <div className="mt-2 p-2 rounded border bg-red-50 border-red-200 text-xs text-red-600">
                  {status.error}
                </div>
              )}
            </div>
          </div>
          {/* Connection */}
          <div
            id="connection"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <h2 className="text-base font-medium text-gray-900">Connection</h2>
            <p className="text-sm text-gray-500 mb-3">
              Connect your Notion workspace to sync bookmarks
            </p>
            <div className="w-full flex bg-gray-50 p-1 rounded-2xl border border-gray-200 text-xs sm:text-sm font-medium mb-3">
              <button
                className={`flex-1 py-2 rounded-xl ${
                  active === 'oauth'
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                    : 'text-gray-600'
                }`}
                onClick={() => setActive('oauth')}
              >
                OAuth (Recommended)
              </button>
              <button
                className={`flex-1 py-2 rounded-xl ${
                  active === 'manual'
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900'
                    : 'text-gray-600'
                }`}
                onClick={() => setActive('manual')}
              >
                Manual Token
              </button>
            </div>

            {active === 'oauth' ? (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      Secure OAuth Connection
                    </div>
                    <p className="text-sm text-gray-600">
                      Connect securely with Notion's OAuth. No need to manage tokens manually.
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  {status.isConnected ? (
                    <div className="w-full flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={handleSyncAllBookmarks}
                        isLoading={!!status.isLoading}
                        text="Sync Now"
                        loadingText="Syncing…"
                        icon={<RefreshCcw size={16} />}
                        fullWidth={false}
                      />
                      <Button
                        className="w-12"
                        onClick={handleDisconnect}
                        icon={<RefreshCwOff size={16} />}
                        fullWidth={false}
                      />
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={connectOAuth}
                      isLoading={saving}
                      text="Connect to Notion"
                      loadingText="Connecting…"
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveManual();
                  }}
                >
                  <label className="grid gap-1 text-xs">
                    <span className="text-gray-600">Integration Token</span>
                    <input
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      type="password"
                      placeholder="secret_..."
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    <span className="text-gray-600">Database ID</span>
                    <input
                      value={databaseId}
                      onChange={(e) => setDatabaseId(e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      className="w-full"
                      type="submit"
                      isLoading={saving}
                      disabled={disableSave}
                      text={saving ? 'Saving…' : 'Save & Connect'}
                    />
                    {saved && <span className="text-[11px] text-green-700">Saved</span>}
                    {error && <span className="text-[11px] text-red-600">{error}</span>}
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Sync Settings */}
          <div
            id="sync"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <h2 className="text-base font-medium text-gray-900 mb-3">Sync Settings</h2>
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-sm text-gray-900">Auto Sync</div>
                <div className="text-xs text-gray-500">
                  Automatically sync bookmarks in the background
                </div>
              </div>
              <button
                role="switch"
                aria-checked={autoSync}
                onClick={onToggleAuto}
                className={`w-10 h-6 rounded-full p-0.5  flex items-center transition-colors ${
                  autoSync ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${
                    autoSync ? 'translate-x-4' : ''
                  }`}
                />
              </button>
            </div>

            <div className="mt-3 max-w-xs">
              <label className="grid gap-1 text-xs">
                <span className="text-gray-600">Sync Interval (minutes)</span>
                <input
                  type="number"
                  min={30}
                  value={interval}
                  onChange={(e) => onIntervalChange(e.target.value)}
                  onBlur={onIntervalBlur}
                  disabled={!autoSync}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
                />
              </label>
              <div className="text-[11px] text-gray-500 mt-1">Minimum: 30 minutes</div>
            </div>
          </div>

          {/* About */}
          <div
            id="about"
            className="scroll-mt-24 bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <h2 className="text-base font-medium text-gray-900">About</h2>
            <p className="text-sm text-gray-500 mb-3">Information about Notion Bookmark Sync</p>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-3 text-gray-700">
                  <Bookmark className="w-7 h-7" />
                </div>
                <div className="text-lg font-semibold text-gray-900">Notion Bookmark Sync</div>
                <div className="text-xs text-gray-500">Version {version || '—'}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Sync your Chrome bookmarks to Notion seamlessly
                </div>
              </div>

              <hr className="my-5 border-gray-200" />

              <div className="grid grid-cols-1 grid-rows-2 gap-4 text-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">License</span>
                  <span className="text-gray-900 font-medium">MIT</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900 font-medium">{lastUpdated}</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <a
                  href="https://github.com/Aries-0331/bookmarks_to_notion"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center gap-2 text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  aria-label="View on GitHub"
                >
                  <ExternalLink className="w-4 h-4" /> View on GitHub
                </a>
                <a
                  href="https://github.com/Aries-0331/bookmarks_to_notion#readme"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center gap-2 text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  aria-label="Documentation"
                >
                  <ExternalLink className="w-4 h-4" /> Documentation
                </a>
                <a
                  href="https://github.com/Aries-0331/bookmarks_to_notion/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center gap-2 text-gray-800 hover:bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                  aria-label="Report an Issue"
                >
                  <ExternalLink className="w-4 h-4" /> Report an Issue
                </a>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm text-gray-700">
                Made with <span aria-hidden>❤️</span> for the Notion community
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
