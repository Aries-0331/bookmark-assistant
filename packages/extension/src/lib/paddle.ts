// 🎫 Paddle Billing Integration for Extension

import { initializePaddle, Paddle, CheckoutOpenOptions } from '@paddle/paddle-js';

/**
 * Using @paddle/paddle-js NPM package instead of dynamic CDN loading
 * Benefits:
 * - ✅ No CSP issues (bundled with extension)
 * - ✅ Works offline
 * - ✅ Better TypeScript support
 * - ✅ Instant initialization
 * - ✅ Easier testing and debugging
 */

export interface OpenCheckoutOptions {
  priceId: string;
  userEmail?: string;
  userId: string;
  successUrl?: string;
}

// Singleton Paddle instance
let paddleInstance: Paddle | null = null;

/**
 * Initialize Paddle SDK
 * This is called once and cached for subsequent uses
 */
async function getPaddleInstance(): Promise<Paddle> {
  if (paddleInstance) {
    return paddleInstance;
  }

  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  const environment = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';

  if (!token) {
    throw new Error('VITE_PADDLE_CLIENT_TOKEN is not configured');
  }

  console.log(`🎫 Initializing Paddle SDK (${environment} mode)...`);

  try {
    const paddle = await initializePaddle({
      token,
      environment: environment as 'sandbox' | 'production',
      eventCallback: (event) => {
        console.log('🎫 Paddle event:', event.name, event.data);
      },
    });

    if (!paddle) {
      throw new Error('Paddle initialization returned undefined');
    }

    paddleInstance = paddle;
    console.log('✅ Paddle SDK initialized successfully');
    return paddleInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Paddle SDK:', error);
    throw error;
  }
}

/**
 * Open Paddle checkout overlay
 * Uses the NPM package to open an inline checkout experience
 */
export async function openPaddleCheckout(options: OpenCheckoutOptions): Promise<void> {
  try {
    const paddle = await getPaddleInstance();

    // Build success URL
    const successUrl =
      options.successUrl || `${chrome.runtime.getURL('options.html')}?upgraded=true`;

    // Build checkout options
    const checkoutOptions: CheckoutOpenOptions = {
      items: [
        {
          priceId: options.priceId,
          quantity: 1,
        },
      ],
      customData: {
        userId: options.userId,
      },
      settings: {
        successUrl,
        theme: 'light',
        displayMode: 'overlay',
        frameTarget: 'paddle-checkout-container',
        frameInitialHeight: 450,
        frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
      },
    };

    // Add customer email if provided
    if (options.userEmail) {
      checkoutOptions.customer = {
        email: options.userEmail,
      };
    }

    console.log('🚀 Opening Paddle checkout overlay...', checkoutOptions);

    // Open checkout
    await paddle.Checkout.open(checkoutOptions);

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
