export interface AppConfig {
  // Notion Integration
  notion: {
    clientId: string;
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
    serverUrl: getEnvVar('VITE_OAUTH_SERVER_URL', 'http://bookmark-assistant-server.vercel.app'),
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
};

/**
 * Server API Configuration (Legacy - kept for backward compatibility)
 * NOTE: Moving to direct Notion API calls, this may be deprecated soon
 */
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_OAUTH_SERVER_URL || 'http://bookmark-assistant-server.vercel.app',
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

  if (!config.notion.clientId) {
    errors.push('VITE_NOTION_CLIENT_ID is required');
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
  });
  console.groupEnd();
}
