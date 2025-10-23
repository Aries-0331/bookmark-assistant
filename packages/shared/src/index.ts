export * from './env';
export * from './types/index';
export * from './notionSync/adapter';

// Pluggable billing provider interface (implement with Stripe, Paddle, etc.)
export interface BillingProvider {
  // Create a checkout/upgrade session and return a URL to redirect the user
  createCheckoutSession(params: {
    userId: string;
    plan: 'pro';
    // Additional metadata like locale, coupon, etc.
  }): Promise<{ url: string }>;

  // Create a customer portal session URL for managing subscriptions
  createPortalSession(params: { userId: string }): Promise<{ url: string }>;

  // Retrieve public pricing for display (server may cache)
  getPublicPricing(): Promise<{
    currency: string;
    monthly: number;
    yearlyDiscount: number; // 0..1
  }>;
}
