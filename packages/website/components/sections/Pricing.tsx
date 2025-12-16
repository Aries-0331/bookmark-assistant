'use client';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import { Crown, Sparkle, Sparkles, Check } from 'lucide-react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

// Singleton Paddle instance
let paddleInstance: Paddle | null = null;
let paddlePromise: Promise<Paddle | undefined> | null = null;

/**
 * Get price ID based on billing period
 * Matches the extension pattern for consistency
 */
function getPriceId(billing: 'monthly' | 'lifetime'): string {
  const monthly = process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;
  const lifetime = process.env.NEXT_PUBLIC_PADDLE_PRO_LIFETIME_PRICE_ID;

  if (billing === 'lifetime') {
    return lifetime || monthly || '';
  }
  return monthly || '';
}

async function getPaddleInstance(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;
  if (paddlePromise) {
    const instance = await paddlePromise;
    return instance || null;
  }

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const env = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  if (!token) {
    console.warn('⚠️ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not configured');
    return null;
  }

  try {
    paddlePromise = initializePaddle({
      token,
      environment: env,
      eventCallback: (event) => {
        console.log('🎫 Paddle event:', event.name, event.data);
      },
    });

    const instance = await paddlePromise;
    if (instance) {
      paddleInstance = instance;
      console.log('✅ Paddle initialized:', env);
    }
    return instance || null;
  } catch (error) {
    console.error('❌ Failed to initialize Paddle:', error);
    paddlePromise = null; // Reset promise on failure
    return null;
  }
}

