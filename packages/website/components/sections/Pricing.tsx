'use client';
import { useState } from 'react';
import { SectionEyebrow } from '@/components/ui/SectionEyebrow';
import {
  Crown,
  Sparkles,
  Check,
  Zap,
  RefreshCw,
  Timer,
  Tags,
  FileText,
  Gift,
  AlertCircle,
} from 'lucide-react';

export function Pricing() {
  const [billing, setBilling] = useState<'monthly' | 'lifetime'>('lifetime');
  const pricing = {
    monthly: 2.5,
    lifetime: 30,
    currencySymbol: '$',
  };

  const displayPrice = billing === 'lifetime' ? pricing.lifetime : pricing.monthly;
  const priceLabel = billing === 'lifetime' ? 'one-time' : '/month';

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <SectionEyebrow text="Plans & Pricing" color="amber" />
          <h2 className="text-4xl font-medium text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Start free, upgrade when you need more power.
          </p>

          <div className="flex items-center justify-center gap-2 mb-4 transform translate-x-12">
            <span className={billing === 'monthly' ? 'text-gray-900' : 'text-gray-600'}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setBilling(billing === 'monthly' ? 'lifetime' : 'monthly')}
              className="relative w-14 h-7 flex items-center p-0 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              style={{
                backgroundColor: billing === 'lifetime' ? 'rgb(245 158 11)' : 'rgb(229 231 235)',
              }}
              aria-pressed={billing === 'lifetime'}
              aria-label="Toggle billing type"
            >
              <span
                className="absolute inline-block w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out"
                style={{
                  transform: billing === 'lifetime' ? 'translateX(30px)' : 'translateX(4px)',
                }}
              />
            </button>
            <span
              className={`flex items-center gap-1 ${billing === 'lifetime' ? 'text-gray-900' : 'text-gray-600'}`}
            >
              Lifetime
              <span className="flex justify-between items-center w-fit bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200 text-xs font-semibold">
                <Zap className="w-3 h-3 mr-1" />
                Best Value
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[720px] mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col">
            <div className="text-lg font-semibold text-gray-900 mb-1">Free</div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              {pricing.currencySymbol}0<span className="text-gray-400 ml-1">/ month</span>
            </div>
            <div className="text-sm text-gray-600 mb-4">Basic bookmark syncing</div>

            <ul className="space-y-2 text-sm flex-grow">
              <li className="flex items-center gap-2 text-gray-800">
                <Check className="w-4 h-4 text-gray-600" />
                <span>50 bookmarks per sync</span>
              </li>
              <li className="flex items-center gap-2 text-gray-800">
                <Check className="w-4 h-4 text-gray-600" />
                <span>Manual sync only</span>
              </li>
              <li className="flex items-center gap-2 text-gray-800">
                <Check className="w-4 h-4 text-gray-600" />
                <span>24-hour interval</span>
              </li>
              <li className="flex items-center gap-2 text-gray-800">
                <Check className="w-4 h-4 text-gray-600" />
                <span>Community support</span>
              </li>
            </ul>
          </div>
          {/* Pro */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 relative flex flex-col">
            {billing === 'lifetime' && (
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
              {billing === 'monthly' && (
                <span className="text-gray-400 line-through text-base">
                  {pricing.currencySymbol}5
                </span>
              )}
              <span className="text-gray-900 text-xl font-semibold">
                {pricing.currencySymbol}
                {displayPrice}
              </span>
              <span className="text-gray-500 text-sm">{priceLabel}</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 border border-amber-200 rounded-md">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span className="text-[11px] font-medium text-amber-900">Early Access</span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-4">Advanced features for power users</div>

            <ul className="space-y-2 text-sm">
              {billing === 'lifetime' ? (
                <>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>Includes all future Pro updates</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Limited to first 500 users</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Unlimited bookmarks per sync</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                    <span>Set & forget auto-sync</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Timer className="w-4 h-4 text-amber-600" />
                    <span>6-hour minimum interval</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Smart fingerprint deduplication</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Tags className="w-4 h-4 text-amber-600" />
                    <span>AI tagging (coming Q1 2025)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>AI summaries (coming Q1 2025)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Priority support</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Unlimited bookmarks per sync</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <RefreshCw className="w-4 h-4 text-amber-600" />
                    <span>Set & forget auto-sync</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Timer className="w-4 h-4 text-amber-600" />
                    <span>6-hour minimum interval</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Smart fingerprint deduplication</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Tags className="w-4 h-4 text-amber-600" />
                    <span>AI tagging (coming Q1 2025)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>AI summaries (coming Q1 2025)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-900">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Priority support</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
