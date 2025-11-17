"use client";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { Crown, Sparkle, Sparkles, Check } from "lucide-react";

// Paddle type declarations
declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: { token: string }) => void;
      Checkout: {
        open: (options: {
          items?: Array<{ priceId: string; quantity: number }>;
          customer?: { email?: string };
          customData?: Record<string, unknown>;
          settings?: {
            successUrl?: string;
            theme?: 'light' | 'dark';
          };
        }) => void;
      };
    };
  }
}

export function Pricing() {
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("yearly");
  const [paddleLoaded, setPaddleLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const proPrice = billing === "yearly" ? 7.2 : 9; // example numbers

  // Load Paddle.js on mount
  React.useEffect(() => {
    const loadPaddle = async () => {
      if (window.Paddle) {
        initializePaddle();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      script.onload = () => {
        initializePaddle();
      };
      document.head.appendChild(script);
    };

    const initializePaddle = () => {
      const env = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

      if (!token) {
        console.warn('Paddle client token not configured');
        return;
      }

      window.Paddle?.Environment.set(env as 'sandbox' | 'production');
      window.Paddle?.Initialize({ token });
      setPaddleLoaded(true);
      console.log('✅ Paddle initialized:', env);
    };

    loadPaddle();
  }, []);

  const handleUpgrade = async () => {
    if (!window.Paddle) {
      alert('Payment system is loading. Please try again in a moment.');
      return;
    }

    try {
      setLoading(true);
      const priceId = billing === 'yearly'
        ? process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID
        : process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;

      if (!priceId) {
        console.error('Paddle price ID not configured');
        alert('Payment system is not configured. Please contact support.');
        return;
      }

      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          successUrl: `${window.location.origin}/success`,
          theme: 'light',
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
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">Start free, upgrade when you need more power.</p>

          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 mb-12">
            <button
              className={`px-4 py-2 rounded-md text-base transition ${billing === "monthly" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 rounded-md text-base transition flex items-center gap-2 ${billing === "yearly" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
              onClick={() => setBilling("yearly")}
            >
              Yearly <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Save 20%</span>
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
              <div className="text-4xl text-gray-900 mb-4">$0 <span className="text-base text-gray-600">/month</span></div>
              <Button className="w-full mb-6" size="lg">Get Started Free</Button>
              <ul className="space-y-3">
                {["50 bookmarks per day", "Manual token authentication", "Basic sync features", "Community support", "Open source mode"].map((t) => (
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
                <div className="absolute top-4 right-4">
                  <Badge variant="cta" className="px-2 py-1 text-xs">Most Popular</Badge>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-xl font-medium">Pro</h3>
                    <p className="text-sm text-gray-600">For power users</p>
                  </div>
                </div>
                <div className="text-4xl text-gray-900 mb-4">${proPrice} <span className="text-base text-gray-600">/month</span></div>
                <Button
                  variant="pro"
                  className="w-full mb-6"
                  size="lg"
                  onClick={handleUpgrade}
                  disabled={loading || !paddleLoaded}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {loading ? 'Loading...' : 'Upgrade to Pro'}
                </Button>
                <ul className="space-y-3">
                  {["Unlimited bookmarks", "OAuth integration", "Auto-sync in background", "Priority support", "Advanced features", "Custom database mapping"].map((t) => (
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
