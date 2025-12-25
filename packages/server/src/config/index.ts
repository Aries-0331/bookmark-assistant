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

  // Website Configuration
  websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3006',

  // CORS Configuration
  allowedOrigins: [
    `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}`,
    'http://localhost:3000', // Next.js website dev server
    'http://localhost:5173', // Vite extension dev server
    'http://localhost:3006', // Alternative Next.js port
    process.env.WEBSITE_URL || 'http://localhost:3006', // Production website
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

  // Description Extraction Configuration
  descriptionExtraction: {
    // Batch size for concurrent description extractions
    // Smaller batches prevent connection pool exhaustion
    batchSize: Number(process.env.DESCRIPTION_EXTRACTION_BATCH_SIZE) || 5,
    // Delay between batches (ms)
    batchDelayMs: Number(process.env.DESCRIPTION_EXTRACTION_BATCH_DELAY) || 100,
    // Timeout for individual extraction (ms)
    timeoutMs: Number(process.env.DESCRIPTION_EXTRACTION_TIMEOUT) || 5000,
  },

  pricing: {
    monthlyFallback: 2.99, // USD per month - fallback only
    lifetimeFallback: 29.99, // USD one-time - fallback only
  },

  limits: {
    free: {
      minIntervalHours: Number(process.env.FREE_INTERVAL_HOURS) || 24,
      syncBatchLimit: Number(process.env.FREE_SYNC_BATCH_LIMIT) || 50,
    },
    pro: {
      minIntervalHours: Number(process.env.PRO_INTERVAL_HOURS) || 6,
      syncBatchLimit: Number(process.env.PRO_SYNC_BATCH_LIMIT) || 10000,
    },
  },

  // Paddle Payment Configuration
  paddle: {
    apiKey: process.env.PADDLE_API_KEY || '',
    environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
    priceIds: {
      proMonthly: process.env.PADDLE_PRO_MONTHLY_PRICE_ID || '',
      proLifetime: process.env.PADDLE_PRO_LIFETIME_PRICE_ID || '', // Previously YEARLY
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

  console.log('✅ Configuration validated successfully');
}

export default config;
