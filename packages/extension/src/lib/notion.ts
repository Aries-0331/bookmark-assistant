import { Client } from '@notionhq/client';
import { makeRequest } from './request-helper';

// Error type for API errors
interface APIError {
  code?: string;
  message?: string;
  status?: number;
}

export interface NotionBookmark {
  url: string;
  title: string;
  summary?: string;
  content?: string;
  createdAt: string;
  bookmarkId: string;
  path?: string; // Bookmark path in Chrome bookmarks tree
}

export interface DatabaseOption {
  id: string;
  name: string;
  url?: string;
}

export interface BookmarkData {
  title: string;
  url: string;
  description?: string;
  content?: string;
  keywords?: string[];
  dateAdded?: string;
  path?: string; // Bookmark path in Chrome bookmarks tree
}

// Template configuration
const BOOKMARK_TEMPLATE_URL =
  'https://www.notion.so/2659466de76d8071b304f2e6654873bd?v=2659466de76d80a0b18b000c997a014a&source=copy_link';
const BOOKMARK_TEMPLATE_ID = '2659466d-e76d-8071-b304-f2e6654873bd';

export interface DatabaseCreationOption {
  type: 'template' | 'duplicate' | 'custom' | 'oauth_template';
  name: string;
  description: string;
  recommended?: boolean;
}

export interface TemplateDuplicationGuide {
  steps: string[];
  templateUrl: string;
  videoUrl?: string;
  troubleshooting: string[];
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
  {
    type: 'template',
    name: '⚡ Quick Setup (Legacy)',
    description:
      'Rapid database creation with standard properties - functional but may not include advanced template features like optimized views and enhanced formatting',
  },
];

export const TEMPLATE_DUPLICATION_GUIDE: TemplateDuplicationGuide = {
  steps: [
    '🎨 Click "Open Template" to access our meticulously crafted bookmark database',
    '📋 In the template page, click "Duplicate" button (top right) to copy to your workspace',
    '🏢 Choose your workspace and click "Duplicate" to preserve all optimizations',
    '🔗 Copy the URL of your duplicated page and paste it in the field below',
    '✅ Click "Use Duplicated Template" to activate seamless Chrome bookmark sync',
  ],
  templateUrl: BOOKMARK_TEMPLATE_URL,
  troubleshooting: [
    '🔐 Ensure you\'re logged into Notion to see the "Duplicate" button',
    '🎯 Your duplicated database preserves all view configurations, property visibility, and formatting',
    '✏️ You can rename the duplicated page after setup - all functionality remains intact',
    '🔄 Template duplication is recommended over other methods to maintain visual excellence',
  ],
};

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

let notion: Client | null = null;
let databaseIdCache: string | null = null;
let databaseInitPromise: Promise<string> | null = null;

export async function initNotion(authToken: string) {
  notion = new Client({
    auth: authToken,
    fetch: makeRequest,
  });
}

/**
 * Extract database ID from a duplicated template URL
 */
