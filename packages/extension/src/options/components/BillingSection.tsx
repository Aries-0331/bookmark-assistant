import { SectionCard } from './SectionCard';
import {
  Crown,
  Sparkles,
  Zap,
  Bookmark as BookmarkIcon,
  Mail,
  CheckCircle,
  CreditCard,
  Calendar,
  User,
  Timer,
  Tags,
  FileText,
  MousePointerClick,
  RefreshCw,
  Infinity as InfiniteIcon,
  Gift,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../store';
import { openPaddleCheckout } from '../../lib/paddle';
import { useToast } from '../hook/useToast';
import { sendMessage, Messages } from '../../utils/message';

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

type FeatureItem = {
  icon: LucideIcon;
  text: string;
};

const PLAN_FEATURES: Record<'free' | 'pro' | 'lifetime', FeatureItem[]> = {
  free: [
    { icon: BookmarkIcon, text: '500 bookmarks per sync' },
    { icon: MousePointerClick, text: 'Manual sync only' },
    { icon: Timer, text: '24-hour interval' },
    { icon: Mail, text: 'Community support' },
  ],
  pro: [
    { icon: Zap, text: 'Unlimited bookmarks per sync' },
    { icon: RefreshCw, text: 'Set & forget auto-sync' },
    { icon: Timer, text: '6-hour minimum interval' },
    { icon: Sparkles, text: 'Smart fingerprint deduplication' },
    { icon: Tags, text: 'AI tagging (coming Q1 2025)' },
    { icon: FileText, text: 'AI summaries (coming Q1 2025)' },
    { icon: Crown, text: 'Priority support' },
  ],
  lifetime: [
    { icon: InfiniteIcon, text: 'Pay once, keep forever' },
    { icon: Gift, text: 'Includes all future Pro updates' },
    { icon: AlertCircle, text: 'Limited to first 500 users' },
    { icon: Zap, text: 'Unlimited bookmarks per sync' },
    { icon: RefreshCw, text: 'Set & forget auto-sync' },
    { icon: Timer, text: '6-hour minimum interval' },
    { icon: Sparkles, text: 'Smart fingerprint deduplication' },
    { icon: Tags, text: 'AI tagging (coming Q1 2025)' },
    { icon: FileText, text: 'AI summaries (coming Q1 2025)' },
    { icon: Crown, text: 'Priority support' },
  ],
};

export function BillingSection() {
  const [isLifetime, setIsLifetime] = useState(false); // false = monthly, true = lifetime
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);
  const { isPro, getPricing, userId, userEmail, refreshEntitlements, purchaseType } = useAppStore();
  const { lifetime: LIFETIME_PRICE } = getPricing();
  const { show: showToast } = useToast();

  // Check for upgrade success in URL and refresh entitlements
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      // Remove the param from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Show success toast
      showToast({
        title: '🎉 Payment Successful!',
        description: 'Activating your Pro subscription...',
        variant: 'success',
        duration: 5000,
      });

      // Refresh entitlements with retries to handle webhook latency
      const checkEntitlements = async (retries = 3, delay = 2000) => {
        await refreshEntitlements();
        const currentIsPro = useAppStore.getState().isPro;

        if (!currentIsPro && retries > 0) {
          console.log(`⏳ Pro status not active yet, retrying in ${delay}ms... (${retries} left)`);
          setTimeout(() => checkEntitlements(retries - 1, delay * 1.5), delay);
        } else if (currentIsPro) {
          showToast({
            title: '✅ Pro Activated',
            description: 'Your Pro features are now ready to use!',
            variant: 'success',
            duration: 3000,
          });
        }
      };

      checkEntitlements();
    }
  }, [showToast]);

  // Fetch subscription info for monthly Pro users
  useEffect(() => {
    if (isPro && purchaseType === 'monthly') {
      const fetchSubscriptionInfo = async () => {
        try {
          const res = await sendMessage({ type: Messages.GET_SUBSCRIPTION_INFO });
          if (res.success && res.nextBillingDate) {
            setNextBillingDate(res.nextBillingDate);
          }
        } catch (error) {
          console.error('❌ Failed to fetch subscription info:', error);
        }
      };

      fetchSubscriptionInfo();
    }
  }, [isPro, purchaseType]);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      if (!userId) {
        console.error('❌ User ID not found');
        alert('Please connect to Notion first before upgrading.');
        return;
      }

      await openPaddleCheckout({
        pricing: isLifetime ? 'lifetime' : 'monthly',
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

  const handleCancelSubscription = async () => {
    try {
      // Show confirmation dialog
      const billingDate = nextBillingDate || 'the end of your current billing period';
      const confirmed = window.confirm(
        `Are you sure you want to cancel your subscription?\n\n` +
          `You will retain access until ${billingDate}.\n\n` +
          `After that, your account will revert to the Free plan.`
      );

      if (!confirmed) return;

      setLoading(true);
      const res = await sendMessage({ type: Messages.CANCEL_SUBSCRIPTION });

      if (res.success) {
        showToast({
          title: '✓ Subscription Cancelled',
          description: `You'll have access until ${billingDate}`,
          variant: 'success',
          duration: 5000,
        });
        // Refresh to update UI
        await refreshEntitlements();
      } else {
        throw new Error(res.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('❌ Failed to cancel subscription:', error);
      showToast({
        title: '✗ Cancellation Failed',
        description:
          error instanceof Error ? error.message : 'Please try again or contact support.',
        variant: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      await refreshEntitlements(true); // Force refresh from server
      showToast({
        title: '✓ Status Refreshed',
        description: 'Your subscription status is now up to date',
        variant: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to refresh status:', error);
      showToast({
        title: '✗ Refresh Failed',
        description: 'Could not refresh status. Please try again.',
        variant: 'error',
        duration: 3000,
      });
    } finally {
      setRefreshing(false);
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

  const formatCurrency = (n: number) =>
    `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)}`;

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
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshStatus}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh subscription status"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Current Plan
              </div>
              <div className="text-gray-900 font-medium">
                {purchaseType === 'lifetime' ? 'Pro (Lifetime)' : 'Pro (Monthly)'}
              </div>
            </div>

            {purchaseType === 'monthly' && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Next Billing Date
                </div>
                <div className="text-gray-900 font-medium">{nextBillingDate || 'Loading...'}</div>
              </div>
            )}

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
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            {purchaseType === 'monthly' ? (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4" />
                  {loading ? 'Cancelling...' : 'Cancel Subscription'}
                </button>

                <button
                  onClick={handleRefund}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline decoration-dotted"
                >
                  Refund Policy & Request
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex items-center gap-2 text-base font-medium text-gray-800">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span>You are a Lifetime Pro member</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Thank you for your support! Enjoy unlimited access forever.
                </p>
                <button
                  onClick={handleRefund}
                  className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 underline decoration-dotted"
                >
                  Refund Policy & Request
                </button>
              </div>
            )}
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
        <span className={classNames(!isLifetime && 'text-gray-900', 'text-gray-600')}>Monthly</span>
        <button
          type="button"
          onClick={() => setIsLifetime((v) => !v)}
          className="relative w-14 h-7 flex items-center p-0 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          style={{ backgroundColor: isLifetime ? 'rgb(245 158 11)' : 'rgb(229 231 235)' }}
          aria-pressed={isLifetime}
          aria-label="Toggle billing type"
        >
          <span
            className="absolute inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out"
            style={{ transform: isLifetime ? 'translateX(30px)' : 'translateX(4px)' }}
          />
        </button>
        <span
          className={classNames(
            'text-gray-600 flex items-center gap-1',
            isLifetime && 'text-gray-900'
          )}
        >
          Lifetime
          <span className="flex justify-between items-center w-fit bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200 text-xs font-semibold">
            <Zap className="w-3 h-3 mr-1" />
            Best Value
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-lg font-semibold text-gray-900 mb-1">Free</div>
          <div className="h-7 flex items-center text-sm text-gray-500 mb-1">
            $0<span className="text-gray-400 ml-1">/ month</span>
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
          {isLifetime && (
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
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {isLifetime ? (
              <>
                <span className="text-gray-900 text-xl font-semibold">
                  {formatCurrency(LIFETIME_PRICE)}
                </span>
                <span className="text-gray-500 text-sm">one-time</span>
              </>
            ) : (
              <>
                <span className="text-gray-400 line-through text-base">{formatCurrency(5)}</span>
                <span className="text-gray-900 text-xl font-semibold">{formatCurrency(2.50)}</span>
                <span className="text-gray-500 text-sm">/ month</span>
              </>
            )}
            {/* Early Access Badge */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 border border-amber-200 rounded-md">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span className="text-[11px] font-medium text-amber-900">Early Access</span>
            </div>
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
            {PLAN_FEATURES[isLifetime ? 'lifetime' : 'pro'].map((f, i) => (
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
