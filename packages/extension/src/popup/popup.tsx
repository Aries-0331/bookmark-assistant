import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Settings } from 'lucide-react';

interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  isLoading?: boolean;
}

export default function Popup() {
  const [status, setStatus] = useState<SyncStatus>({ isConnected: false });
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);

  const resizePopupToContent = () => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (!root || !body) return;
      root.style.height = 'auto';
      body.style.height = 'auto';
      requestAnimationFrame(() => {
        const h = Math.max(body.scrollHeight, root.scrollHeight);
        root.style.height = `${h}px`;
        body.style.height = `${h}px`;
      });
    } catch {}
  };

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

  useEffect(() => {
    resizePopupToContent();
  }, [status.error, status.isLoading, status.lastSync, status.isConnected]);

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

  const handleConnect = async () => {
    setStatus((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await chrome.runtime.sendMessage({ type: 'NOTION_OAUTH' });
      if (response.ok) {
        setStatus((prev) => ({ ...prev, isConnected: true, error: undefined, isLoading: false }));
      } else {
        setStatus((prev) => ({
          ...prev,
          error: response.error || 'Connection failed',
          isLoading: false,
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') return;
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
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

  const openOptions = () => chrome.runtime.openOptionsPage();

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

  // Settings now lives in a dedicated options page; popup always renders home.

  return (
    <div className="w-[360px] p-4 bg-gray-50 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">N</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Notion Bookmark Sync</h1>
        </div>
        <button
          onClick={openOptions}
          title="Settings"
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-600">Status</span>
          {status.isConnected ? (
            <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 bg-red-50 text-red-700 hover:bg-red-50 border-red-200">
              <AlertCircle className="h-3 w-3 mr-1" />
              Disconnected
            </span>
          )}
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
        </div>
      </div>

      {status.error && (
        <div className="mx-4 mb-2 p-2 rounded-lg border bg-red-50 border-red-200">
          <p className="text-xs text-red-600">{status.error}</p>
        </div>
      )}

      <div>
        {!status.isConnected ? (
          <button
            onClick={handleConnect}
            disabled={status.isLoading}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
          >
            {status.isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Connecting…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v14m7-7H5"
                  />
                </svg>
                Connect to Notion
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleSyncAllBookmarks}
            disabled={status.isLoading}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
          >
            {status.isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Sync Now
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
{
  /* Status card */
}
