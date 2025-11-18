// 🎫 Paddle Billing Integration for Extension

/**
 * Chrome Extension Checkout Strategy
 *
 * ❌ Problem: @paddle/paddle-js NPM package still loads CDN resources at runtime
 * ✅ Solution: Use Paddle Checkout API to generate checkout URLs and open in new tab
 *
 * Benefits:
 * - ✅ No CSP violations (no iframe/overlay in extension context)
 * - ✅ Full checkout experience in dedicated browser tab
 * - ✅ Better mobile support
 * - ✅ Simpler implementation
 * - ✅ No Paddle SDK initialization needed
 */

export interface OpenCheckoutOptions {
  priceId: string;
  userEmail?: string;
  userId: string;
  successUrl?: string;
}

/**
 * Open Paddle checkout in a new browser tab
 * Uses server-side API to generate checkout URL to avoid CSP issues
 */
export async function openPaddleCheckout(options: OpenCheckoutOptions): Promise<void> {
  try {
    const serverUrl = import.meta.env.VITE_OAUTH_SERVER_URL || 'http://localhost:3000';

    // Build success URL
    const successUrl =
      options.successUrl || `${chrome.runtime.getURL('options.html')}?upgraded=true`;

    console.log('🚀 Requesting Paddle checkout URL from server...');

    // Request checkout URL from server
    const response = await fetch(`${serverUrl}/api/paddle/checkout-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: options.priceId,
        userId: options.userId,
        email: options.userEmail,
        source: 'extension', // Track that checkout originated from extension
        successUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout URL');
    }

    const { checkoutUrl } = await response.json();

    console.log('✅ Checkout URL received, opening in new tab...');

    // Open checkout in new tab
    chrome.tabs.create({ url: checkoutUrl });

    console.log('✅ Paddle checkout opened successfully');
  } catch (error) {
    console.error('❌ Failed to open Paddle checkout:', error);
    throw error;
  }
}

/**
 * Get price ID based on billing period
 */
export function getPriceId(billing: 'monthly' | 'yearly'): string {
  const monthly = import.meta.env.VITE_PADDLE_PRO_MONTHLY_PRICE_ID;
  const yearly = import.meta.env.VITE_PADDLE_PRO_YEARLY_PRICE_ID;

  if (billing === 'yearly') {
    return yearly || monthly || '';
  }
  return monthly || '';
}
