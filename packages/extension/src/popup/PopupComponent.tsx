import { AlertCircle, CheckCircle, Crown, Sparkles, RefreshCw, Settings, Link } from 'lucide-react';
import { useAppStore } from '../options/store';
import { sendMessage, Messages } from '../utils/message';
import { relativeTime } from '../utils/common';
import { useState, useEffect } from 'react';

export default function Popup() {
  const { isConnected, lastSync, bookmarkCount, isPro, isSyncing, setIsSyncing, refreshConnection } =
    useAppStore();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Load connecting state from storage on mount
  useEffect(() => {
    const loadState = async () => {
      const { is_connecting, sync_in_progress } = await chrome.storage.local.get([
        'is_connecting',
        'sync_in_progress',
      ]);
      if (is_connecting) {
        setConnecting(true);
      }
      if (sync_in_progress) {
        setSyncing(true);
        setIsSyncing(true);
      }
    };
    loadState();

    // Listen for storage changes (OAuth completion)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.is_connecting?.newValue === false) {
        setConnecting(false);
        // Refresh connection state when OAuth completes
        refreshConnection();
      }
      if (changes.sync_in_progress?.newValue === false) {
        setSyncing(false);
        setIsSyncing(false);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [refreshConnection, setIsSyncing]);

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    // Persist connecting state so it survives popup close/reopen
    await chrome.storage.local.set({ is_connecting: true });
    
    try {
      const result = await sendMessage({ type: Messages.NOTION_OAUTH });
      if (result.success) {
        // Refresh connection state after successful OAuth
        await refreshConnection();
      } else {
        console.error('Connection failed:', result.error);
      }
    } catch (error) {
      console.error('Connection error:', error);
    } finally {
      setConnecting(false);
      // Clear connecting state
      await chrome.storage.local.set({ is_connecting: false });
    }
  };

  const handleSync = async () => {
    if (!isConnected || syncing || isSyncing) return;
    setSyncing(true);
    
    try {
      const result = await sendMessage({ type: Messages.SYNC_ALL_BOOKMARKS });
      if (!result.success) {
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
      // Note: Don't manually clear sync_in_progress or isSyncing here
      // The background script manages sync_in_progress and storage listener updates isSyncing
    }
  };

  const handleUpgrade = () => {
    chrome.runtime.openOptionsPage();
    setTimeout(() => {
      window.close();
    }, 100);
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
    window.close();
  };

  return (
    <div className="w-[380px] bg-white">
      {/* Header */}
      <div className="bg-white text-gray-800 p-4">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="Logo" className="w-6 h-6" />
          <h1 className="text-base font-semibold">Bookmark Assistant</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            {isConnected ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs border text-green-700 bg-green-50 border-green-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs border text-red-700 bg-red-50 border-red-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Not Connected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Sync</span>
            <span className="text-gray-900">{isConnected ? relativeTime(lastSync) : '-'}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Bookmarks</span>
            <span className="text-gray-900 font-medium">{isConnected ? bookmarkCount : '-'}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Plan</span>
            {isPro ? (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full">
                <Crown className="w-3 h-3" />
                Pro
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full">
                Free
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <Link className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} />
            {connecting ? 'Connecting...' : 'Connect to Notion'}
          </button>
        ) : (
          <div className={!isPro ? 'space-y-2' : ''}>
            <button
              onClick={handleSync}
              disabled={syncing || isSyncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${syncing || isSyncing ? 'animate-spin' : ''}`} />
              {syncing || isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>

            {!isPro && (
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro
              </button>
            )}
          </div>
        )}

        {/* Settings Link */}
        <button
          onClick={openSettings}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings & Billing
        </button>
      </div>
    </div>
  );
}