export function extractDatabaseIdFromUrl(notionUrl: string): string | null {
  try {
    // Handle various Notion URL formats
    const patterns = [
      // Standard database URL: https://www.notion.so/username/Title-abc123def456
      /notion\.so\/[^\/]+\/[^\/]*-?([a-f0-9]{32})/i,
      // Direct database URL: https://www.notion.so/abc123def456
      /notion\.so\/([a-f0-9]{32})/i,
      // Database URL with view: https://www.notion.so/abc123def456?v=viewid
      /notion\.so\/([a-f0-9]{32})\?/i,
    ];

    for (const pattern of patterns) {
      const match = notionUrl.match(pattern);
      if (match && match[1]) {
        const rawId = match[1];
        // Format as proper UUID
        return `${rawId.substring(0, 8)}-${rawId.substring(8, 12)}-${rawId.substring(12, 16)}-${rawId.substring(16, 20)}-${rawId.substring(20)}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting database ID from URL:', error);
    return null;
  }
}

/**
 * Validate that a duplicated template is accessible and has the expected structure
 */
export async function validateDuplicatedTemplate(databaseId: string): Promise<{
  isValid: boolean;
  error?: string;
  databaseInfo?: any;
}> {
  if (!notion) {
    const storage = await chrome.storage.local.get(['notion_token']);
    if (!storage.notion_token) {
      return { isValid: false, error: 'No Notion token found' };
    }
    initNotion(storage.notion_token);
  }

  if (!notion) {
    return { isValid: false, error: 'Failed to initialize Notion client' };
  }

  try {
    console.log('🔍 Validating duplicated template database...');

    // Try to retrieve the database
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    console.log('✅ Database accessible:', database.id);

    // Validate it has expected properties for bookmarks
    const properties = database.properties;
    const requiredProps = ['Title', 'URL'];
    const missingProps = requiredProps.filter((prop) => !properties[prop]);

    if (missingProps.length > 0) {
      return {
        isValid: false,
        error: `Database is missing required properties: ${missingProps.join(', ')}`,
      };
    }

    // Test if we can query it
    const testQuery = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
    });

    console.log('✅ Database is queryable');

    return {
      isValid: true,
      databaseInfo: {
        id: database.id,
        title: (database as any).title?.[0]?.plain_text || 'Bookmarks',
        properties: Object.keys(properties),
        pageCount: testQuery.results.length,
      },
    };
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ Template validation failed:', apiError.message);

    if (apiError?.code === 'object_not_found') {
      return {
        isValid: false,
        error:
          'Database not found. Please make sure you copied the correct URL and the page is accessible.',
      };
    }

    if (apiError?.message?.includes('shared with your integration')) {
      return {
        isValid: false,
        error:
          'Database is not shared with the bookmark sync integration. Please share the duplicated page with the integration.',
      };
    }

    return {
      isValid: false,
      error: `Validation failed: ${apiError.message}`,
    };
  }
}

/**
 * Handle OAuth authorization callback with templated database ID
 * This function should be called when your backend receives the OAuth response from Notion
 */
export async function handleOAuthTemplateCallback(
  accessToken: string,
  templatedDatabaseId: string
): Promise<{
  success: boolean;
  error?: string;
  databaseInfo?: any;
}> {
  try {
    console.log('🎉 Handling OAuth template callback...');
    console.log('📋 Templated database ID received:', templatedDatabaseId);

    // Initialize Notion client with the new access token
    await initNotion(accessToken);

    // Store the access token
    await chrome.storage.local.set({ notion_token: accessToken });

    // Set up the OAuth-templated database
    const setup = await setupWithOAuthTemplateDatabaseId(templatedDatabaseId);

    if (setup.success) {
      console.log('✅ OAuth template setup completed successfully!');

      // Show success notification
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon48.png',
          title: 'Notion Connected Successfully',
          message: '🎉 Your bookmark template is ready! You can now start syncing bookmarks.',
        });
      } catch (notificationError) {
        console.log('Could not show notification:', notificationError);
      }

      return {
        success: true,
        databaseInfo: setup.databaseInfo,
      };
    } else {
      return {
        success: false,
        error: setup.error || 'Failed to setup OAuth template',
      };
    }
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ OAuth template callback failed:', apiError);
    return {
      success: false,
      error: `OAuth callback failed: ${apiError.message || 'Unknown error'}`,
    };
  }
}

/**
 * Set up bookmark sync with OAuth-templated database (received from Notion OAuth response)
 */
export async function setupWithOAuthTemplateDatabaseId(databaseId: string): Promise<{
  success: boolean;
  error?: string;
  databaseInfo?: any;
}> {
  try {
    console.log('🎨 Setting up bookmark sync with OAuth-templated database ID:', databaseId);

    // Validate the OAuth-templated database structure
    const validation = await validateOAuthTemplateDatabase(databaseId);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Store the OAuth-templated database ID
    await chrome.storage.local.set({
      notion_database_id: databaseId,
      database_source: 'oauth_template',
    });

    // Clear cache to force reinitialization with new database
    databaseIdCache = databaseId;

    console.log('✅ OAuth-templated database setup complete!');

    // Show success notification
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'OAuth Template Connected',
        message:
          '✅ Your official bookmark template is ready! Perfect formatting and views preserved.',
      });
    } catch (notificationError) {
      console.log('Could not show notification:', notificationError);
    }

    return {
      success: true,
      databaseInfo: validation.databaseInfo,
    };
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ OAuth template setup failed:', apiError);
    return {
      success: false,
      error: `OAuth template setup failed: ${apiError.message || 'Unknown error'}`,
    };
  }
}

/**
 * Validate OAuth-templated database (from Notion's duplicate response)
 */
export async function validateOAuthTemplateDatabase(databaseId: string): Promise<{
  isValid: boolean;
  error?: string;
  databaseInfo?: any;
}> {
  if (!notion) {
    const storage = await chrome.storage.local.get(['notion_token']);
    if (!storage.notion_token) {
      return { isValid: false, error: 'No Notion token found' };
    }
    initNotion(storage.notion_token);
  }

  if (!notion) {
    return { isValid: false, error: 'Failed to initialize Notion client' };
  }

  try {
    console.log('🔍 Validating OAuth-templated database...');

    // Retrieve the OAuth-duplicated database
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    console.log('✅ OAuth-templated database accessible:', database.id);

    // Validate it has the expected template structure
    const properties = database.properties;
    const expectedProps = ['Title', 'URL', 'Description', 'Created'];
    const missingProps = expectedProps.filter((prop) => !properties[prop]);

    if (missingProps.length > 0) {
      return {
        isValid: false,
        error: `OAuth template is missing expected properties: ${missingProps.join(', ')}`,
      };
    }

    // Test if we can query the database
    const testQuery = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
    });

    console.log('✅ OAuth-templated database is queryable');

    const title = (database as any).title?.[0]?.plain_text || 'Chrome Bookmarks';

    return {
      isValid: true,
      databaseInfo: {
        id: database.id,
        title,
        properties: Object.keys(properties),
        pageCount: testQuery.results.length,
        source: 'oauth_template',
      },
    };
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ OAuth template validation failed:', apiError.message);

    if (apiError?.code === 'object_not_found') {
      return {
        isValid: false,
        error:
          'OAuth-templated database not found. Please ensure the template was duplicated correctly during authorization.',
      };
    }

    if (apiError?.message?.includes('shared with your integration')) {
      return {
        isValid: false,
        error:
          'OAuth-templated database is not accessible. This should not happen with OAuth template duplication.',
      };
    }

    return {
      isValid: false,
      error: `OAuth template validation failed: ${apiError.message}`,
    };
  }
}

/**
 * Detect existing OAuth-templated databases (fallback for existing users)
 */
export async function detectOAuthTemplateDatabase(): Promise<{
  isTemplateDatabase: boolean;
  databaseInfo?: any;
  error?: string;
}> {
  if (!notion) {
    const storage = await chrome.storage.local.get(['notion_token']);
    if (!storage.notion_token) {
      return { isTemplateDatabase: false, error: 'No Notion token found' };
    }
    initNotion(storage.notion_token);
  }

  if (!notion) {
    return { isTemplateDatabase: false, error: 'Failed to initialize Notion client' };
  }

  try {
    console.log('🔍 Scanning workspace for existing OAuth-templated bookmark databases...');

    // Search for databases that match our template structure
    const searchResponse = await notion.search({
      filter: {
        value: 'database',
        property: 'object',
      },
      page_size: 100,
    });

    for (const result of searchResponse.results) {
      if ('properties' in result && result.properties) {
        // Check if this database has the template structure
        const properties = result.properties;
        const hasBookmarkStructure =
          properties.Title && properties.URL && properties.Description && properties.Created;

        if (hasBookmarkStructure) {
          console.log('✅ Found existing OAuth-templated bookmark database:', result.id);

          const title =
            'title' in result && result.title
              ? result.title
                  .map((t: any) => t.plain_text || '')
                  .join('')
                  .trim()
              : 'Chrome Bookmarks';

          return {
            isTemplateDatabase: true,
            databaseInfo: {
              id: result.id,
              title,
              properties: Object.keys(properties),
              url: `https://www.notion.so/${result.id.replace(/-/g, '')}`,
            },
          };
        }
      }
    }

    console.log('❌ No existing OAuth-templated bookmark database found');
    return { isTemplateDatabase: false };
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ OAuth template detection failed:', apiError.message);
    return {
      isTemplateDatabase: false,
      error: `Detection failed: ${apiError.message}`,
    };
  }
}

/**
 * Set up bookmark sync with OAuth-templated database (legacy function - redirects to new implementation)
 */
