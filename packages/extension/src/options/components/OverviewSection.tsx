import { AlertCircle, CheckCircle, Crown, Sparkles } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { relativeTime } from '../../utils/common';
import { useAppStore } from '../store';

export function OverviewSection() {
  const { isConnected, isPro, bookmarkCount, lastSync } = useAppStore();
  return (
    <SectionCard id="overview" title="Overview">
      <div className="flex justify-between flex-wrap text-gray-600 bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-col items-center gap-2 p-2">
          <span>Status</span>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${
              isConnected
                ? 'text-green-700 bg-green-50 border-green-200'
                : 'text-red-700 bg-red-50 border-red-200'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Connected
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Disconnected
              </>
            )}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2">
          <span>Plan</span>
          {isPro ? (
            <span className="flex items-center gap-1 text-sm font-semibold px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 border-0 shadow-sm rounded-full">
              <Crown className="w-3 h-3" />
              Pro
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm px-2.5 py-0.5 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-full">
              <Sparkles className="w-3 h-3" />
              Free
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 p-2">
          <span>Bookmarks</span>
          <span className="text-center text-gray-900">{isConnected ? bookmarkCount : '-'}</span>
        </div>
        <div className="flex flex-col items-center gap-2 p-2">
          <span>Last sync</span>
          <span className="text-center text-sm text-gray-900">
            {isConnected ? relativeTime(lastSync) : '-'}
          </span>
        </div>
        {/* Errors are displayed via top-center toasts */}
      </div>
    </SectionCard>
  );
}
