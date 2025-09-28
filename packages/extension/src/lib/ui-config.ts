// UI Configuration constants for the options page
// These were moved from notion.ts to eliminate dependencies


export interface DatabaseCreationOption {
  type: 'oauth_template' | 'duplicate' | 'custom';
  name: string;
  description: string;
  recommended?: boolean;
}

export interface DatabaseOption {
  id: string;
  name: string;
  url: string;
  isValid: boolean;
}

export interface CustomDatabaseConfig {
  title: string;
  properties: {
    [key: string]: {
      type: 'title' | 'url' | 'rich_text' | 'date' | 'select' | 'multi_select' | 'checkbox';
      enabled: boolean;
    };
  };
}

export const DATABASE_CREATION_OPTIONS: DatabaseCreationOption[] = [
  {
    type: 'oauth_template',
    name: '🎨 Use Official Template (Recommended)',
    description:
      'Connect via Notion OAuth - automatically duplicates our premium bookmark template during authorization with all formatting and optimizations preserved',
    recommended: true,
  },
  {
    type: 'duplicate',
    name: '📋 Manual Template Duplication',
    description:
      "Manually duplicate our template page then paste the URL - alternative method if OAuth template wasn't selected during connection",
  },
  {
    type: 'custom',
    name: '🔧 Custom Configuration',
    description:
      'Build your own bookmark database from scratch - choose properties, customize layouts, and tailor the structure to your specific workflow needs',
  },
];

export const DEFAULT_CUSTOM_PROPERTIES = {
  Title: { type: 'title' as const, enabled: true },
  URL: { type: 'url' as const, enabled: true },
  Description: { type: 'rich_text' as const, enabled: true },
  Created: { type: 'date' as const, enabled: true },
  Path: { type: 'rich_text' as const, enabled: true },
  Tags: { type: 'multi_select' as const, enabled: false },
  Priority: { type: 'select' as const, enabled: false },
  Read: { type: 'checkbox' as const, enabled: false },
  Notes: { type: 'rich_text' as const, enabled: false },
};

export const TEMPLATE_DUPLICATION_GUIDE = {
  title: '📋 Manual Template Duplication Guide',
  templateUrl: 'https://notion.so/bookmark-template',
  steps: [
    {
      step: 1,
      title: 'Open Template',
      description: 'Click the template link above to open our bookmark database template in Notion',
      action: 'Open Template',
    },
    {
      step: 2,
      title: 'Duplicate Database',
      description:
        'Click "Duplicate" in the top-right corner to create your own copy of the template',
      action: 'Duplicate',
    },
    {
      step: 3,
      title: 'Copy Database URL',
      description: 'Copy the URL of your newly duplicated database from the browser address bar',
      action: 'Copy URL',
    },
    {
      step: 4,
      title: 'Paste URL Below',
      description: 'Paste the database URL in the field below and click "Validate Database"',
      action: 'Paste & Validate',
    },
  ],
  troubleshooting: [
    'Make sure you have edit permissions to the database',
    'The URL should contain a long database ID (32 characters)',
    "Try refreshing the page if the duplication button doesn't appear",
    "Ensure you're logged into the correct Notion workspace",
  ],
};

/**
 * Extract database ID from a duplicated template URL
 */
export function extractDatabaseIdFromUrl(notionUrl: string): string | null {
  try {
    // Handle various Notion URL formats
    const patterns = [
      // Standard database URL: https://notion.so/workspace/title-databaseid
      /notion\.so\/[^\/]+\/[^\/]*-?([a-f0-9]{32})/i,
      // Direct database URL: https://notion.so/databaseid
      /notion\.so\/([a-f0-9]{32})/i,
      // Database URL with query: https://notion.so/databaseid?v=...
      /notion\.so\/([a-f0-9]{32})\?/i,
    ];

    for (const pattern of patterns) {
      const match = notionUrl.match(pattern);
      if (match) {
        const id = match[1];
        // Format with dashes for Notion API
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate that a duplicated template has the expected structure
 */
export async function validateDuplicatedTemplate(databaseId: string): Promise<{
  isValid: boolean;
  error?: string;
  properties?: string[];
}> {
  try {
    // This would normally validate via server API
    // For now, just validate the format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(databaseId)) {
      return {
        isValid: false,
        error: 'Invalid database ID format',
      };
    }

    // TODO: Add server API call to validate database structure
    return {
      isValid: true,
      properties: ['Name', 'URL', 'Tags', 'Date Added'], // Mock expected properties
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Create bookmark database (placeholder for server API)
 */
export async function createBookmarkDatabase(
  type: string,
  config?: CustomDatabaseConfig,
  databaseId?: string
): Promise<{ id: string; name: string }> {
  try {
    // TODO: Implement server API call to create database
    console.log('Creating database with type:', type, 'config:', config, 'databaseId:', databaseId);
    throw new Error('Database creation moved to server - use server API endpoints');
  } catch (error) {
    console.error('Failed to create database:', error);
    throw error;
  }
}
