import { SectionCard } from './SectionCard';
import {
  Crown,
  Sparkles,
  Zap,
  Bookmark as BookmarkIcon,
  Mail,
  CheckCircle,
  ExternalLink,
  CreditCard,
  Calendar,
  User,
  Timer,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FREE_INTERVAL_HOURS } from '../store';
import { useAppStore } from '../store';
import { openPaddleCheckout, getPriceId } from '../../lib/paddle';
import { useToast } from '../hook/useToast';
import { sendMessage, Messages } from '../../utils/message';

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

type FeatureItem = {
  icon: LucideIcon;
  text: string;
};

const PLAN_FEATURES: Record<'free' | 'pro', FeatureItem[]> = {
  free: [
    { icon: BookmarkIcon, text: `Up to 1000 bookmarks per day` },
    { icon: Timer, text: `${FREE_INTERVAL_HOURS}-hour fixed interval` },
    { icon: Mail, text: 'Email support' },
  ],
  pro: [
    {
      icon: BookmarkIcon,
      text: 'Unlimited bookmarks',
    },
    {
      icon: Timer,
      text: 'Configurable sync interval',
    },
    { icon: Mail, text: 'Priority support within 12 hours' },
  ],
};

export function BillingSection() {
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isPro, getPricing, userId, userEmail, refreshEntitlements } = useAppStore();
  const { monthly: MONTHLY_PRICE, yearlyDiscount: YEARLY_DISCOUNT } = getPricing();
  const { show: showToast } = useToast();

  // Check for upgrade success in URL and refresh entitlements
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      // Remove the param from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Show success toast
      showToast({
        title: '🎉 Successfully Upgraded to Pro!',
        description: 'Your Pro subscription is now active!',
        variant: 'success',
        duration: 5000,
      });

      // Refresh entitlements after successful upgrade
      refreshEntitlements();
    }
  }, [refreshEntitlements, showToast]);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const priceId = getPriceId(yearly ? 'yearly' : 'monthly');

      if (!priceId) {
        console.error('❌ Paddle price ID not configured');
        alert('Payment system is not configured. Please contact support.');
        return;
      }

      if (!userId) {
        console.error('❌ User ID not found');
        alert('Please connect to Notion first before upgrading.');
        return;
      }

      await openPaddleCheckout({
        priceId,
        userId,
        userEmail: userEmail || undefined,
        successUrl: `${import.meta.env.VITE_WEBSITE_URL || ''}/success`,
      });
    } catch (error) {
      console.error('❌ Failed to open checkout:', error);
      alert('Failed to open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    try {
      setLoading(true);
      const res = await sendMessage({ type: Messages.GET_PORTAL_LINK });
      if (res.success && res.url) {
        window.open(res.url, '_blank', 'noopener');
      } else {
        // Fallback to generic portal or error
        const base = (
          import.meta.env.VITE_BILLING_URL ||
          import.meta.env.VITE_OAUTH_SERVER_URL ||
          ''
        ).replace(/\/$/, '');
        const manageUrl = base
          ? `${base}/billing/portal`
          : 'https://github.com/Aries-0331/bookmarks_to_notion#billing';

        console.warn('⚠️ Could not get specific portal link, using fallback:', res.error);
        window.open(manageUrl, '_blank', 'noopener');
      }
    } catch (error) {
      console.error('❌ Failed to open portal:', error);
      alert('Failed to open subscription management. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = () => {
    // Simple "Service Ticket" modal logic using window.confirm/prompt for MVP
    // In a real app, use a proper Modal component
    const confirmed = window.confirm(
      "We're sorry to see you go.\n\nWe offer a 7-day money-back guarantee. Would you like to contact support to request a refund?"
    );

    if (confirmed) {
      const reason = window.prompt(
        "Please help us improve. Why are you requesting a refund?\n(e.g., 'Too expensive', 'Bugs', 'Not what I expected')"
      );

      if (reason !== null) {
        // User didn't cancel prompt
        const subject = encodeURIComponent(`Refund Request: ${userEmail || userId}`);
        const body = encodeURIComponent(
          `I would like to request a refund for my subscription.\n\nReason: ${reason}\nUser ID: ${userId}\nEmail: ${userEmail || ''}\n\n[Please attach any relevant details]`
        );
        window.open(`mailto:aries0331.dev@gmail.com?subject=${subject}&body=${body}`, '_blank');
      }
    }
  };

  const originalAnnual = MONTHLY_PRICE * 12;
  const discountedAnnual = Math.round(originalAnnual * (1 - YEARLY_DISCOUNT));
  const formatCurrency = (n: number) =>
    `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)}`;
  const formatCurrencyPerMonth = (n: number) =>
    `$${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  const monthlyFromYearly = discountedAnnual / 12;

  if (isPro) {
    return (
      <SectionCard
        id="billing"
        title="Subscription Management"
        description="Manage your Pro subscription and billing details"
      >
        <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden shadow-sm">
          {/* Status Banner */}
          <div className="bg-orange-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-full">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-amber-900 font-semibold text-lg">Pro Plan Active</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
          </div>

          {/* Info Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Current Plan
              </div>
              <div className="text-gray-900 font-medium">Pro (Unlimited)</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Next Billing Date
              </div>
              <div className="text-gray-900 font-medium">
                {/* Placeholder as we don't have this data yet */}
                Managed via Paddle
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> Linked Email
              </div>
              <div className="text-gray-900 font-medium font-mono text-sm bg-gray-50 px-2 py-1 rounded w-fit">
                {userEmail || 'No email linked'}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="px-6 pb-6">
            <div className="text-sm font-medium text-gray-900 mb-3">Your Pro Features</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_FEATURES.pro.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={handleManage}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Manage Subscription
            </button>

            <button
              onClick={handleRefund}
              className="text-[10px] text-gray-400 hover:text-gray-600 underline decoration-dotted"
            >
              Refund Policy & Request
            </button>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="billing"
      title="Choose Your Plan"
      description="Unlock the full potential of Bookmark Assistant with Pro"
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
            title="Current Plan"
          >
            Current Plan
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
          <button
            className="w-full text-sm px-4 py-2 mb-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleUpgrade}
            disabled={loading}
          >
            <Crown className="w-4 h-4" />
            {loading ? 'Loading...' : 'Upgrade to Pro'}
          </button>
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