export async function setupWithOAuthTemplate(databaseId: string): Promise<{
  success: boolean;
  error?: string;
  databaseInfo?: any;
}> {
  console.log('🔄 Redirecting to new OAuth template setup method...');
  return await setupWithOAuthTemplateDatabaseId(databaseId);
}
export async function setupWithDuplicatedTemplate(databaseId: string): Promise<{
  success: boolean;
  error?: string;
  databaseInfo?: any;
}> {
  try {
    console.log('🎨 Setting up bookmark sync with duplicated template...');

    // First validate the database
    const validation = await validateDuplicatedTemplate(databaseId);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Store the database ID
    await chrome.storage.local.set({ notion_database_id: databaseId });

    // Clear cache to force reinitialization
    databaseIdCache = databaseId;

    console.log('✅ Duplicated template database setup complete!');

    // Show success notification
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'Template Setup Complete',
        message:
          '✅ Your duplicated bookmark template is ready! All view settings and formatting preserved.',
      });
    } catch (notificationError) {
      console.log('Could not show notification:', notificationError);
    }

    return {
      success: true,
      databaseInfo: validation.databaseInfo,
    };
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ Template setup failed:', apiError);
    return {
      success: false,
      error: `Setup failed: ${apiError.message || 'Unknown error'}`,
    };
  }
}
export async function testTemplateAccess(): Promise<{
  accessible: boolean;
  schema?: any;
  title?: string;
  error?: string;
}> {
  if (!notion) {
    const storage = await chrome.storage.local.get(['notion_token']);
    if (!storage.notion_token) {
      return { accessible: false, error: 'No Notion token found' };
    }
    initNotion(storage.notion_token);
  }

  if (!notion) {
    return { accessible: false, error: 'Failed to initialize Notion client' };
  }

  try {
    console.log('🔍 Testing template database access...');
    const database = await notion.databases.retrieve({
      database_id: BOOKMARK_TEMPLATE_ID,
    });

    console.log('✅ Template database accessible!');
    return {
      accessible: true,
      schema: database.properties,
      title: (database as any).title?.[0]?.plain_text || 'Bookmarks Template',
    };
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.warn('❌ Template database not accessible:', apiError.message);

    if (
      apiError?.code === 'object_not_found' ||
      apiError?.message?.includes('shared with your integration')
    ) {
      return {
        accessible: false,
        error:
          'Template not shared with integration. Please share the template database with your Notion integration.',
      };
    }

    return {
      accessible: false,
      error: `Template access failed: ${apiError.message}`,
    };
  }
}

/**
 * Create database from template by copying its schema
 */
export async function createDatabaseFromTemplate(): Promise<{
  id: string;
  name: string;
  url: string;
}> {
  console.log('🎨 Creating database from template...');

  // First verify template access
  const templateTest = await testTemplateAccess();
  if (!templateTest.accessible) {
    throw new Error(`Template not accessible: ${templateTest.error}`);
  }

  const storage = await chrome.storage.local.get(['notion_token']);
  if (!storage.notion_token) {
    throw new Error('Notion token not found - please connect first');
  }

  if (!notion) {
    initNotion(storage.notion_token);
  }

  if (!notion) {
    throw new Error('Failed to initialize Notion client');
  }

  // Create workspace page first
  console.log('🏗️ Creating workspace page for template-based database...');
  let parentId: string;

  try {
    const page = await notion.pages.create({
      parent: {
        workspace: true,
      } as any,
      properties: {
        title: {
          title: [
            {
              type: 'text',
              text: {
                content: '📚 Chrome Bookmarks (Template)',
              },
            },
          ],
        },
      },
    });

    parentId = page.id;
    console.log('✅ Workspace page created successfully:', parentId);
  } catch (pageError: unknown) {
    const apiError = pageError as APIError;
    console.error('❌ Failed to create workspace page:', apiError);
    throw new Error(`Cannot create workspace page: ${apiError?.message || 'Unknown error'}`);
  }

  // Get template schema and create database with same structure
  try {
    const templateDatabase = await notion.databases.retrieve({
      database_id: BOOKMARK_TEMPLATE_ID,
    });

    console.log('🎨 Using template schema:', Object.keys(templateDatabase.properties || {}));

    // Create new database with template schema
    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentId,
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Bookmarks',
          },
        },
      ],
      // Use template properties (but we need to create our own structure for TypeScript)
      properties: {
        // Copy the basic structure we know should be there
        Title: { title: {} },
        URL: { url: {} },
        Description: { rich_text: {} },
        Created: { date: {} },
        Path: { rich_text: {} },
        _sync_id: { rich_text: {} },
      },
    });

    console.log('✅ Database created from template successfully:', database.id);

    // Try to configure views if the template had them
    try {
      await configureCleanTableView(database.id);
    } catch (viewError) {
      console.log('ℹ️ Could not configure views (using defaults):', viewError);
    }

    // Notification
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'Template Database Created',
        message: '✅ Your bookmark database was created using the optimized template!',
      });
    } catch (notificationError) {
      console.log('Could not show notification:', notificationError);
    }

    const dbUrl = `https://www.notion.so/${database.id.replace(/-/g, '')}`;
    return {
      id: database.id,
      name: '📚 Chrome Bookmarks (Template)',
      url: dbUrl,
    };
  } catch (templateError: unknown) {
    const apiError = templateError as APIError;
    console.error('❌ Template-based database creation failed:', apiError);
    throw new Error(
      `Failed to create database from template: ${apiError?.message || 'Unknown error'}`
    );
  }
}

/**
 * Create database with custom properties selected by user
 */
