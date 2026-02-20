// ⚙️ Server Configuration and Environment Setup

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables in order:
// 1. .env (base configuration)
// 2. .env.local (overrides for local development)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

export const config = {
  // Server Configuration
  port: process.env.PORT || 3333,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Edition (controls entitlements). Accepts 'pro' to enable Pro features; defaults to 'open-source'
  isPro: process.env.isPro === 'true',

  // Database Configuration
  databaseUrl: process.env.DATABASE_URL!,

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
  // Support multiple domains: comma-separated URLs or single URL
  websiteUrl: process.env.WEBSITE_URL?.split(',')[0] || 'http://localhost:3006',

  // CORS Configuration
  // Parse WEBSITE_URL (comma-separated) into array for CORS origins
  // Automatically includes both www and non-www variants
  allowedOrigins: (() => {
    const origins = [
      `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}`,
      'http://localhost:3001', // Alternative Next.js port
    ];

    // Add website URLs (both www and non-www variants)
    const websiteUrls = process.env.WEBSITE_URL?.split(',').map((url) => url.trim()) || [];
    for (const url of websiteUrls) {
      origins.push(url);
      // Add www variant if not already present
      if (url.startsWith('https://') && !url.includes('www.')) {
        origins.push(url.replace('https://', 'https://www.'));
      } else if (url.startsWith('http://') && !url.includes('www.')) {
        origins.push(url.replace('http://', 'http://www.'));
      }
    }

    return origins;
  })(),

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
    monthlyFallback: 2.5, // USD per month - fallback only
    lifetimeFallback: 30, // USD one-time - fallback only
  },

  limits: {
    free: {
      minIntervalHours: Number(process.env.FREE_INTERVAL_HOURS) || 24,
      syncBatchLimit: Number(process.env.FREE_SYNC_BATCH_LIMIT) || 500,
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
      proLifetime: process.env.PADDLE_PRO_LIFETIME_PRICE_ID || '',
    },
  },
} as const;

// Validation function to ensure required environment variables are set
export function validateConfig(): void {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ALLOWED_EXTENSION_ID',
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
  ];

  // Paddle is optional for development but required for production
  // Note: Only monthly and lifetime plans exist (no yearly)
  const paddleVars = [
    'PADDLE_API_KEY',
    'PADDLE_WEBHOOK_SECRET',
    'PADDLE_PRO_MONTHLY_PRICE_ID',
    'PADDLE_PRO_LIFETIME_PRICE_ID',
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
