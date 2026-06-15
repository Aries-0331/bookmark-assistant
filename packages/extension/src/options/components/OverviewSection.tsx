import { AlertCircle, CheckCircle } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { relativeTime } from '../../utils/common';
import { useAppStore } from '../store';
import { RouteId } from '../router';
import { createTranslator } from '../../utils/i18n';

export function OverviewSection({ onNavigate }: { onNavigate: (to: RouteId) => void }) {
  const { t } = createTranslator();
  const { isConnected, isPro, bookmarkCount, lastSync } = useAppStore();
  return (
    <SectionCard id="overview" title={t('overview_title')} isPro={isPro} onNavigate={onNavigate}>
      <div className="flex justify-between flex-wrap text-gray-600 bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-col items-center gap-2 p-2">
          <span>{t('overview_status')}</span>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${
              isConnected
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t('connected')}
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> {t('disconnected')}
              </>
            )}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2">
          <span>{t('overview_bookmarks')}</span>
          <span className="text-center text-gray-900 font-medium">
            {isConnected ? bookmarkCount : '-'}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2">
          <span>{t('overview_last_sync')}</span>
          <span className="text-center text-sm text-gray-900">
            {isConnected ? relativeTime(lastSync) : '-'}
          </span>
        </div>
        {/* Errors are displayed via top-center toasts */}
      </div>
    </SectionCard>
  );
}
