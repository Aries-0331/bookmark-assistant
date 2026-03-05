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
  MousePointerClick,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '../store';
import { openPaddleCheckout } from '../../lib/paddle';
import { useToast } from '../hook/useToast';
import { sendMessage, Messages } from '../../utils/message';
import { createTranslator } from '../../utils/i18n';

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

type FeatureItem = {
  icon: LucideIcon;
  text: string;
};

const PLAN_FEATURES: Record<'free' | 'pro', FeatureItem[]> = {
  free: [
    { icon: BookmarkIcon, text: '500 bookmarks per sync' },
    { icon: MousePointerClick, text: 'free_feature_manual_sync' },
    { icon: Timer, text: '24-hour interval' },
    { icon: Mail, text: 'free_feature_community_support' },
  ],
  pro: [
    { icon: Zap, text: 'pro_feature_unlimited_bookmarks' },
    { icon: RefreshCw, text: 'pro_feature_auto_sync' },
    { icon: Timer, text: '6-hour minimum interval' },
    { icon: Sparkles, text: 'pro_feature_deduplication' },
    { icon: Crown, text: 'pro_feature_priority_support' },
  ],
};

export function BillingSection() {
  const { t } = createTranslator();
  const [isLifetime, setIsLifetime] = useState(false); // false = monthly, true = lifetime
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false); // Local state for checkout (UI-driven)
  // Use store-driven state for sync and entitlements refresh
  const {
    isPro,
    getPricing,
    userId,
    userEmail,
    refreshEntitlements,
    purchaseType,
    isSyncing,
    isRefreshingProfile,
  } = useAppStore();
  const { monthly, lifetime: LIFETIME_PRICE } = getPricing();
  const { show: showToast } = useToast();

  // Check for upgrade success in URL and refresh entitlements
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      // Remove the param from URL
      window.history.replaceState({}, '', window.location.pathname);

      // Show success toast
      showToast({
        title: t('payment_success_title'),
        description: t('payment_activating_desc'),
        variant: 'success',
        duration: 5000,
      });

      // Refresh entitlements with retries to handle webhook latency
      const checkEntitlements = async (retries = 3, delay = 2000) => {
        await refreshEntitlements(true); // Force refresh to bypass cache after payment
        const currentIsPro = useAppStore.getState().isPro;

        if (!currentIsPro && retries > 0) {
          console.log(`⏳ Pro status not active yet, retrying in ${delay}ms... (${retries} left)`);
          setTimeout(() => checkEntitlements(retries - 1, delay * 1.5), delay);
        } else if (currentIsPro) {
          showToast({
            title: t('pro_activated_title'),
            description: t('pro_activated_desc'),
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
      setIsCheckingOut(true);
      if (!userId) {
        console.error('❌ User ID not found');
        alert(t('upgrade_requires_connection'));
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
      alert(t('error_checkout_failed'));
    } finally {
      setIsCheckingOut(false);
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

      // Loading state managed via storage sync - background drives state changes
      const res = await sendMessage({ type: Messages.CANCEL_SUBSCRIPTION });

      if (res.success) {
        showToast({
          title: t('subscription_cancelled_title'),
          description: t('subscription_cancelled_desc'),
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
        title: t('error_cancellation_failed'),
        description:
          error instanceof Error ? error.message : 'Please try again or contact support.',
        variant: 'error',
        duration: 5000,
      });
    }
    // Loading state managed via storage sync - background drives state changes
  };

  const handleRefreshStatus = async () => {
    try {
      // isRefreshingProfile is managed by refreshEntitlements via storage
      await refreshEntitlements(true); // Force refresh from server
      showToast({
        title: t('status_refreshed'),
        description: 'Your subscription status is now up to date',
        variant: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to refresh status:', error);
      showToast({
        title: t('error_refresh_failed'),
        description: 'Could not refresh status. Please try again.',
        variant: 'error',
        duration: 3000,
      });
    }
    // isRefreshingProfile state is managed by background via storage
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
        title={t('subscription_management_title')}
        description={t('subscription_management_desc')}
      >
        <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden shadow-sm">
          {/* Status Banner */}
          <div className="bg-orange-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-full">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-amber-900 font-semibold text-lg">{t('pro_plan_active')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshStatus}
                disabled={isRefreshingProfile}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh subscription status"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingProfile ? 'animate-spin' : ''}`} />
                {isRefreshingProfile ? t('refreshing') : t('action_refresh')}
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium border border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {t('status_active')}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> {t('current_plan_label')}
              </div>
              <div className="text-gray-900 font-medium">
                {purchaseType === 'lifetime' ? t('plan_lifetime') : t('plan_monthly')}
              </div>
            </div>

            {purchaseType === 'monthly' && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {t('next_billing_date_label')}
                </div>
                <div className="text-gray-900 font-medium">{nextBillingDate || t('loading')}</div>
              </div>
            )}

            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3" /> {t('linked_email_label')}
              </div>
              <div className="text-gray-900 font-medium font-mono text-sm bg-gray-50 px-2 py-1 rounded w-fit">
                {userEmail || t('no_email_linked')}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="px-6 pb-6">
            <div className="text-sm font-medium text-gray-900 mb-3">{t('pro_features_title')}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLAN_FEATURES.pro.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{t(f.text)}</span>
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
                  disabled={isSyncing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-4 h-4" />
                  {isSyncing ? t('cancelling') : t('cancel_subscription')}
                </button>

                <button
                  onClick={handleRefund}
                  className="text-[10px] text-gray-400 hover:text-gray-600 underline decoration-dotted"
                >
                  {t('refund_policy_button')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex items-center gap-2 text-base font-medium text-gray-800">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span>{t('lifetime_member_title')}</span>
                </div>
                <p className="text-sm text-gray-600 text-center">{t('lifetime_member_desc')}</p>
                <button
                  onClick={handleRefund}
                  className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 underline decoration-dotted"
                >
                  {t('refund_policy_button')}
                </button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard id="billing" title={t('choose_plan_title')} description={t('choose_plan_desc')}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className={classNames(!isLifetime && 'text-gray-900', 'text-gray-600')}>
          {t('billing_monthly')}
        </span>
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
          {t('billing_lifetime')}
          <span className="flex justify-between items-center w-fit bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200 text-xs font-semibold">
            <Zap className="w-3 h-3 mr-1" />
            {t('best_value_badge')}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Free card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-lg font-semibold text-gray-900 mb-1">{t('free')}</div>
          <div className="h-7 flex items-center text-sm text-gray-500 mb-1">
            $0<span className="text-gray-400 ml-1">{t('per_month')}</span>
          </div>
          <div className="text-sm text-gray-600 mb-4">{t('free_plan_desc')}</div>
          <button
            className="w-full text-sm px-4 py-2 mb-4 rounded-lg border border-gray-200 text-gray-500 cursor-default"
            disabled
            aria-disabled
            title="Current Plan"
          >
            {t('current_plan_label')}
          </button>
          <ul className="space-y-2 text-sm">
            {PLAN_FEATURES.free.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-800">
                <f.icon className="w-4 h-4 text-gray-600" />
                <span>{t(f.text)}</span>
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
            <div className="text-lg font-semibold text-gray-900">{t('pro')}</div>
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
                <span className="text-gray-500 text-sm">{t('one_time_payment')}</span>
              </>
            ) : (
              <>
                <span className="text-gray-900 text-xl font-semibold">
                  {formatCurrency(monthly)}
                </span>
                <span className="text-gray-500 text-sm">{t('per_month')}</span>
              </>
            )}
            {/* Early Access Badge */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 border border-amber-200 rounded-md">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span className="text-[11px] font-medium text-amber-900">
                {t('early_access_badge')}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-600 mb-4">{t('pro_plan_desc')}</div>

          <button
            className="w-full text-sm px-4 py-2 mb-4 rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleUpgrade}
            disabled={isCheckingOut}
          >
            <Crown className="w-4 h-4" />
            {isCheckingOut ? t('loading') : t('action_upgrade_pro')}
          </button>

          <ul className="space-y-2 text-sm">
            {PLAN_FEATURES.pro.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-gray-900">
                <f.icon className="w-4 h-4 text-amber-600" />
                <span>{t(f.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Subtle hint for Free users below the grid */}
      {!isPro && (
        <div className="mt-4 text-xs text-gray-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> {t('pro_unlock_hint')}
        </div>
      )}
    </SectionCard>
  );
}
