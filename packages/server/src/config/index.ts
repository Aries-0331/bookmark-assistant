// ⚙️ Server Configuration and Environment Setup

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3334,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Security Configuration
  jwtSecret: process.env.JWT_SECRET!,
  allowedExtensionId: process.env.ALLOWED_EXTENSION_ID!,

  // Notion API Configuration
  notionClientId: process.env.NOTION_CLIENT_ID!,
  notionClientSecret: process.env.NOTION_CLIENT_SECRET!,
  notionApiVersion: '2022-06-28',

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
    'http://localhost:3000', // For development
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
} as const;

// Validation function to ensure required environment variables are set
export function validateConfig(): void {
  const requiredVars = [
    'JWT_SECRET',
    'ALLOWED_EXTENSION_ID',
    'NOTION_CLIENT_ID',
    'NOTION_CLIENT_SECRET',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env file and environment configuration.'
    );
  }
}

export default config;
