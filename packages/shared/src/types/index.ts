export interface BookmarkPayload {
  title: string;
  url: string;
  description?: string;
  path?: string;
  dateAdded?: string;
  syncId?: string;
}

export interface NotionDatabaseSummary {
  id: string;
  title: string;
}

// Public, cacheable configuration for display and sane defaults
export interface PublicConfig {
  version: string; // semver for compatibility negotiation
  currency: string; // e.g., 'USD'
  pricing: {
    monthly: number; // price per month in currency units
    yearlyDiscount: number; // 0..1 fraction
  };
  limits: {
    free: { dailyLimit: number; minIntervalHours: number };
    pro: { minIntervalHours: number };
  };
  urls: {
    support: string;
    upgrade: string; // checkout/upgrade page
    billingPortal: string; // manage subscription
  };
  features?: {
    free?: string[];
    pro?: string[];
  };
}

// Authenticated per-user entitlements and effective limits
export interface Entitlements {
  plan: 'free' | 'pro';
  effectiveLimits: {
    dailyLimit: number;
    minIntervalHours: number;
  };
  flags?: Record<string, boolean>;
}