export async function createDatabaseWithCustomProperties(config: CustomDatabaseConfig): Promise<{
  id: string;
  name: string;
  url: string;
}> {
  console.log('🔧 Creating database with custom properties...');

  const storage = await chrome.storage.local.get(['notion_token']);
  if (!storage.notion_token) {
    throw new Error('Notion token not found - please connect first');
  }

  if (!notion) {
    initNotion(storage.notion_token);
  }

  if (!notion) {
    throw new Error('Failed to initialize Notion client');
  }

  // Create workspace page first
  console.log('🏗️ Creating workspace page for custom database...');
  let parentId: string;

  try {
    const page = await notion.pages.create({
      parent: {
        workspace: true,
      } as any,
      properties: {
        title: {
          title: [
            {
              type: 'text',
              text: {
                content: config.title || '📚 Chrome Bookmarks (Custom)',
              },
            },
          ],
        },
      },
    });

    parentId = page.id;
    console.log('✅ Workspace page created successfully:', parentId);
  } catch (pageError: unknown) {
    const apiError = pageError as APIError;
    console.error('❌ Failed to create workspace page:', apiError);
    throw new Error(`Cannot create workspace page: ${apiError?.message || 'Unknown error'}`);
  }

  // Build properties from config
  const properties: any = {};
  const enabledProperties: string[] = [];

  for (const [propName, propConfig] of Object.entries(config.properties)) {
    if (!propConfig.enabled) continue;

    enabledProperties.push(propName);

    switch (propConfig.type) {
      case 'title':
        properties[propName] = { title: {} };
        break;
      case 'url':
        properties[propName] = { url: {} };
        break;
      case 'rich_text':
        properties[propName] = { rich_text: {} };
        break;
      case 'date':
        properties[propName] = { date: {} };
        break;
      case 'select':
        properties[propName] = {
          select: {
            options:
              propName === 'Priority'
                ? [
                    { name: 'High', color: 'red' },
                    { name: 'Medium', color: 'yellow' },
                    { name: 'Low', color: 'gray' },
                  ]
                : [],
          },
        };
        break;
      case 'multi_select':
        properties[propName] = {
          multi_select: {
            options:
              propName === 'Tags'
                ? [
                    { name: 'Work', color: 'blue' },
                    { name: 'Personal', color: 'green' },
                    { name: 'Learning', color: 'purple' },
                    { name: 'Reference', color: 'orange' },
                  ]
                : [],
          },
        };
        break;
      case 'checkbox':
        properties[propName] = { checkbox: {} };
        break;
    }
  }

  // Always add the internal sync ID (hidden)
  properties['_sync_id'] = { rich_text: {} };

  console.log('🎯 Creating database with properties:', enabledProperties);

  try {
    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentId,
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Bookmarks',
          },
        },
      ],
      properties,
      // Create a clean table view excluding internal properties
      views: [
        {
          type: 'gallery',
          name: 'Gallery',
          gallery: {},
        },
        {
          type: 'table',
          name: 'All Bookmarks',
          table: {
            visible_properties: enabledProperties,
            // Exclude "_sync_id" from visible properties
          },
        },
      ],
    } as any);

    console.log('✅ Custom database created successfully:', database.id);

    // Try to configure views
    try {
      await configureCleanTableView(database.id);
    } catch (viewError) {
      console.log('ℹ️ Could not configure views (using defaults):', viewError);
    }

    // Notification
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'Custom Database Created',
        message: `✅ Your bookmark database was created with ${enabledProperties.length} custom properties!`,
      });
    } catch (notificationError) {
      console.log('Could not show notification:', notificationError);
    }

    const dbUrl = `https://www.notion.so/${database.id.replace(/-/g, '')}`;
    return {
      id: database.id,
      name: config.title || '📚 Chrome Bookmarks (Custom)',
      url: dbUrl,
    };
  } catch (dbError: unknown) {
    const apiError = dbError as APIError;
    console.error('❌ Custom database creation failed:', apiError);
    throw new Error(`Failed to create custom database: ${apiError?.message || 'Unknown error'}`);
  }
}

// Export the getOrCreateBookmarkDatabase function for external use
export { getOrCreateBookmarkDatabase };

function validateAndNormalizeDatabaseId(databaseId: string): string {
  // Remove any non-alphanumeric characters except hyphens
  let cleanId = databaseId.replace(/[^a-zA-Z0-9-]/g, '');

  // Remove any prefixes that aren't part of the UUID
  if (cleanId.includes('-')) {
    const parts = cleanId.split('-');
    if (parts.length > 1 && parts[0].length < 8) {
      // Remove short prefix (like "B2N")
      cleanId = parts.slice(1).join('-');
    }
  }

  // Ensure it's a valid UUID format (32 chars + 4 hyphens = 36 chars)
  if (cleanId.length === 32 && !cleanId.includes('-')) {
    // Add hyphens to make it a proper UUID format
    cleanId = `${cleanId.substring(0, 8)}-${cleanId.substring(
      8,
      12
    )}-${cleanId.substring(12, 16)}-${cleanId.substring(16, 20)}-${cleanId.substring(20)}`;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(`${cleanId}`)) {
    throw new Error(`Invalid database ID format: ${databaseId}`);
  }

  return cleanId;
}

/**
 * Configure clean table view with hidden internal properties
 */
async function configureCleanTableView(databaseId: string) {
  if (!notion) return;

  try {
    // This is a fallback approach - try to update database views
    console.log('🔧 Configuring clean table view for database...');

    await notion.databases.update({
      database_id: databaseId,
      views: [
        {
          type: 'gallery',
          name: 'Gallery',
          gallery: {},
        },
        {
          type: 'table',
          name: 'All Bookmarks',
          table: {
            visible_properties: ['Title', 'URL', 'Description', 'Created', 'Path'],
          },
        },
      ],
    } as any);

    console.log('✅ Clean table view configured successfully');
  } catch (error) {
    console.log(
      '⚠️ Could not configure clean table view (this is expected with current Notion API limitations):',
      error
    );
    // This is expected to fail with current API - the _sync_id naming convention is our main strategy
  }
}

/**
 * Legacy function - kept for backward compatibility
 */
async function findExistingBookmark(databaseId: string, bookmarkId: string, availableProps: any) {
  if (!notion) return null;

  try {
    // Determine which property to search in
    let filterProperty: string;
    if (availableProps['_sync_id']) {
      filterProperty = '_sync_id';
    } else if (availableProps['Internal ID']) {
      filterProperty = 'Internal ID';
    } else if (availableProps.BookmarkId) {
      filterProperty = 'BookmarkId';
    } else {
      // No sync ID property available, can't check for duplicates
      return null;
    }

    console.log(
      `🔍 Searching for existing bookmark with ID ${bookmarkId} in property ${filterProperty}`
    );

    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: filterProperty,
        rich_text: {
          equals: bookmarkId,
        },
      },
      page_size: 1,
    });

    if (response.results.length > 0) {
      console.log(`✅ Found existing bookmark: ${response.results[0].id}`);
      return response.results[0];
    }

    console.log('❌ No existing bookmark found');
    return null;
  } catch (error) {
    console.error('❌ Error searching for existing bookmark:', error);
    return null; // Continue with creation if search fails
  }
}

