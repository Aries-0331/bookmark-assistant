import { useState } from 'react';
import { useAppStore } from '../store';
import { SectionCard } from './SectionCard';
import { useToast } from './Toast';

export function SyncSettingsSection() {
  const [value, setValue] = useState<number>(0);

  const { show } = useToast();
  const { isPro, autoSync, minIntervalHours, saveSyncSettings } = useAppStore();

  const handleSaveSyncSettings = async (nextAuto?: boolean, nextInterval?: number) => {
    try {
      await saveSyncSettings(nextAuto, nextInterval);
    } catch (e) {
      show({
        variant: 'error',
        title: 'Failed to save sync settings',
        description: String(e),
      });
    }
  };

  const onToggleAuto = async () => {
    const next = !autoSync;
    await handleSaveSyncSettings(next, undefined);
  };

  const onIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(Number(v));
  };

  const onIntervalBlur = async () => {
    await handleSaveSyncSettings(undefined, value);
  };

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
            className={`w-10 h-6 rounded-full p-0.5  flex items-center transition-colors ${autoSync ? 'bg-gray-900' : 'bg-gray-300'} ${!autoSync ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!autoSync}
            title={!autoSync ? 'Upgrade to Pro to enable Auto Sync' : undefined}
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
              value={value}
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
