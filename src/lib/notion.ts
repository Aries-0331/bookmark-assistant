import { Client } from '@notionhq/client';
import { makeRequest } from './request-helper';

export interface NotionBookmark {
  url: string;
  title: string;
  summary?: string;
  content?: string;
  createdAt: string;
  bookmarkId: string;
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
  source?: string;
}

let notion: Client | null = null;

export function initNotion(authToken: string) {
  notion = new Client({
    auth: authToken,
    fetch: makeRequest
  });
}

export async function pushBookmark(databaseId: string, bm: NotionBookmark) {
  if (!notion) throw new Error("Notion client not initialized");
  
  return await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Title: {
        title: [{ text: { content: bm.title } }]
      },
      URL: {
        url: bm.url
      },
      Description: bm.summary ? {
        rich_text: [{ text: { content: bm.summary.substring(0, 2000) } }]
      } : { rich_text: [] },
      Created: {
        date: { start: bm.createdAt }
      },
      BookmarkId: {
        rich_text: [{ text: { content: bm.bookmarkId } }]
      },
      Source: {
        rich_text: [{ text: { content: "Chrome Bookmarks" } }]
      }
    },
    children: bm.content ? [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: bm.content.substring(0, 2000) } }]
        }
      }
    ] : undefined
  });
}

export async function createNotionPage(bookmarkData: BookmarkData) {
  // Get or create database automatically
  let databaseId = await getOrCreateBookmarkDatabase();
  
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
    bookmarkId: Math.random().toString(36).substring(7)
  };
  
  return await pushBookmark(databaseId, notionBookmark);
}

async function getOrCreateBookmarkDatabase(): Promise<string> {
  // Check if we already have a database ID stored
  const storage = await chrome.storage.local.get(['notion_database_id', 'notion_token']);
  
  if (!storage.notion_token) {
    throw new Error('Notion token not found - please reconnect');
  }
  
  // If we have a stored database ID, return it
  if (storage.notion_database_id) {
    return storage.notion_database_id;
  }
  
  // Otherwise, create a new database automatically
  const database = await createBookmarkDatabase();
  
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
      value: "database",
      property: "object"
    },
    page_size: 100
  });
  
  const databases: DatabaseOption[] = [];
  
  for (const result of searchResponse.results) {
    if ('title' in result && result.title) {
      const title = result.title
        .map((t: any) => t.plain_text || '')
        .join('')
        .trim();
      
      databases.push({
        id: result.id,
        name: title || 'Untitled Database',
        url: 'url' in result ? result.url : undefined
      });
    }
  }
  
  return databases;
}

async function getWorkspaceRootPageId(): Promise<string> {
  if (!notion) throw new Error("Notion client not initialized");
  
  // Search for pages to find a suitable parent page
  const searchResponse = await notion.search({
    filter: {
      value: "page",
      property: "object"
    },
    page_size: 1
  });
  
  if (searchResponse.results.length > 0) {
    const page = searchResponse.results[0];
    if ('id' in page) {
      return page.id;
    }
  }
  
  // If no pages found, create a new page in the workspace
  const newPage = await notion.pages.create({
    parent: {
      type: "workspace",
      workspace: true
    },
    properties: {
      title: {
        title: [
          {
            type: "text",
            text: {
              content: "📖 Bookmark Collections"
            }
          }
        ]
      }
    }
  });
  
  return newPage.id;
}

export async function createBookmarkDatabase(parentPageId?: string): Promise<{ id: string; name: string; url: string }> {
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
  
  const parent = parentPageId 
    ? { type: "page_id", page_id: parentPageId }
    : { type: "page_id", page_id: await getWorkspaceRootPageId() };
  
  // Create a new database with the proper structure
  const database = await notion.databases.create({
    parent: parent as any,
    title: [
      {
        type: "text",
        text: {
          content: "📚 Chrome Bookmarks"
        }
      }
    ],
    properties: {
      Title: {
        title: {}
      },
      URL: {
        url: {}
      },
      Description: {
        rich_text: {}
      },
      Created: {
        date: {}
      },
      BookmarkId: {
        rich_text: {}
      },
      Source: {
        rich_text: {}
      }
    }
  });
  
  return {
    id: database.id,
    name: "📚 Chrome Bookmarks",
    url: `https://notion.so/${database.id.replace(/-/g, '')}`
  };
}