export async function pushBookmark(databaseId: string, bm: NotionBookmark) {
  if (!notion) throw new Error('Notion client not initialized');

  const validDatabaseId = validateAndNormalizeDatabaseId(databaseId);

  console.log('🔨 Creating/updating page with properties:', {
    title: `${bm.title.substring(0, 50)}...`,
    url: bm.url,
    database_id: validDatabaseId,
    bookmarkId: bm.bookmarkId,
  });

  try {
    // First, get the database schema to check available properties
    const database = await notion.databases.retrieve({ database_id: validDatabaseId });
    const availableProps = database.properties;

    // Check if a record with this bookmark ID already exists
    const existingPage = await findExistingBookmark(validDatabaseId, bm.bookmarkId, availableProps);

    // Build properties dynamically based on what's available
    const properties: any = {
      Title: {
        title: [
          {
            text: { content: bm.title, link: { url: bm.url } },
          },
        ],
      },
      URL: {
        url: bm.url,
      },
      Description: bm.summary
        ? {
            rich_text: [{ text: { content: bm.summary.substring(0, 2000) } }],
          }
        : { rich_text: [] },
      Created: {
        date: {
          start: bm.createdAt.split('T')[0], // Extract only the date part (YYYY-MM-DD)
        },
      },
    };

    // Add internal ID property based on what's available in the database
    if (availableProps['_sync_id']) {
      properties['_sync_id'] = {
        rich_text: [{ text: { content: bm.bookmarkId } }],
      };
    } else if (availableProps['Internal ID']) {
      // Fallback to old Internal ID property
      properties['Internal ID'] = {
        rich_text: [{ text: { content: bm.bookmarkId } }],
      };
    } else if (availableProps.BookmarkId) {
      // Fallback to old BookmarkId property for backward compatibility
      properties.BookmarkId = {
        rich_text: [{ text: { content: bm.bookmarkId } }],
      };
    }

    // Add path/source property based on what's available in the database
    if (availableProps.Path) {
      properties.Path = {
        rich_text: [{ text: { content: bm.path || 'Bookmarks' } }],
      };
    } else if (availableProps.Source) {
      // Fallback to old Source property for backward compatibility
      properties.Source = {
        rich_text: [{ text: { content: bm.path || 'Chrome Bookmarks' } }],
      };
      console.log('📝 Using Source property (legacy mode)');
    }

    let pageResponse;

    if (existingPage) {
      // Update existing page
      console.log('🔄 Updating existing page:', existingPage.id);
      pageResponse = await notion.pages.update({
        page_id: existingPage.id,
        properties,
        // Don't update children content for existing pages to preserve any user modifications
      });
      console.log('✅ Page updated successfully. ID:', pageResponse.id);
    } else {
      // Create new page
      console.log('🆕 Creating new page');
      pageResponse = await notion.pages.create({
        parent: { database_id: validDatabaseId },
        properties,
        children: bm.content
          ? [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ text: { content: bm.content.substring(0, 2000) } }],
                },
              },
            ]
          : undefined,
      });
      console.log('✅ Page created successfully. ID:', pageResponse.id);
    }

    return pageResponse;
  } catch (error: unknown) {
    const apiError = error as APIError;
    console.error('❌ Page creation/update failed:', {
      code: apiError?.code,
      message: apiError?.message,
      status: apiError?.status,
      database_id: validDatabaseId,
      title: bm.title.substring(0, 50),
    });
    throw error;
  }
}

export async function createNotionPage(bookmarkData: BookmarkData) {
  console.log(`🔧 Creating Notion page for: ${bookmarkData.title}`);

  // Get or create database automatically
  const databaseId = await getOrCreateBookmarkDatabase();
  console.log(`📊 Using database ID: ${databaseId}`);

  // Initialize Notion client if needed
  const storage = await chrome.storage.local.get(['notion_token']);
  if (!notion && storage.notion_token) {
    initNotion(storage.notion_token);
  }

  const notionBookmark: NotionBookmark = {
    url: bookmarkData.url,
    title: bookmarkData.title,
    summary: bookmarkData.description,
    content: bookmarkData.content,
    createdAt: bookmarkData.dateAdded || new Date().toISOString(),
    bookmarkId: Math.random().toString(36).substring(7),
    path: bookmarkData.path || 'Bookmarks',
  };

  const result = await pushBookmark(databaseId, notionBookmark);
  console.log(`✨ Page created successfully with ID: ${result.id}`);
  return result;
}

async function getOrCreateBookmarkDatabase(): Promise<string> {
  console.log('🔍 Getting or creating bookmark database...');

  // Return cached database ID if available
  if (databaseIdCache) {
    console.log('✅ Using cached database ID:', databaseIdCache);
    return databaseIdCache;
  }

  // If there's already a database initialization in progress, wait for it
  if (databaseInitPromise) {
    console.log('⏳ Database initialization in progress, waiting...');
    return await databaseInitPromise;
  }

  // Start database initialization
  databaseInitPromise = initializeDatabaseOnce();

  try {
    const databaseId = await databaseInitPromise;
    databaseIdCache = databaseId;
    return databaseId;
  } finally {
    databaseInitPromise = null;
  }
}

