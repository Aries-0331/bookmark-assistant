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

/**
 * Get price ID based on billing period
 * Matches the extension pattern for consistency
 */
function getPriceId(billing: 'monthly' | 'yearly'): string {
  const monthly = process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;
  const yearly = process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID;

  if (billing === 'yearly') {
    return yearly || monthly || '';
  }
  return monthly || '';
}

async function getPaddleInstance(): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const env = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  if (!token) {
    console.warn('⚠️ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not configured');
    return null;
  }

  try {
    paddleInstance =
      (await initializePaddle({
        token,
        environment: env,
        eventCallback: (event) => {
          console.log('🎫 Paddle event:', event.name, event.data);
        },
      })) ?? null;
    console.log('✅ Paddle initialized:', env);
    return paddleInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Paddle:', error);
    return null;
  }
}

export function Pricing() {
  const [billing, setBilling] = React.useState<'monthly' | 'yearly'>('yearly');
  const [paddleReady, setPaddleReady] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [pricing, setPricing] = React.useState({ monthly: 9, yearlyDiscount: 0.2 });

  // Fetch pricing from server
  React.useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3333'}/api/v1/public-config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.pricing) {
          setPricing({
            monthly: data.pricing.monthly,
            yearlyDiscount: data.pricing.yearlyDiscount,
          });
        }
      })
      .catch((err) => console.warn('Failed to fetch pricing config:', err));
  }, []);

  const proPrice =
    billing === 'yearly'
      ? Number((pricing.monthly * (1 - pricing.yearlyDiscount)).toFixed(2))
      : pricing.monthly;

  // Initialize Paddle on mount and check for transaction ID in URL
  React.useEffect(() => {
    getPaddleInstance().then((paddle) => {
      if (paddle) {
        setPaddleReady(true);

        // Check if there's a transaction ID in the URL (_ptxn parameter)
        const urlParams = new URLSearchParams(window.location.search);
        const transactionId = urlParams.get('_ptxn');
        const successUrl = urlParams.get('_ptxn_success_url');

        if (transactionId) {
          console.log('🎫 Opening checkout for transaction:', transactionId);
          console.log('🎯 Success URL:', successUrl);

          // Open Paddle checkout with the transaction ID
          paddle.Checkout.open({
            transactionId,
            settings: {
              theme: 'light',
              displayMode: 'overlay',
              ...(successUrl && { successUrl: decodeURIComponent(successUrl) }),
            },
          });
        }
      }
    });
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
              className={`px-4 py-2 rounded-md text-base transition flex items-center gap-2 ${billing === 'yearly' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              onClick={() => setBilling('yearly')}
            >
              Yearly{' '}
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
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
                $0 <span className="text-base text-gray-600">/month</span>
              </div>
              <Button className="w-full mb-6" size="lg">
                Get Started Free
              </Button>
              <ul className="space-y-3">
                {[
                  '50 bookmarks per day',
                  'Manual token authentication',
                  'Basic sync features',
                  'Community support',
                  'Open source mode',
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
                {billing === 'yearly' && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="cta" className="px-2 py-1 text-xs">
                      Most Popular
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
                  ${proPrice} <span className="text-base text-gray-600">/month</span>
                </div>
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
                    'Unlimited bookmarks',
                    'OAuth integration',
                    'Auto-sync in background',
                    'Priority support',
                    'Advanced features',
                    'Custom database mapping',
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
