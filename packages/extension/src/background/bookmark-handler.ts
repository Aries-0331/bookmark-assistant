import { extractPageContent } from '../lib/content-extractor';
import { serverAPI } from '../lib/server-api';
// import { createNotionPage, initNotion } from "../lib/notion"; // REMOVED: Using server API instead

export async function processBookmarkForNotion(
  url: string,
  title: string,
  path: string = 'Bookmarks'
) {
  try {
    // Extract page content
    const content = await extractPageContent(url);

    // Extract AI features (simplified without OpenAI)
    const summary = `${content.text.substring(0, 500)}${content.text.length > 500 ? '...' : ''}`;

    // Create bookmark data for server
    const bookmarkData = {
      title,
      url,
      description: summary,
      path: path,
      dateAdded: new Date().toISOString(),
      syncId: `bookmark_${url}_${Date.now()}`,
    };

    // Use server API instead of direct Notion calls
    await serverAPI.upsertBookmarks([bookmarkData]);

    console.log('✅ Bookmark synced to Notion via server:', title);
  } catch (error) {
    console.error('Failed to process bookmark:', error);
    // Show notification to user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Bookmark Sync Failed',
      message: `Failed to sync "${title}" to Notion`,
    });
  }
}