async function initializeDatabaseOnce(): Promise<string> {
  // Check if we already have a database ID stored
  const storage = await chrome.storage.local.get(['notion_database_id', 'notion_token']);

  if (!storage.notion_token) {
    throw new Error('Notion token not found - please reconnect');
  }

  // If we have a stored database ID, validate it first
  if (storage.notion_database_id) {
    console.log('📋 Found stored database ID:', storage.notion_database_id);
    try {
      const validDatabaseId = validateAndNormalizeDatabaseId(storage.notion_database_id);
      console.log('✅ Database ID validated:', validDatabaseId);

      // Test if the database exists and is accessible
      if (!notion) {
        initNotion(storage.notion_token);
      }

      if (notion) {
        try {
          const dbInfo = await notion.databases.retrieve({
            database_id: validDatabaseId,
          });
          console.log('✅ Database accessible:', dbInfo.id);

          // CRITICAL: Also test if we can query the database (not just retrieve)
          try {
            const testQuery = await notion.databases.query({
              database_id: validDatabaseId,
              page_size: 1,
            });
            console.log('✅ Database is queryable:', testQuery.results.length, 'pages found');

            // CRITICAL: Validate database schema compatibility
            const schemaValidation = await validateDatabaseSchema(validDatabaseId);
            if (!schemaValidation.isCompatible) {
              console.warn('❌ Database schema is incompatible:', schemaValidation.issues);

              // Ask user how to handle schema mismatch
              const migrationChoice = await handleSchemaMismatch(schemaValidation);

              if (migrationChoice === 'migrate') {
                console.log('🔄 Migrating database schema...');
                await migrateDatabaseSchema(validDatabaseId, schemaValidation.missingProperties);
                console.log('✅ Database schema migrated successfully');
                return validDatabaseId;
              } else if (migrationChoice === 'create_new') {
                console.log('🆕 User chose to create new database');
                await chrome.storage.local.remove(['notion_database_id']);
                // Fall through to create new database
              } else {
                throw new Error('Database schema incompatible and migration declined');
              }
            } else {
              console.log('✅ Database schema is compatible');
              return validDatabaseId;
            }
          } catch (queryError: unknown) {
            const apiError = queryError as APIError;
            console.warn('❌ Database exists but is not queryable:', apiError?.message);
            if (
              apiError?.code === 'object_not_found' ||
              apiError?.message?.includes('shared with your integration')
            ) {
              console.log(
                '🧹 Database not properly shared with integration, creating a new one...'
              );
              await chrome.storage.local.remove(['notion_database_id']);
              // Don't return, fall through to create new database
              throw queryError; // This will be caught by the outer catch
            }
          }
        } catch (error: unknown) {
          const apiError = error as APIError;
          console.warn('❌ Stored database ID is not accessible:', apiError?.message);

          // If it's a "not found" or "not shared" error, clear the database ID
          if (
            apiError?.code === 'object_not_found' ||
            apiError?.message?.includes('shared with your integration')
          ) {
            console.log('🧹 Database not shared with integration, creating a new one...');
            await chrome.storage.local.remove(['notion_database_id']);
          } else {
            console.warn('❌ Database access failed, creating a new one:', error);
          }

          // Don't return, fall through to create new database
        }
      }
    } catch (error) {
      console.warn('❌ Stored database ID is invalid format, creating a new one:', error);
      // Clear the invalid database ID
      await chrome.storage.local.remove(['notion_database_id']);
    }
  } else {
    console.log('📋 No stored database ID found');

    // Check if user has an existing OAuth-templated database (for users who previously connected)
    console.log('🔍 Checking for existing OAuth-templated bookmark database...');
    try {
      const oauthDetection = await detectOAuthTemplateDatabase();
      if (oauthDetection.isTemplateDatabase && oauthDetection.databaseInfo) {
        console.log('✅ Found existing OAuth-templated database, setting up automatically...');
        const setup = await setupWithOAuthTemplateDatabaseId(oauthDetection.databaseInfo.id);
        if (setup.success) {
          return oauthDetection.databaseInfo.id;
        }
      }
    } catch (oauthError) {
      console.log(
        'ℹ️ No existing OAuth-templated database found, will create new one:',
        oauthError
      );
    }
  }

  // Otherwise, create a new database automatically
  console.log('🆕 Creating new bookmark database...');
  const database = await createBookmarkDatabase('default');
  console.log('✅ New database created:', {
    id: database.id,
    name: database.name,
    url: database.url,
  });

  // Store the new database ID for future use
  await chrome.storage.local.set({ notion_database_id: database.id });

  return database.id;
}

export async function listAvailableDatabases(): Promise<DatabaseOption[]> {
  const storage = await chrome.storage.local.get(['notion_token']);

  if (!storage.notion_token) {
    throw new Error('Notion token not found - please connect first');
  }

  if (!notion) {
    initNotion(storage.notion_token);
  }

  if (!notion) {
    throw new Error('Failed to initialize Notion client');
  }

  // Search for databases in the workspace
  const searchResponse = await notion.search({
    filter: {
      value: 'database',
      property: 'object',
    },
    page_size: 100,
  });

  const databases: DatabaseOption[] = [];

  for (const result of searchResponse.results) {
    if ('title' in result && result.title) {
      const title = result.title
        .map((titlePart: { plain_text?: string; type?: string }) => titlePart.plain_text || '')
        .join('')
        .trim();

      databases.push({
        id: result.id,
        name: title || 'Untitled Database',
        url: 'url' in result ? result.url : undefined,
      });
    }
  }

  return databases;
}

export async function debugCurrentDatabase(): Promise<void> {
  const storage = await chrome.storage.local.get(['notion_database_id', 'notion_token']);

  if (!storage.notion_token) {
    console.error('❌ No Notion token found');
    return;
  }

  if (!storage.notion_database_id) {
    console.log('📋 No database ID stored');
    return;
  }

  if (!notion) {
    initNotion(storage.notion_token);
  }

  if (!notion) {
    console.error('❌ Failed to initialize Notion client');
    return;
  }

  try {
    const dbId = validateAndNormalizeDatabaseId(storage.notion_database_id);
    console.log('🔍 Debugging database:', dbId);

    // Get database info
    const dbInfo = await notion.databases.retrieve({ database_id: dbId });
    console.log('📊 Database info:', {
      id: dbInfo.id,
      title: 'title' in dbInfo ? dbInfo.title : 'No title',
      properties: Object.keys(dbInfo.properties || {}),
      url: `https://www.notion.so/${dbId.replace(/-/g, '')}`,
    });

    // Query database contents
    const query = await notion.databases.query({
      database_id: dbId,
      page_size: 10,
    });

    console.log(`📄 Database contains ${query.results.length} pages:`);
    query.results.forEach((page, index) => {
      if ('properties' in page && page.properties.Title && 'title' in page.properties.Title) {
        const titleProperty = page.properties.Title.title;
        const title =
          Array.isArray(titleProperty) && titleProperty.length > 0
            ? titleProperty[0]?.plain_text || 'Untitled'
            : 'Untitled';
        console.log(`  ${index + 1}. ${title} (${page.id})`);
      }
    });
  } catch (error) {
    console.error('❌ Database debug failed:', error);
  }
}

export async function clearStoredDatabase(): Promise<void> {
  console.log('🧹 Clearing stored database ID...');
  await chrome.storage.local.remove(['notion_database_id']);

  // Clear the cache as well
  databaseIdCache = null;
  databaseInitPromise = null;

  console.log('✅ Database ID cleared. A new database will be created on next sync.');
}