export function Pricing() {
  const [billing, setBilling] = React.useState<'monthly' | 'lifetime'>('lifetime');
  const [paddleReady, setPaddleReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [pricing, setPricing] = React.useState({
    monthly: 5,
    lifetime: 99,
    currencySymbol: '$',
  });

  const displayPrice = billing === 'lifetime' ? pricing.lifetime : pricing.monthly;
  const priceLabel = billing === 'lifetime' ? 'one-time' : '/month';
  const savingsAmount = pricing.monthly * 12 - pricing.lifetime;

  // Initialize Paddle and fetch pricing
  React.useEffect(() => {
    const init = async () => {
      const paddle = await getPaddleInstance();
      if (!paddle) return;
      setPaddleReady(true);

      // 1. Check for transaction (existing logic)
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('_ptxn');
      const successUrl = urlParams.get('_ptxn_success_url');

      if (transactionId) {
        console.log('🎫 Opening checkout for transaction:', transactionId);
        paddle.Checkout.open({
          transactionId,
          settings: {
            theme: 'light',
            displayMode: 'overlay',
            ...(successUrl && { successUrl: decodeURIComponent(successUrl) }),
          },
        });
      }

      // 2. Fetch dynamic pricing
      const monthlyId = process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;
      const lifetimeId = process.env.NEXT_PUBLIC_PADDLE_PRO_LIFETIME_PRICE_ID;

      if (monthlyId && lifetimeId) {
        try {
          const preview = await paddle.PricePreview({
            items: [
              { priceId: monthlyId, quantity: 1 },
              { priceId: lifetimeId, quantity: 1 },
            ],
          });

          const monthlyItem = preview.data.details.lineItems.find(
            (item) => item.price.id === monthlyId
          );
          const lifetimeItem = preview.data.details.lineItems.find(
            (item) => item.price.id === lifetimeId
          );

          if (monthlyItem && lifetimeItem) {
            const currencyCode = monthlyItem.price.unitPrice.currencyCode;

            // Paddle returns amounts in minor units (e.g. cents), so we need to divide by 100
            // unless it's a zero-decimal currency like JPY
            const isZeroDecimal = ['JPY', 'KRW', 'HUF', 'TWD'].includes(currencyCode);
            const divisor = isZeroDecimal ? 1 : 100;

            const monthlyAmount = parseFloat(monthlyItem.price.unitPrice.amount) / divisor;
            const lifetimeAmount = parseFloat(lifetimeItem.price.unitPrice.amount) / divisor;

            // Simple symbol mapping
            const formatter = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currencyCode,
            });
            const parts = formatter.formatToParts(0);
            const symbol = parts.find((part) => part.type === 'currency')?.value || '$';

            setPricing({
              monthly: monthlyAmount,
              lifetime: lifetimeAmount,
              currencySymbol: symbol,
            });
          }
        } catch (err) {
          console.warn('Failed to fetch Paddle pricing:', err);
        }
      }
    };

    init();
  }, []);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const paddle = await getPaddleInstance();

      if (!paddle) {
        alert('Payment system is not configured. Please contact support.');
        return;
      }

      const priceId = getPriceId(billing);

      if (!priceId) {
        console.error('Paddle price ID not configured');
        alert('Payment system is not configured. Please contact support.');
        return;
      }

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          successUrl: `${window.location.origin}/success?source=website`,
          theme: 'light',
          displayMode: 'overlay',
        },
      });
    } catch (error) {
      console.error('Failed to open checkout:', error);
      alert('Failed to open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <SectionEyebrow text="Plans & Pricing" color="amber" />
          <h2 className="text-4xl font-medium text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Start free, upgrade when you need more power.
          </p>

          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 mb-12">
            <button
              className={`px-4 py-2 rounded-md text-base transition ${billing === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setBilling('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md text-base transition flex items-center gap-2 ${billing === 'lifetime' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setBilling('lifetime')}
            >
              🔥 Lifetime{' '}
              {savingsAmount > 0 && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                  Save ${savingsAmount.toFixed(0)}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          {/* Free */}
          <Card className="border-2">
            <CardBody className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-gray-900 text-xl font-medium">Free</h3>
                  <p className="text-sm text-gray-600">For individuals</p>
                </div>
              </div>
              <div className="text-4xl text-gray-900 mb-4">
                {pricing.currencySymbol}0 <span className="text-base text-gray-600">/month</span>
              </div>
              <Button className="w-full mb-6" size="lg">
                Get Started Free
              </Button>
              <ul className="space-y-3">
                {[
                  '50 bookmarks per sync',
                  'Manual sync only',
                  '24-hour sync interval',
                  'Basic features',
                  'Community support',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-gray-600" />
                    </span>
                    <span className="text-base text-gray-700">{t}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Pro */}
          <div className="relative">
            <Card className="border-2">
              <CardBody className="p-8">
                {billing === 'lifetime' && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="cta" className="px-2 py-1 text-xs">
                      🔥 Best Value
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-xl font-medium">Pro</h3>
                    <p className="text-sm text-gray-600">For power users</p>
                  </div>
                </div>
                <div className="text-4xl text-gray-900 mb-4">
                  {pricing.currencySymbol}
                  {displayPrice} <span className="text-base text-gray-600">{priceLabel}</span>
                </div>
                {billing === 'lifetime' && savingsAmount > 0 && (
                  <div className="text-sm text-green-700 mb-3">
                    💰 Save {pricing.currencySymbol}
                    {savingsAmount.toFixed(0)} vs. 1 year of monthly
                  </div>
                )}
                <Button
                  variant="pro"
                  className="w-full mb-6"
                  size="lg"
                  onClick={handleUpgrade}
                  disabled={loading || !paddleReady}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {loading ? 'Loading...' : paddleReady ? 'Upgrade to Pro' : 'Loading Payment...'}
                </Button>
                <ul className="space-y-3">
                  {[
                    '✨ Unlimited bookmarks per sync',
                    '🤖 Set & forget auto-sync',
                    '🚀 6-hour minimum interval',
                    '💎 Smart fingerprint deduplication',
                    '🏷️ AI tagging (Q1 2025)',
                    '📝 AI summaries (Q1 2025)',
                    '👑 Priority support',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <Check className="h-3 w-3 text-amber-600" />
                      </span>
                      <span className="text-base text-gray-700">{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500 flex items-center gap-2">
                  <Sparkle size={14} />
                  <span>Payments are securely processed by Paddle</span>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
