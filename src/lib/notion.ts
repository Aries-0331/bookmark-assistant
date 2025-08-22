import { Client } from '@notionhq/client';

export interface NotionBookmark {
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

let notion: Client | null = null;

export function initNotion(authToken: string) {
  notion = new Client({auth: authToken});
}

export async function createDatabase(parentPageId: string) {
  if (!notion) throw new Error("Notion client not initialized");
  const response = await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [{ type: "text", text: { content: "Bookmarks" } }],
    properties: {
      Title: { title: {} },
      URL: { url: {} },
      Tags: { multi_select: {} },
      Created: { date: {} },
    },
  });
  return response;
}

export async function pushBookmark(databaseId: string, bm: NotionBookmark) {
  if (!notion) throw new Error("Notion client not initialized");
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Title: { title: [{ text: { content: bm.title } }] },
      URL: { url: bm.url },
      Tags: { multi_select: bm.tags.map(tag => ({ name: tag })) },
      Created: { date: { start: bm.createdAt } },
    },
  });
}