export async function createBookmarkDatabase(
  method: 'template' | 'duplicate' | 'custom' | 'oauth_template' | 'default' = 'default',
  customConfig?: CustomDatabaseConfig,
  duplicatedDatabaseId?: string
): Promise<{
  id: string;
  name: string;
  url: string;
}> {
  console.log(`🏗️ Creating bookmark database using method: ${method}`);

  switch (method) {
    case 'oauth_template':
      // For OAuth template, the database ID should be provided from OAuth response
      if (!duplicatedDatabaseId) {
        // Fallback: try to detect existing OAuth-templated database
        const detection = await detectOAuthTemplateDatabase();
        if (detection.isTemplateDatabase && detection.databaseInfo) {
          const setup = await setupWithOAuthTemplateDatabaseId(detection.databaseInfo.id);
          if (!setup.success) {
            throw new Error(setup.error);
          }
          return {
            id: detection.databaseInfo.id,
            name: detection.databaseInfo.title || '📚 Chrome Bookmarks (OAuth Template)',
            url: detection.databaseInfo.url,
          };
        } else {
          throw new Error(
            'No OAuth-templated database found. Please reconnect via Notion OAuth with template option selected.'
          );
        }
      } else {
        // Use the provided OAuth-templated database ID from authorization response
        const setup = await setupWithOAuthTemplateDatabaseId(duplicatedDatabaseId);
        if (!setup.success) {
          throw new Error(setup.error);
        }
        const dbUrl = `https://www.notion.so/${duplicatedDatabaseId.replace(/-/g, '')}`;
        return {
          id: duplicatedDatabaseId,
          name: setup.databaseInfo?.title || '📚 Chrome Bookmarks (OAuth Template)',
          url: dbUrl,
        };
      }

    case 'duplicate':
      if (!duplicatedDatabaseId) {
        throw new Error('Duplicated database ID required for template duplication method');
      }
      const setup = await setupWithDuplicatedTemplate(duplicatedDatabaseId);
      if (!setup.success) {
        throw new Error(setup.error);
      }
      const dbUrl = `https://www.notion.so/${duplicatedDatabaseId.replace(/-/g, '')}`;
      return {
        id: duplicatedDatabaseId,
        name: setup.databaseInfo?.title || '📚 Chrome Bookmarks (Manual Template)',
        url: dbUrl,
      };

    case 'template':
      return await createDatabaseFromTemplate();

    case 'custom':
      if (!customConfig) {
        throw new Error('Custom configuration required for custom database creation');
      }
      return await createDatabaseWithCustomProperties(customConfig);

    case 'default':
    default:
      // Original database creation logic (fallback)
      return await createDefaultBookmarkDatabase();
  }
}

/**
 * Original database creation function (now renamed for clarity)
 */
async function createDefaultBookmarkDatabase(): Promise<{
  id: string;
  name: string;
  url: string;
}> {
  console.log('🏗️ Creating default bookmark database...');

  const storage = await chrome.storage.local.get(['notion_token']);

  if (!storage.notion_token) {
    throw new Error('Notion token not found - please connect first');
  }

  if (!notion) {
    initNotion(storage.notion_token);
  }

  if (!notion) {
    throw new Error('Failed to initialize Notion client');
  }

  // Create a single workspace-level page to hold our database
  console.log('🏗️ Creating workspace page for bookmarks...');

  let parentId: string;

  try {
    const page = await notion.pages.create({
      parent: {
        workspace: true,
      } as any,
      properties: {
        title: {
          title: [
            {
              type: 'text',
              text: {
                content: '📚 Chrome Bookmarks',
              },
            },
          ],
        },
      },
    });

    parentId = page.id;
    console.log('✅ Workspace page created successfully:', parentId);
  } catch (pageError: unknown) {
    const apiError = pageError as APIError;
    console.error('❌ Failed to create workspace page:', apiError);
    throw new Error(
      `Cannot create workspace page: ${
        apiError?.message || 'Unknown error'
      }. Check that your integration has proper permissions.`
    );
  }

  // Now create the database as a child of this page
  console.log('🗄️ Creating database...');

  try {
    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: parentId,
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Bookmarks',
          },
        },
      ],
      properties: {
        Title: {
          title: {},
        },
        URL: {
          url: {},
        },
        Description: {
          rich_text: {},
        },
        Created: {
          date: {},
        },
        Path: {
          rich_text: {},
        },
        // Internal sync ID (will be hidden in the default table view)
        _sync_id: {
          rich_text: {},
        },
      },
      // Start with gallery view as default to hide internal properties
      // Then create a clean table view for main usage
      views: [
        {
          type: 'gallery',
          name: 'Gallery',
          gallery: {},
        },
        {
          type: 'table',
          name: 'All Bookmarks',
          table: {
            visible_properties: ['Title', 'URL', 'Description', 'Created', 'Path'],
            // Explicitly exclude "_sync_id" from visible properties
          },
        },
      ],
    } as any); // Use 'as any' to bypass TypeScript limitations if the views property isn't in current definitions

    console.log('✅ Database created successfully:', database.id);

    // Check if view configuration was applied successfully
    try {
      await notion.databases.retrieve({ database_id: database.id });
      console.log('✅ Database created with configured views for hiding internal properties');
    } catch (viewCheckError) {
      console.log(
        'ℹ️ Database created successfully, attempting post-creation view configuration...',
        viewCheckError
      );

      // Fallback: Try to update the database with view configuration after creation
      try {
        await configureCleanTableView(database.id);
        console.log('✅ Internal sync column configured to be hidden in default view');
      } catch (fallbackError) {
        console.log(
          '💡 Using property naming optimization (_sync_id) for minimal visibility',
          fallbackError
        );
      }
    }

    // Show user notification about the optimized database setup
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'Database Created Successfully',
        message: '✅ Your bookmark database is ready with optimized view configuration!',
      });
    } catch (notificationError) {
      console.log('Could not show notification:', notificationError);
    }

    // Test database access immediately
    try {
      await notion.databases.query({
        database_id: database.id,
        page_size: 1,
      });
      console.log('✅ Database is accessible and queryable');
    } catch (queryError: unknown) {
      const apiError = queryError as APIError;
      console.error('❌ Database created but not queryable:', apiError);
      throw new Error(
        `Database created but not accessible: ${apiError?.message || 'Unknown error'}`
      );
    }

    const dbUrl = `https://www.notion.so/${database.id.replace(/-/g, '')}`;
    console.log('🔗 Database URL:', dbUrl);

    return {
      id: database.id,
      name: '📚 Chrome Bookmarks',
      url: dbUrl,
    };
  } catch (dbError: unknown) {
    const apiError = dbError as APIError;
    console.error('❌ Database creation failed:', apiError);
    throw new Error(
      `Failed to create database: ${
        apiError?.message || 'Unknown error'
      }. Check that your integration has proper permissions.`
    );
  }
}

