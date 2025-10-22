import { SectionCard } from './SectionCard';
import {
  Crown,
  Sparkles,
  Zap,
  Bookmark as BookmarkIcon,
  Timer,
  SlidersHorizontal,
  Database,
  ShieldCheck,
  Mail,
} from 'lucide-react';
import type { Plan } from '../types';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

type FeatureItem = {
  icon: LucideIcon;
  text: string;
};

const PLAN_FEATURES: Record<'free' | 'pro', FeatureItem[]> = {
  free: [
    { icon: BookmarkIcon, text: '50 bookmarks per day' },
    { icon: Timer, text: '12-hour minimum interval' },
    { icon: Mail, text: 'Email support within 48 hours' },
  ],
  pro: [
    { icon: BookmarkIcon, text: 'Unlimited bookmarks' },
    { icon: Timer, text: 'Customize the synchronization interval' },
    { icon: Mail, text: 'Priority support within 12 hours' },
    { icon: SlidersHorizontal, text: 'Advanced sync options' },
    { icon: Database, text: 'Bulk operations' },
    { icon: ShieldCheck, text: 'Ad-free experience' },
  ],
};

export function BillingSection({
  plan,
  onUpgrade,
  onManage,
}: {
  plan: Plan;
  onUpgrade?: () => void;
  onManage?: () => void;
}) {
  const [yearly, setYearly] = useState(false);
  const isPro = plan === 'pro';

  // Derive URLs from env if no handlers provided
  const base = (
    import.meta.env.VITE_BILLING_URL ||
    import.meta.env.VITE_OAUTH_SERVER_URL ||
    ''
  ).replace(/\/$/, '');
  const upgradeUrl = base
    ? `${base}/billing/upgrade`
    : 'https://github.com/Aries-0331/bookmarks_to_notion#pro';
  const manageUrl = base
    ? `${base}/billing/portal`
    : 'https://github.com/Aries-0331/bookmarks_to_notion#billing';

  const handleUpgrade = () => {
    if (onUpgrade) return onUpgrade();
    window.open(upgradeUrl, '_blank', 'noopener');
  };
  const handleManage = () => {
    if (onManage) return onManage();
    window.open(manageUrl, '_blank', 'noopener');
  };

  const MONTHLY_PRICE = 10;
  const YEARLY_DISCOUNT = 0.4;
  const originalAnnual = MONTHLY_PRICE * 12; // 120
  const discountedAnnual = Math.round(originalAnnual * (1 - YEARLY_DISCOUNT));
  const formatCurrency = (n: number) =>
    `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)}`;
  const formatCurrencyPerMonth = (n: number) =>
    `$${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  const monthlyFromYearly = discountedAnnual / 12;

  return (
    <SectionCard
      id="billing"
      title="Choose Your Plan"
      description="Unlock the full potential of Notion Bookmark Sync"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className={classNames(!yearly && 'text-gray-900', 'text-gray-600')}>Monthly</span>
        <button
          type="button"
          onClick={() => setYearly((v) => !v)}
          className="relative w-14 h-7 flex items-center p-0 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          style={{ backgroundColor: yearly ? 'rgb(245 158 11)' : 'rgb(229 231 235)' }}
          aria-pressed={yearly}
          aria-label="Toggle billing cadence"
        >
          <span
            className="absolute inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out"
            style={{ transform: yearly ? 'translateX(30px)' : 'translateX(4px)' }}
          />
        </button>
        <span
          className={classNames('text-gray-600 flex items-center gap-1', yearly && 'text-gray-900')}
        >
          Yearly
          <span className="flex justify-between items-center w-fit bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200 text-xs font-semibold">
            <Zap className="w-3 h-3 mr-1" />
            Save {Math.round(YEARLY_DISCOUNT * 100)}%
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-lg font-semibold text-gray-900 mb-1">Free</div>
          <div className="h-7 flex items-center text-sm text-gray-500 mb-1">
            $0 <span className="text-gray-400">/ month</span>
          </div>
          <div className="text-sm text-gray-600 mb-4">Basic bookmark syncing</div>
          <button
            className="w-full text-sm px-4 py-2 mb-4 rounded-lg border border-gray-200 text-gray-500 cursor-default"
            disabled
            aria-disabled
            title={isPro ? 'Included in all plans' : 'Current plan'}
          >
            {isPro ? 'Included' : 'Current Plan'}
          </button>
          <ul className="space-y-2 text-sm">
            {PLAN_FEATURES.free.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-800">
                <f.icon className="w-4 h-4 text-gray-600" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro card */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 relative">
          {yearly && (
            <span className="absolute -top-3 right-3 text-xs font-semibold rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 border-0 shadow-md px-3 py-1 cursor-default">
              Popular
            </span>
          )}
          <div className="flex items-center gap-2 mb-1">
            <div className="text-lg font-semibold text-gray-900">Pro</div>
            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/90 text-white px-1.5 py-0.5 rounded">
              <Crown className="w-3 h-3" />
            </span>
          </div>
          <div className="h-7 text-center text-sm text-gray-700 mb-1 flex items-center gap-1">
            {yearly ? (
              <>
                <span className="text-gray-400 line-through">{formatCurrency(MONTHLY_PRICE)}</span>
                <span className="text-gray-900 text-xl font-semibold">
                  {formatCurrencyPerMonth(monthlyFromYearly)}
                </span>
                <span className="text-gray-500">/ month</span>
              </>
            ) : (
              <>
                <span className="text-gray-900 font-semibold">{formatCurrency(MONTHLY_PRICE)}</span>
                <span className="text-gray-500">/ month</span>
              </>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-4">Advanced features for power users</div>
          {isPro ? (
            <button
              className="w-full text-sm px-4 py-2 mb-4 rounded-lg border border-amber-300 text-amber-700 bg-amber-100 hover:bg-amber-200"
              onClick={handleManage}
            >
              Manage Plan
            </button>
          ) : (
            <button
              className="w-full text-sm px-4 py-2 mb-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow inline-flex items-center justify-center gap-2"
              onClick={handleUpgrade}
            >
              <Crown className="w-4 h-4" /> Upgrade to Pro
            </button>
          )}
          <ul className="space-y-2 text-sm">
            {PLAN_FEATURES.pro.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-900">
                <f.icon className="w-4 h-4 text-amber-600" />
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Subtle hint for Free users below the grid */}
      {!isPro && (
        <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Pro unlocks advanced sync options and
          faster intervals.
        </div>
      )}
    </SectionCard>
  );
}
