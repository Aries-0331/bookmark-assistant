import { Shield, RefreshCcw, Unplug } from 'lucide-react';
import Button from './Button';
import { SectionCard } from './SectionCard';
import { useAppStore } from '../store';
import { Messages, sendMessage } from '../../utils/message';
import { useToast } from '../hook/useToast';

export function ConnectionSection() {
  const { show } = useToast();
  const { isConnecting, isConnected, isSyncing, setIsConnecting, setIsSyncing } = useAppStore();

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
    } catch (error) {
      show({
        variant: 'error',
        title: 'Connection Failed',
        description: 'An error occurred while connecting to Notion.',
      });
    } finally {
      setIsConnecting(false);
    }
  };
  const onDisconnect = async () => {
    setIsSyncing(false);
    await sendMessage({ type: Messages.LOGOUT });
    show({
      variant: 'info',
      title: 'Disconnected',
      description: 'Your Notion connection has been removed.',
    });
  };

  const onSyncNow = async () => {
    if (!isConnected || isSyncing) return;
    setIsSyncing(true);
    try {
      await sendMessage({ type: Messages.SYNC_ALL_BOOKMARKS });
    } finally {
      setIsSyncing(false);
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
                onClick={onDisconnect}
                icon={<Unplug size={16} />}
                fullWidth={false}
                title="Disconnect"
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
      </div>
    </SectionCard>
  );
}
