// ⚙️ Server Configuration and Environment Setup

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3333,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Edition (controls entitlements). Accepts 'pro' to enable Pro features; defaults to 'open-source'
  isPro: process.env.isPro === 'true',

  // Security Configuration
  jwtSecret: process.env.JWT_SECRET!,
  allowedExtensionId: process.env.ALLOWED_EXTENSION_ID!,

  // Notion API Configuration
  notionClientId: process.env.NOTION_CLIENT_ID!,
  notionClientSecret: process.env.NOTION_CLIENT_SECRET!,
  // Upgrade to new Notion API release; allow env override for safe rollout
  notionApiVersion: process.env.NOTION_API_VERSION || '2025-09-03',

  // Rate Limiting Configuration
  rateLimits: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 requests per window
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests per window
    },
  },

  // CORS Configuration
  allowedOrigins: [
    `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}`,
    'http://localhost:3000', // Next.js website dev server
    'http://localhost:5173', // Vite extension dev server
    'http://localhost:3006', // Alternative Next.js port
  ],

  // Session Configuration
  session: {
    expiryHours: 24,
    cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
  },

  // Batch Processing Configuration
  batchDefaults: {
    size: 3,
    delayMs: 334, // ~3 requests per second
  },

  // Template Configuration
  templatePageId: '257d872b594c805a9f580037c0162612',

  // Pricing & Limits Configuration (synced with Paddle and extension)
  pricing: {
    monthly: Number(process.env.PRICING_MONTHLY) || 4.99, // USD per month
    yearlyDiscount: Number(process.env.PRICING_YEARLY_DISCOUNT) || 0.3, // 30% off
  },

  limits: {
    free: {
      dailyLimit: Number(process.env.FREE_DAILY_LIMIT) || 100,
      minIntervalHours: Number(process.env.FREE_INTERVAL_HOURS) || 12,
    },
    pro: {
      dailyLimit: Number(process.env.PRO_DAILY_LIMIT) || 1000,
      minIntervalHours: Number(process.env.PRO_INTERVAL_HOURS) || 0.5,
    },
  },

  // Paddle Payment Configuration
  paddle: {
    apiKey: process.env.PADDLE_API_KEY || '',
    environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
    priceIds: {
      proMonthly: process.env.PADDLE_PRO_MONTHLY_PRICE_ID || '',
      proYearly: process.env.PADDLE_PRO_YEARLY_PRICE_ID || '',
    },
  },
} as const;

// Validation function to ensure required environment variables are set
export function validateConfig(): void {
  const requiredVars = [
    'JWT_SECRET',
    'ALLOWED_EXTENSION_ID',
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
  ];

  // Paddle is optional for development but required for production
  const paddleVars = [
    'PADDLE_API_KEY',
    'PADDLE_WEBHOOK_SECRET',
    'PADDLE_PRO_MONTHLY_PRICE_ID',
    'PADDLE_PRO_YEARLY_PRICE_ID',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please check your .env file and environment configuration.`
    );
  }

  // Warn if Paddle vars are missing in production
  if (process.env.NODE_ENV === 'production') {
    const missingPaddle = paddleVars.filter((varName) => !process.env[varName]);
    if (missingPaddle.length > 0) {
      console.warn(
        `⚠️  Missing Paddle environment variables: ${missingPaddle.join(', ')}. Payment features will be disabled.`
      );
    }
  }

  // Validate pricing configuration
  const pricingVars = ['PRICING_MONTHLY', 'PRICING_YEARLY_DISCOUNT'];
  const missingPricing = pricingVars.filter((varName) => !process.env[varName]);
  if (missingPricing.length > 0) {
    console.warn(
      `⚠️  Missing pricing configuration: ${missingPricing.join(', ')}. Using defaults.`
    );
  }

  // Warn if pricing seems misconfigured
  const monthly = config.pricing.monthly;
  const discount = config.pricing.yearlyDiscount;
  if (monthly <= 0) {
    console.warn(`⚠️  PRICING_MONTHLY should be > 0 (current: ${monthly})`);
  }
  if (discount < 0 || discount >= 1) {
    console.warn(`⚠️  PRICING_YEARLY_DISCOUNT should be between 0 and 1 (current: ${discount})`);
  }
}

export default config;