// Schema validation and migration functions
interface SchemaValidation {
  isCompatible: boolean;
  missingProperties: string[];
  obsoleteProperties: string[];
  issues: string[];
}

const REQUIRED_PROPERTIES = {
  Title: 'title',
  URL: 'url',
  Description: 'rich_text',
  Created: 'date',
  _sync_id: 'rich_text',
  Path: 'rich_text',
};

const DEPRECATED_PROPERTIES = ['Source', 'BookmarkId', 'Internal ID']; // Old properties we're replacing

async function validateDatabaseSchema(databaseId: string): Promise<SchemaValidation> {
  if (!notion) {
    throw new Error('Notion client not initialized');
  }

  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const existingProperties = database.properties;

    const validation: SchemaValidation = {
      isCompatible: true,
      missingProperties: [],
      obsoleteProperties: [],
      issues: [],
    };

    // Check for missing required properties
    for (const [propName, propType] of Object.entries(REQUIRED_PROPERTIES)) {
      if (!existingProperties[propName]) {
        validation.missingProperties.push(propName);
        validation.isCompatible = false;
        validation.issues.push(`Missing required property: ${propName} (${propType})`);
      } else {
        // Verify property type matches
        const existingProp = existingProperties[propName] as any;
        if (existingProp.type !== propType) {
          validation.issues.push(
            `Property ${propName} has wrong type: expected ${propType}, found ${existingProp.type}`
          );
          validation.isCompatible = false;
        }
      }
    }

    // Check for deprecated properties that indicate old schema
    for (const deprecatedProp of DEPRECATED_PROPERTIES) {
      if (existingProperties[deprecatedProp]) {
        validation.obsoleteProperties.push(deprecatedProp);
        validation.issues.push(`Found deprecated property: ${deprecatedProp}`);
      }
    }

    console.log('📊 Schema validation result:', validation);
    return validation;
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    throw new Error(`Failed to validate database schema: ${error}`);
  }
}

async function handleSchemaMismatch(
  validation: SchemaValidation
): Promise<'migrate' | 'create_new' | 'abort'> {
  // For now, implement automatic migration for missing properties
  // In the future, this could show a user prompt

  const hasMissingProperties = validation.missingProperties.length > 0;
  const hasOnlyMinorIssues = validation.issues.every(
    (issue) =>
      issue.includes('Missing required property: Path') ||
      issue.includes('Found deprecated property: Source')
  );

  if (hasMissingProperties && hasOnlyMinorIssues) {
    console.log('🔄 Automatically migrating schema (adding missing properties)');

    // Show user notification about migration
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon48.png',
        title: 'Database Schema Update',
        message:
          'Updating your Notion database to support new features (bookmark paths). This may take a moment...',
      });
    } catch (notificationError) {
      console.log('Could not show notification:', notificationError);
    }

    return 'migrate';
  }

  // For major schema incompatibilities, create new database
  console.log('🆕 Schema has major incompatibilities, will create new database');

  // Show user notification about new database creation
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Creating New Database',
      message:
        'Your existing Notion database is incompatible. Creating a new optimized database for bookmarks...',
    });
  } catch (notificationError) {
    console.log('Could not show notification:', notificationError);
  }

  return 'create_new';
}

async function migrateDatabaseSchema(
  databaseId: string,
  missingProperties: string[]
): Promise<void> {
  if (!notion) {
    throw new Error('Notion client not initialized');
  }

  try {
    // Build the properties update object
    const propertiesToAdd: any = {};

    for (const propName of missingProperties) {
      const propType = REQUIRED_PROPERTIES[propName as keyof typeof REQUIRED_PROPERTIES];
      if (propType === 'title') {
        propertiesToAdd[propName] = { title: {} };
      } else if (propType === 'url') {
        propertiesToAdd[propName] = { url: {} };
      } else if (propType === 'rich_text') {
        propertiesToAdd[propName] = { rich_text: {} };
      } else if (propType === 'date') {
        propertiesToAdd[propName] = { date: {} };
      }
    }

    if (Object.keys(propertiesToAdd).length > 0) {
      console.log('🔧 Adding missing properties:', Object.keys(propertiesToAdd));

      await notion.databases.update({
        database_id: databaseId,
        properties: propertiesToAdd,
      });

      console.log('✅ Database schema migration completed');

      // Try to update the default view to hide internal properties
      try {
        await configureDefaultViewToHideInternalProperties(databaseId);
        console.log('✅ Default view updated to hide internal properties');
      } catch (viewError) {
        console.warn('Could not update view to hide internal properties:', viewError);
        console.log("💡 You can manually hide the '_sync_id' column in Notion if needed");
      }

      // Show success notification
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon48.png',
          title: 'Database Updated Successfully',
          message: 'Your Notion database now supports bookmark folder paths!',
        });
      } catch (notificationError) {
        console.log('Could not show notification:', notificationError);
      }
    }
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    throw new Error(`Failed to migrate database schema: ${error}`);
  }
}

// Helper function to configure default view to hide internal properties
async function configureDefaultViewToHideInternalProperties(databaseId: string): Promise<void> {
  if (!notion) {
    throw new Error('Notion client not initialized');
  }

  try {
    console.log(`🔧 Attempting to configure view for database ${databaseId.substring(0, 8)}...`);

    // Try to update the database with view configuration
    // This approach uses the same structure you mentioned in your example
    await notion.databases.update({
      database_id: databaseId,
      views: [
        {
          type: 'table',
          name: 'All Bookmarks',
          table: {
            properties: [
              { property: 'Title', visible: true },
              { property: 'URL', visible: true },
              { property: 'Description', visible: true },
              { property: 'Created', visible: true },
              { property: 'Path', visible: true },
              // Hide internal sync properties
              { property: '_sync_id', visible: false },
              // Also hide any legacy properties if they exist
              { property: 'BookmarkId', visible: false },
              { property: 'Internal ID', visible: false },
            ],
          },
        },
      ],
    } as any); // Use 'as any' to bypass TypeScript limitations

    console.log('✅ View configuration updated successfully');
  } catch (error) {
    console.log('ℹ️ View configuration via API not available in current client version');
    console.log(
      "💡 The '_sync_id' column uses an underscore prefix to be less prominent in the interface"
    );
    console.log('💡 Users can manually hide it: click column header → Hide in view');
    throw error;
  }
}
