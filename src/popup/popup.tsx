import { useState, useEffect } from "react";

interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  isLoading?: boolean;
}

export default function Popup() {
  const [status, setStatus] = useState<SyncStatus>({ isConnected: false });

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const result = await chrome.storage.local.get(['notion_token', 'last_sync']);
      setStatus({
        isConnected: !!result.notion_token,
        lastSync: result.last_sync,
        error: undefined,
        isLoading: false
      });
    } catch {
      setStatus({
        isConnected: false,
        error: 'Failed to check connection status',
        isLoading: false
      });
    }
  };

  const handleConnect = async () => {
    setStatus(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'NOTION_OAUTH' });
      
      if (response.ok) {
        setStatus({
          isConnected: true,
          error: undefined,
          isLoading: false
        });
      } else {
        setStatus(prev => ({
          ...prev,
          error: response.error || 'Connection failed',
          isLoading: false
        }));
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  };

  const handleSyncAllBookmarks = async () => {
    if (!status.isConnected) return;
    
    setStatus(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'SYNC_ALL_BOOKMARKS'
      });
      
      if (response.success) {
        setStatus(prev => ({
          ...prev,
          lastSync: new Date().toISOString(),
          isLoading: false
        }));
        
        // Store last sync time
        await chrome.storage.local.set({ last_sync: new Date().toISOString() });
      } else {
        setStatus(prev => ({
          ...prev,
          error: response.error || 'Sync failed',
          isLoading: false
        }));
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
    }
  };

  // Check if the error is about database configuration
  const isDatabaseConfigError = status.error?.includes('database not configured');
  const isSetupRequired = isDatabaseConfigError;

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
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
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
        <div className={`mb-4 p-3 rounded-lg border ${isDatabaseConfigError ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDatabaseConfigError ? 'bg-amber-100' : 'bg-red-100'}`}>
              {isDatabaseConfigError ? (
                <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDatabaseConfigError ? 'text-amber-800' : 'text-red-600'}`}>
                {isDatabaseConfigError ? 'Database Setup Required' : 'Error'}
              </p>
              <p className={`text-xs mt-1 ${isDatabaseConfigError ? 'text-amber-700' : 'text-red-600'}`}>
                {isDatabaseConfigError 
                  ? 'You need to create a Notion database first. Click "Setup Database" below to get started.'
                  : status.error
                }
              </p>
              {isDatabaseConfigError && (
                <button 
                  onClick={openOptions}
                  className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Setup Database
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
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
            {/* Primary Action - Sync All Bookmarks */}
            <button 
              onClick={handleSyncAllBookmarks} 
              disabled={status.isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {status.isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Sync All Bookmarks
                </>
              )}
            </button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={openOptions} 
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
              >
                Settings
              </button>
              <button 
                onClick={() => chrome.storage.local.remove('notion_token').then(() => setStatus(prev => ({ ...prev, isConnected: false })))} 
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
            : isSetupRequired 
            ? 'Complete database setup in Settings to enable bookmark syncing'
            : 'Click "Sync All Bookmarks" to export all your Chrome bookmarks to Notion with content extraction'
          }
        </p>
      </div>
    </div>
  );
}
