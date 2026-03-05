import { useState, useEffect } from 'react';
import { useAppStore, FREE_INTERVAL_HOURS, PRO_MIN_INTERVAL_HOURS } from '../store';
import { SectionCard } from './SectionCard';
import { useToast } from '../hook/useToast';
import { RouteId } from '../router';
import { Switch } from '../../components/ui/switch';
import { createTranslator } from '../../utils/i18n';

export function SyncSettingsSection({ onNavigate }: { onNavigate: (to: RouteId) => void }) {
  const { t } = createTranslator();
  const { show } = useToast();
  const { isPro, autoSync, intervalHours, setAutoSync, saveSyncSettings } = useAppStore();
  const [value, setValue] = useState<number>(intervalHours);
  const minIntervalHours = isPro ? PRO_MIN_INTERVAL_HOURS : FREE_INTERVAL_HOURS;

  // Sync local value with store intervalHours
  useEffect(() => {
    setValue(intervalHours);
  }, [intervalHours]);

  const onToggleAuto = async () => {
    const next = !autoSync;

    // Security: Validate with server before enabling
    // Users cannot bypass payment by modifying localStorage
    if (next && !isPro) {
      show({
        variant: 'error',
        title: t('pro_feature_title'),
        description: t('pro_feature_desc'),
      });
      return;
    }

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
        title: t('error_save_settings_failed'),
        description: String(e),
      });
    }
  };

  return (
    <SectionCard
      id="sync"
      title={t('nav_sync_settings')}
      description={t('sync_settings_desc')}
      advanced={true}
      isPro={isPro}
      onNavigate={onNavigate}
    >
      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-sm text-foreground">{t('auto_sync_label')}</div>
            <div className="text-xs text-muted-foreground">{t('auto_sync_desc')}</div>
          </div>
          <div className="flex-shrink-0 w-fit">
            <Switch checked={autoSync} onCheckedChange={onToggleAuto} disabled={!isPro} />
          </div>
        </div>

        <div className="mt-3 max-w-xs">
          <label className="grid gap-1 text-xs">
            <span className="text-gray-600">{t('sync_interval_label')}</span>
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
            {t('sync_interval_min', [String(minIntervalHours)])}
            {!autoSync ? ` · ${t('sync_interval_free_note')}` : ''}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
