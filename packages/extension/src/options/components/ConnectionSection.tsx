import { Shield, RefreshCcw, Unplug, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from './Button';
import { SectionCard } from './SectionCard';
import { useAppStore } from '../store';
import { Messages, sendMessage } from '../../utils/message';
import { useToast } from '../hook/useToast';

export function ConnectionSection() {
  const { show } = useToast();
  const { isConnecting, isConnected, isSyncing, setIsConnecting, lastSyncSummary } = useAppStore();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Show toast when sync summary changes
  useEffect(() => {
    if (lastSyncSummary?.type === 'no_changes') {
      const count = lastSyncSummary.count || 0;
      const bookmarkText = count === 1 ? 'bookmark' : 'bookmarks';
      show({
        variant: 'info',
        title: 'Everything is up to date',
        description: `All ${count} ${bookmarkText} are already synced to Notion.`,
      });
      // Clear the summary so it can be shown again on the next sync
      useAppStore.getState().setLastSyncSummary(undefined);
    }
  }, [lastSyncSummary, show]);

  const onConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await sendMessage({ type: Messages.NOTION_OAUTH });
      if (res.success) {
        show({
          variant: 'success',
          title: 'Connected',
          description: 'Your Notion workspace has been successfully connected.',
        });
      } else {
        show({
          variant: 'error',
          title: 'Connection Failed',
          description: 'Failed to connect to Notion. Please try again.',
        });
      }
    } catch {
      show({
        variant: 'error',
        title: 'Connection Failed',
        description: 'An error occurred while connecting to Notion.',
      });
    } finally {
      setIsConnecting(false);
    }
  };
  const handleDisconnectClick = () => {
    setShowDisconnectConfirm(true);
  };

  const onDisconnect = async () => {
    await sendMessage({ type: Messages.LOGOUT });
    setShowDisconnectConfirm(false);
    
    // Reset Zustand store state to reflect disconnection
    useAppStore.setState({
      isConnected: false,
      isPro: false,
      purchaseType: undefined,
      userId: '',
      userEmail: '',
      lastSync: '',
      isSyncing: false,
      lastSyncSummary: undefined,
      autoSync: false,
    });
    
    show({
      variant: 'success',
      title: 'Disconnected',
      description: 'Your Notion connection has been removed.',
    });
  };

  const onSyncNow = async () => {
    if (!isConnected || isSyncing) return;

    try {
      const result = await sendMessage(
        { type: Messages.SYNC_ALL_BOOKMARKS },
        { timeoutMs: 300_000 }
      );

      if (!result.success) {
        show({
          variant: 'error',
          title: 'Sync Failed',
          description: result.error || 'Failed to sync bookmarks',
        });
      } else {
        // Fallback: directly check storage for no_changes status
        // This handles cases where storage events don't propagate properly
        setTimeout(async () => {
          const { last_sync_summary, last_sync_count } = await chrome.storage.local.get([
            'last_sync_summary',
            'last_sync_count',
          ]);

          if (last_sync_summary === 'no_changes') {
            const count = last_sync_count || 0;
            const bookmarkText = count === 1 ? 'bookmark' : 'bookmarks';
            show({
              variant: 'info',
              title: 'Everything is up to date',
              description: `All ${count} ${bookmarkText} are already synced to Notion.`,
            });
          }
        }, 100);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== 'REQUEST_TIMEOUT') {
        show({
          variant: 'error',
          title: 'Sync Failed',
          description: error.message || 'Failed to sync bookmarks',
        });
      }
    }
  };

  return (
    <SectionCard
      id="connection"
      title="Connection"
      description="Connect your Notion workspace to sync bookmarks"
    >
      <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">Secure OAuth Connection</div>
            <p className="text-sm text-gray-600">
              Connect securely with Notion's OAuth. No need to manage tokens manually.
            </p>
          </div>
        </div>
        <div className="mt-3">
          {isConnected ? (
            <div className="w-full flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={onSyncNow}
                isSyncing={isSyncing}
                text="Sync Now"
                loadingText="Syncing…"
                icon={<RefreshCcw size={16} />}
                fullWidth={false}
              />
              <Button
                className="w-12"
                onClick={handleDisconnectClick}
                icon={<Unplug size={18} />}
                fullWidth={false}
                title=""
              />
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={onConnect}
              isConnecting={isConnecting}
              text="Connect to Notion"
              loadingText="Connecting…"
            />
          )}
        </div>

        {/* Confirmation Dialog */}
        {showDisconnectConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">Disconnect from Notion?</h3>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                This will remove your Notion workspace connection and clear all local settings.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚠️</span>
                  <h4 className="font-semibold text-blue-900">Important:</h4>
                </div>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>
                      Your synced bookmarks in Notion will <strong>not</strong> be deleted
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>Reconnecting will require setting up a new database</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>You'll need to sync bookmarks again after reconnecting</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() => setShowDisconnectConfirm(false)}
                  variant="secondary"
                  text="Cancel"
                />
                <Button
                  className="flex-1"
                  onClick={onDisconnect}
                  variant="destructive"
                  text="Disconnect"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
