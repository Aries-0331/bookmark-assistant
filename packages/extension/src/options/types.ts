export type Plan = 'free' | 'pro';

export type Tab = 'oauth' | 'manual';

export interface SyncStatus {
  isConnected: boolean;
  lastSync?: string;
  error?: string;
  isLoading?: boolean;
}

export interface PublicConfig {
  pricing: {
    currency: string;
    monthly: number;
    yearlyDiscount: number;
  };
  limits: {
    free: {
      dailyLimit: number;
      minIntervalHours: number;
    };
    pro: {
      dailyLimit: number;
      minIntervalHours: number;
    };
  };
}
