import { extractPageContent } from '../lib/content-extractor';
import { pushBookmark, initNotion } from '../lib/notion';

export async function processBookmarkForNotion(
  bookmarkId: string, 
  url: string, 
  title: string
) {
  try {
    // Get stored token
    const result = await chrome.storage.local.get(['notion_token', 'notion_database_id']);
    if (!result.notion_token) {
      throw new Error('Notion not connected');
    }

    initNotion(result.notion_token);

    // Extract page content
    const content = await extractPageContent(url);
    
        // Extract AI features (simplified without OpenAI)
    const summary = content.text.substring(0, 500) + (content.text.length > 500 ? '...' : '');

    // Push to Notion
    await pushBookmark(result.notion_database_id, {
      url,
      title,
      summary,
      content: content.text.substring(0, 2000), // Limit content length
      createdAt: new Date().toISOString(),
      bookmarkId
    });

  } catch (error) {
    console.error('Failed to process bookmark:', error);
    // Show notification to user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon48.png',
      title: 'Bookmark Sync Failed',
      message: `Failed to sync "${title}" to Notion`
    });
  }
}
