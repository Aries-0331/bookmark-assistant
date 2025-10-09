/**
 * Environment Configuration
 * Centralizes all environment variables for the Chrome extension
 */

// NOTE: Window polyfill removed since @notionhq/client is no longer used in extension
// Service worker compatibility check
// if (typeof window === 'undefined' && typeof globalThis !== 'undefined') {
//   (globalThis as any).window = globalThis;
// }

export interface AppConfig {
  // Notion Integration
  notion: {
    clientId: string;
    redirectUri: string;
    serverUrl: string;
  };

  // AI Services
  ai: {
    openaiApiKey: string;
    model: string;
    maxTokens: number;
  };

  // App Settings
  app: {
    name: string;
    version: string;
    debugMode: boolean;
  };

  // Content Extraction
  extraction: {
    maxContentLength: number;
    timeout: number;
  };

  // Sync Settings
  sync: {
    autoSyncEnabled: boolean;
    batchSize: number;
    delay: number;
  };
}

/**
 * Get environment variable with type safety and validation
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value;
}

/**
 * Get environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean) {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue = 0) {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Application configuration object
 */
export const config: AppConfig = {
  notion: {
    clientId: getEnvVar('VITE_NOTION_CLIENT_ID', ''),
    redirectUri: getEnvVar('VITE_NOTION_REDIRECT_URI', 'chrome-extension://'),
    serverUrl: getEnvVar('VITE_OAUTH_SERVER_URL', 'http://localhost:3333'),
  },
  ai: {
    openaiApiKey: getEnvVar('VITE_OPENAI_API_KEY', ''),
    model: getEnvVar('VITE_OPENAI_MODEL', 'gpt-3.5-turbo'),
    maxTokens: getEnvNumber('VITE_OPENAI_MAX_TOKENS', 150),
  },
  app: {
    name: getEnvVar('VITE_APP_NAME', 'Bookmark Notion Sync'),
    version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
    debugMode: getEnvBoolean('VITE_DEBUG_MODE', true),
  },
  extraction: {
    maxContentLength: getEnvNumber('VITE_MAX_CONTENT_LENGTH', 5000),
    timeout: getEnvNumber('VITE_EXTRACTION_TIMEOUT', 10000),
  },
  sync: {
    autoSyncEnabled: getEnvBoolean('VITE_AUTO_SYNC_ENABLED', true),
    batchSize: getEnvNumber('VITE_BATCH_SIZE', 10),
    delay: getEnvNumber('VITE_SYNC_DELAY', 1000),
  },
};

/**
 * Server API Configuration (Legacy - kept for backward compatibility)
 * NOTE: Moving to direct Notion API calls, this may be deprecated soon
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_OAUTH_SERVER_URL || 'http://localhost:3333',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
} as const;

/**
 * Direct Notion API Configuration (Recommended)
 */
export const NOTION_CONFIG = {
  apiUrl: 'https://api.notion.com/v1',
  version: '2025-09-03',
  clientId: import.meta.env.VITE_NOTION_CLIENT_ID || '',
  // clientSecret intentionally omitted from extension bundle (server-only)
} as const;

/**
 * Validate configuration and log warnings for missing values
 */
export function validateConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors = Array<string>();
  const warnings = Array<string>();

  // Check required Notion credentials
  if (!config.notion.clientId) {
    errors.push('VITE_NOTION_CLIENT_ID is required');
  }
  // Client secret intentionally NOT required client-side; server handles confidential exchange
  // Check AI configuration (optional - only warn)
  if (!config.ai.openaiApiKey) {
    warnings.push('VITE_OPENAI_API_KEY not provided - AI features will be disabled');
  }

  // Validate numeric ranges
  if (config.extraction.maxContentLength <= 0) {
    errors.push('VITE_MAX_CONTENT_LENGTH must be greater than 0');
  }
  if (config.sync.batchSize <= 0) {
    errors.push('VITE_BATCH_SIZE must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if AI features are available and enabled
 * AI features are currently disabled to focus on core functionality
 */
export function isAIEnabled(): boolean {
  // AI features disabled for now - will be added as advanced features later
  return false;
  // return !!config.ai.openaiApiKey;
}

/**
 * Debug helper to log current configuration (excluding sensitive data)
 */
export function debugConfig(): void {
  if (!config.app.debugMode) return;

  console.group('🔧 Extension Configuration');
  console.log('App:', {
    name: config.app.name,
    version: config.app.version,
    debugMode: config.app.debugMode,
  });
  console.log('Notion:', {
    clientId: config.notion.clientId ? '✅ Set' : '❌ Missing',
    redirectUri: config.notion.redirectUri ? '✅ Set' : '❌ Missing',
  });
  console.log('AI:', {
    openaiApiKey: config.ai.openaiApiKey ? '✅ Set' : '❌ Missing',
    model: config.ai.model,
    maxTokens: config.ai.maxTokens,
    enabled: isAIEnabled(),
  });
  console.log('Extraction:', config.extraction);
  console.log('Sync:', config.sync);
  console.groupEnd();
}
