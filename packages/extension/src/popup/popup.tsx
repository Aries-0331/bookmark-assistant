import { useState, useEffect } from 'react';

interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  isLoading?: boolean;
}

export default function Popup() {
  const [status, setStatus] = useState<SyncStatus>({ isConnected: false });

  // Resize the Chrome action popup to fit content whenever UI changes
  const resizePopupToContent = () => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (!root || !body) return;
      // Reset to auto first to allow shrink
      root.style.height = 'auto';
      body.style.height = 'auto';
      // Measure in next frame and set explicit height to avoid stale space
      requestAnimationFrame(() => {
        const h = Math.max(body.scrollHeight, root.scrollHeight);
        root.style.height = `${h}px`;
        body.style.height = `${h}px`;
      });
    } catch {}
  };

  useEffect(() => {
    checkConnectionStatus();
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

  // Recompute popup height on relevant status changes
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
      const response = await chrome.runtime.sendMessage({
        type: 'NOTION_OAUTH',
      });

      if (response.ok) {
        setStatus({
          isConnected: true,
          error: undefined,
          isLoading: false,
        });
      } else {
        setStatus((prev) => ({
          ...prev,
          error: response.error || 'Connection failed',
          isLoading: false,
        }));
      }
    } catch (error) {
      // Suppress timeout tips in UI; background will update storage flags
      if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') {
        // Keep spinner and rely on storage listener to flip state when done
        return;
      }
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
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_ALL_BOOKMARKS',
      });
      if (!response?.success) {
        setStatus((prev) => ({
          ...prev,
          error: response?.error || 'Failed to start sync',
          isLoading: false,
        }));
        return;
      }

      // Poll the sync state until it finishes
      const pollInterval = 1000;
      const maxDurationMs = 5 * 60 * 1000; // 5 minutes cap
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
      if (error instanceof Error && error.message === 'REQUEST_TIMEOUT') {
        // Keep spinner; background/storage will update UI
        return;
      }
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="w-80 p-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">N</span>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Notion Bookmark Sync</h1>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-3 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm font-medium">
            {status.isConnected ? 'Connected to Notion' : 'Not Connected'}
          </span>
        </div>

        {status.lastSync && (
          <p className="text-xs text-gray-600">
            Last sync: {new Date(status.lastSync).toLocaleString()}
          </p>
        )}
      </div>

      {/* Error Display */}
      {status.error && (
        <div className="mb-4 p-3 rounded-lg border bg-red-50 border-red-200">
          <p className="text-xs mt-1 text-red-600">{status.error}</p>
        </div>
      )}

      <div className="space-y-3">
        {!status.isConnected ? (
          <button
            onClick={handleConnect}
            disabled={status.isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg transition-colors font-medium"
          >
            {status.isLoading ? 'Connecting...' : 'Connect to Notion'}
          </button>
        ) : (
          <>
            <button
              onClick={handleSyncAllBookmarks}
              disabled={status.isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {status.isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Sync All Bookmarks
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={openOptions}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
              >
                Settings
              </button>
              <button
                onClick={() =>
                  setStatus((prev) => ({ ...prev, isConnected: false, error: undefined }))
                }
                className="border border-red-300 hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg transition-colors text-sm"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {!status.isConnected
            ? 'Connect your Notion account to start syncing your bookmarks'
            : 'Click "Sync All Bookmarks" to export all your Chrome bookmarks to Notion with content extraction'}
        </p>
      </div>
    </div>
  );
}
