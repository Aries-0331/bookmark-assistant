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
