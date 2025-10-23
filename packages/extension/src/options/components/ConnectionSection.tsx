import { Shield, RefreshCcw, Unplug } from 'lucide-react';
import Button from '../button';
import { SectionCard } from './SectionCard';
import { SyncStatus } from '../types';

interface Props {
  mode: 'oauth' | 'manual';
  status: SyncStatus;
  saving: boolean;
  error: string | null;
  token: string;
  setToken: (v: string) => void;
  databaseId: string;
  setDatabaseId: (v: string) => void;
  onConnectOAuth: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onSaveManual: () => void | Promise<void>;
  onSyncNow: () => void | Promise<void>;
}

export function ConnectionSection(props: Props) {
  const {
    mode,
    status,
    saving,
    error,
    token,
    setToken,
    databaseId,
    setDatabaseId,
    onConnectOAuth,
    onDisconnect,
    onSaveManual,
    onSyncNow,
  } = props;

  return (
    <SectionCard
      id="connection"
      title="Connection"
      description="Connect your Notion workspace to sync bookmarks"
    >
      {mode === 'oauth' ? (
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
              await onSaveManual();
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
                text={saving ? 'Saving…' : 'Save & Connect'}
              />
            </div>
          </form>
          {error && <span className="text-[11px] text-red-600">{error}</span>}
        </div>
      )}
    </SectionCard>
  );
}
