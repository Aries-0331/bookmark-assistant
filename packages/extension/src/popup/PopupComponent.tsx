import { AlertCircle, CheckCircle, Crown, RefreshCw, Settings, Link, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../options/store';
import { sendMessage, Messages } from '../utils/message';
import { relativeTime } from '../utils/common';
import { createTranslator } from '../utils/i18n';

function SaveCurrentPageButton() {
  const { t } = createTranslator();
  const { isConnected } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!isConnected || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await sendMessage({ type: Messages.SAVE_CURRENT_PAGE });
      if (!result.success) {
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to save current page:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-sm text-gray-500 px-4 py-2 text-center">
        {t('notConnectedMessage')}
      </div>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className="h-12 w-full flex items-center justify-center gap-1.5 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSaving ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {t('saving')}
        </>
      ) : (
        <>
          <Save className="w-3.5 h-3.5" />
          {t('saveCurrentPage')}
        </>
      )}
    </button>
  );
}

export default function Popup() {
  const { t } = createTranslator();
  const {
    isConnected,
    lastSync,
    bookmarkCount,
    isPro,
    isSyncing,
    isConnecting,
    refreshConnection,
  } = useAppStore();

  const hasInitialized = useRef(false);

  useEffect(() => {
    const loadState = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      await refreshConnection();
    };
    loadState();
  }, []);

  const handleConnect = async () => {
    if (isConnecting) return;

    try {
      const result = await sendMessage({ type: Messages.NOTION_OAUTH });
      if (result.success) {
        await refreshConnection();
      } else {
        console.error('Connection failed:', result.error);
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleSync = async () => {
    if (!isConnected || isSyncing) return;

    try {
      const result = await sendMessage({ type: Messages.SYNC_ALL_BOOKMARKS });
      if (!result.success) {
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
    window.close();
  };

  return (
    <div className="w-[380px] bg-white">
      {/* Header */}
      <div className="bg-white text-gray-800 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.png" alt="Logo" className="w-8 h-8" />
          <h1 className="min-w-0 flex-1 text-base font-semibold">{t('popup_title')}</h1>
          <button
            onClick={openSettings}
            aria-label={t('popup_settings')}
            title={t('popup_settings')}
            className="!h-8 !w-8 shrink-0 !p-0 !border-0 !bg-transparent flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:!bg-gray-100 transition-colors"
          >
            <Settings aria-hidden="true" strokeWidth={2.25} className="!block !h-4 !w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-2 pb-4 space-y-4">
        {/* Status Card */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('popup_status')}</span>
            {isConnected ? (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs border text-green-700 bg-green-50 border-green-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t('popup_connected')}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs border text-red-700 bg-red-50 border-red-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> {t('popup_not_connected')}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('popup_last_sync')}</span>
            <span className="text-gray-900">{isConnected ? relativeTime(lastSync) : '-'}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('popup_bookmarks')}</span>
            <span className="text-gray-900 font-medium">{isConnected ? bookmarkCount : '-'}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('popup_plan')}</span>
            {isPro ? (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full">
                <Crown className="w-3 h-3" />
                {t('pro')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full">
                {t('free')}
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={isConnected ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}>
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="h-12 flex items-center justify-center gap-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('popup_connecting')}
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  {t('popup_connect_to_notion')}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="h-12 flex items-center justify-center gap-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? t('popup_syncing') : t('syncNow')}
            </button>
          )}

          {isConnected ? <SaveCurrentPageButton /> : null}
        </div>
      </div>
    </div>
  );
}
