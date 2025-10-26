import { Shield, RefreshCcw, Unplug } from 'lucide-react';
import Button from '../button';
import { SectionCard } from './SectionCard';
import { SyncStatus } from '../types';

interface Props {
  status: SyncStatus;
  onConnectOAuth: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onSyncNow: () => void | Promise<void>;
  cooldownSeconds?: number;
}

export function ConnectionSection(props: Props) {
  const { status, onConnectOAuth, onDisconnect, onSyncNow, cooldownSeconds = 0 } = props;
  const inCooldown = typeof cooldownSeconds === 'number' && cooldownSeconds > 0;

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
          {status.isConnected ? (
            <div className="w-full flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={onSyncNow}
                isLoading={!!status.isLoading}
                disabled={inCooldown}
                text={inCooldown ? `Sync in ${cooldownSeconds}s` : 'Sync Now'}
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
              isLoading={status.isLoading}
              text="Connect to Notion"
              loadingText="Connecting…"
            />
          )}
        </div>
      </div>
    </SectionCard>
  );
}
