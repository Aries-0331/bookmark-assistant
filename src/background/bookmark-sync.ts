import { extractPageContent } from '../lib/content-extractor';
import { createNotionPage } from '../lib/notion';

export interface BookmarkItem {
  id: string;
  title: string;
  url?: string;
  parentId?: string;
  children?: BookmarkItem[];
  dateAdded?: number;
  dateGroupModified?: number;
}

export async function syncAllBookmarksToNotion() {
  console.log('🔖 Starting bulk bookmark sync to Notion...');
  
  try {
    // Get all bookmarks from Chrome
    const bookmarkTree = await chrome.bookmarks.getTree();
    console.log('📚 Retrieved bookmark tree from Chrome');
    
    // Flatten bookmark tree and filter URLs only
    const bookmarks = flattenBookmarks(bookmarkTree).filter(bookmark => bookmark.url);
    console.log(`📊 Found ${bookmarks.length} bookmarks to sync`);
    
    if (bookmarks.length === 0) {
      throw new Error('No bookmarks found to sync');
    }
    
    // Process bookmarks in batches to avoid overwhelming the APIs
    const batchSize = 5; // Process 5 bookmarks at a time
    const results = {
      total: bookmarks.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (let i = 0; i < bookmarks.length; i += batchSize) {
      const batch = bookmarks.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bookmarks.length / batchSize)}`);
      
      const batchPromises = batch.map(async (bookmark) => {
        try {
          await processBookmarkForNotion(bookmark.id, bookmark.url!, bookmark.title);
          results.successful++;
          console.log(`✅ Synced: ${bookmark.title}`);
        } catch (error) {
          results.failed++;
          const errorMsg = `Failed to sync "${bookmark.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.warn(`⚠️ ${errorMsg}`);
        }
        results.processed++;
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to APIs
      if (i + batchSize < bookmarks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('🎉 Bulk bookmark sync completed:', results);
    
    // Store sync results
    await chrome.storage.local.set({
      last_bulk_sync: new Date().toISOString(),
      last_sync_results: results
    });
    
    if (results.failed > 0) {
      throw new Error(`Sync completed with ${results.failed} failures out of ${results.total} bookmarks`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Bulk bookmark sync failed:', error);
    throw error;
  }
}

function flattenBookmarks(bookmarkNodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkItem[] {
  const flattened: BookmarkItem[] = [];
  
  function traverse(nodes: chrome.bookmarks.BookmarkTreeNode[], parentPath = '') {
    for (const node of nodes) {
      const currentPath = parentPath ? `${parentPath} > ${node.title}` : node.title;
      
      if (node.url) {
        // This is a bookmark (leaf node)
        flattened.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId,
          dateAdded: node.dateAdded,
          dateGroupModified: node.dateGroupModified
        });
      } else if (node.children) {
        // This is a folder, traverse its children
        traverse(node.children, currentPath);
      }
    }
  }
  
  traverse(bookmarkNodes);
  return flattened;
}

export async function processBookmarkForNotion(_bookmarkId: string, url: string, title: string) {
  console.log(`🔖 Processing bookmark: ${title}`);
  
  try {
    // Validate URL before processing
    if (!url || !isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Extract content from the page with timeout
    const content = await Promise.race([
      extractPageContent(url),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Content extraction timeout')), 15000)
      )
    ]);
    
    // Simple bookmark data without AI features
    console.log(`📝 Creating basic bookmark entry for: ${title}`);
    
    // Create the bookmark in Notion with basic information
    await createNotionPage({
      title: title || content.title || url,
      url: url,
      description: content.description || `Bookmarked from ${new URL(url).hostname}`,
      content: content.text,
      keywords: content.keywords,
      dateAdded: new Date().toISOString(),
      source: 'Chrome Bookmarks'
    });
    
    console.log(`✅ Successfully synced bookmark: ${title}`);
    
  } catch (error) {
    console.error(`❌ Failed to process bookmark "${title}":`, error);
    throw error;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
