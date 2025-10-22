import { SectionCard } from './SectionCard';

interface Props {
  autoSync: boolean;
  onToggleAuto: () => void | Promise<void>;
  interval: number;
  onIntervalChange: (v: string) => void;
  onIntervalBlur: () => void | Promise<void>;
  isPro?: boolean;
}

export function SyncSettingsSection({
  autoSync,
  onToggleAuto,
  interval,
  onIntervalChange,
  onIntervalBlur,
  isPro = false,
}: Props) {
  const isLocked = !isPro;
  const displayInterval = isLocked ? 12 : interval; // 12 hours = 720 minutes
  return (
    <SectionCard
      id="sync"
      title="Sync Settings"
      description="Configure how and when your bookmarks are synchronized"
      advanced={true}
      isPro={isPro}
    >
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm text-gray-900">Auto Sync</div>
            <div className="text-xs text-gray-500">
              Automatically sync bookmarks in the background
            </div>
          </div>
          <button
            role="switch"
            aria-checked={autoSync}
            onClick={onToggleAuto}
            className={`w-10 h-6 rounded-full p-0.5  flex items-center transition-colors ${autoSync ? 'bg-gray-900' : 'bg-gray-300'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLocked}
            title={isLocked ? 'Upgrade to Pro to enable Auto Sync' : undefined}
          >
            <span
              className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${autoSync ? 'translate-x-4' : ''}`}
            />
          </button>
        </div>

        <div className="mt-3 max-w-xs">
          <label className="grid gap-1 text-xs">
            <span className="text-gray-600">Sync Interval (hours)</span>
            <input
              type="number"
              min={0.5}
              value={displayInterval}
              onChange={(e) => onIntervalChange(e.target.value)}
              onBlur={onIntervalBlur}
              disabled={!autoSync || isLocked}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
              aria-describedby={isLocked ? 'sync-interval-note' : undefined}
            />
          </label>
          <div id="sync-interval-note" className="text-[11px] text-gray-500 mt-1">
            Minimum: 0.5 hours{isLocked ? ' · Free plan uses a fixed 12-hour interval' : ''}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
