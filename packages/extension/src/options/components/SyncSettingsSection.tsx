import { useState } from 'react';
import { useAppStore, FREE_INTERVAL_HOURS, PRO_MIN_INTERVAL_HOURS } from '../store';
import { SectionCard } from './SectionCard';
import { useToast } from '../hook/useToast';
import { RouteId } from '../router';

export function SyncSettingsSection({ onNavigate }: { onNavigate: (to: RouteId) => void }) {
  const [value, setValue] = useState<number>(0);

  const { show } = useToast();
  const { isPro, autoSync, setAutoSync, saveSyncSettings } = useAppStore();
  const minIntervalHours = isPro ? PRO_MIN_INTERVAL_HOURS : FREE_INTERVAL_HOURS;

  const onToggleAuto = async () => {
    const next = !autoSync;
    setAutoSync(next);
  };

  const onIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(Number(v));
  };

  const onIntervalBlur = async () => {
    try {
      await saveSyncSettings(value);
    } catch (e) {
      show({
        variant: 'error',
        title: 'Failed to save sync settings',
        description: String(e),
      });
    }
  };

  return (
    <SectionCard
      id="sync"
      title="Sync Settings"
      description="Configure how and when your bookmarks are synchronized"
      advanced={true}
      isPro={isPro}
      onNavigate={onNavigate}
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
            className={`w-10 h-6 rounded-full p-0.5  flex items-center transition-colors ${autoSync ? 'bg-gray-900' : 'bg-gray-300'} ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isPro}
            title={!isPro ? 'Upgrade to Pro to enable Auto Sync' : undefined}
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
              min={minIntervalHours}
              value={value || minIntervalHours}
              onChange={onIntervalChange}
              onBlur={onIntervalBlur}
              disabled={!autoSync}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
              aria-describedby={!autoSync ? 'sync-interval-note' : undefined}
            />
          </label>
          <div id="sync-interval-note" className="text-[11px] text-gray-500 mt-1">
            Minimum: {minIntervalHours} hours
            {!autoSync ? ` · Free plan uses a fixed ${minIntervalHours}-hour interval` : ''}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
