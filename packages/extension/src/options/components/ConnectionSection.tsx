import { Shield, RefreshCcw, Unplug } from 'lucide-react';
import Button from '../button';
import { SectionCard } from './SectionCard';
import { useAppStore } from '../store';
import { useState } from 'react';
import { Messages, sendMessage } from '../../shared/messaging';
import { useToast } from './Toast';

export function ConnectionSection() {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const { show } = useToast();
  const { isConnected } = useAppStore();

  const onConnectOAuth = async () => {
    try {
      setIsConnecting(true);
      await sendMessage({ type: Messages.NOTION_OAUTH });
      setIsConnecting(false);
    } catch (e) {
      setIsConnecting(false);
      show({ variant: 'error', title: 'Connection failed', description: String(e) });
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
    await sendMessage({ type: Messages.SYNC_ALL_BOOKMARKS });
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
              onClick={onConnectOAuth}
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
