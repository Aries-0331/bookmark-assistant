import { extractPageContent } from "../lib/content-extractor";
import { createNotionPage, getOrCreateBookmarkDatabase, initNotion } from "../lib/notion";

export interface BookmarkItem {
	id: string;
	title: string;
	url?: string;
	parentId?: string;
	children?: BookmarkItem[];
	dateAdded?: number;
	dateGroupModified?: number;
	path?: string;
}

export function buildBookmarkPath(
	bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
	targetId: string,
): string {
	// Find the full path to a bookmark by its ID
	function findBookmarkPath(nodes: chrome.bookmarks.BookmarkTreeNode[], targetId: string, currentPath: string[] = []): string[] | null {
		for (const node of nodes) {
			// If this is the target bookmark, return the current path (excluding the bookmark itself)
			if (node.id === targetId) {
				return currentPath;
			}
			
			// If this node has children, search recursively
			if (node.children) {
				const nodePath = node.title ? [...currentPath, node.title] : currentPath;
				const result = findBookmarkPath(node.children, targetId, nodePath);
				if (result !== null) {
					return result;
				}
			}
		}
		return null;
	}

	const path = findBookmarkPath(bookmarkTree, targetId);
	if (!path) {
		return "Bookmarks";
	}

	// Filter out empty titles and the root "Bookmarks" container
	const filteredPath = path.filter(part => part && part.trim() !== "");

	return filteredPath.length > 0 ? filteredPath.join(" / ") : "Bookmarks";
}

function addPathsToBookmarks(
	bookmarks: BookmarkItem[],
	bookmarkTree: chrome.bookmarks.BookmarkTreeNode[],
): BookmarkItem[] {
	return bookmarks.map(bookmark => ({
		...bookmark,
		path: buildBookmarkPath(bookmarkTree, bookmark.id),
	}));
}

export async function syncAllBookmarksToNotion() {
	console.log("🔖 Starting bulk bookmark sync to Notion...");

	try {
		// Initialize Notion client and database once at the beginning
		const storage = await chrome.storage.local.get(['notion_token']);
		if (!storage.notion_token) {
			throw new Error('Notion not connected - please connect first');
		}
		
		initNotion(storage.notion_token);
		
		// Pre-initialize the database (this will cache it for all subsequent calls)
		console.log('🔄 Initializing database connection...');
		await getOrCreateBookmarkDatabase();
		console.log('✅ Database ready for bulk sync');

		// Get all bookmarks from Chrome
		const bookmarkTree = await chrome.bookmarks.getTree();
		console.log("📚 Retrieved bookmark tree from Chrome");

		// Flatten bookmark tree and filter URLs only
		const flatBookmarks = flattenBookmarks(bookmarkTree).filter(
			(bookmark) => bookmark.url,
		);
		
		// Add paths to bookmarks for better organization in Notion
		const bookmarks = addPathsToBookmarks(flatBookmarks, bookmarkTree);
		console.log(`📊 Found ${bookmarks.length} bookmarks to sync`);

		if (bookmarks.length === 0) {
			throw new Error("No bookmarks found to sync");
		}

		// Process bookmarks in batches to avoid overwhelming the APIs
		const batchSize = 5; // Process 5 bookmarks at a time
		const results = {
			total: bookmarks.length,
			processed: 0,
			successful: 0,
			failed: 0,
			errors: [] as string[],
		};

		for (let i = 0; i < bookmarks.length; i += batchSize) {
			const batch = bookmarks.slice(i, i + batchSize);
			console.log(
				`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
					bookmarks.length / batchSize,
				)}`,
			);

			const batchPromises = batch.map(async (bookmark) => {
				try {
					if (!bookmark.url) {
						throw new Error("Bookmark URL is missing");
					}
					
					await processBookmarkForNotion(
						bookmark.id,
						bookmark.url,
						bookmark.title,
						bookmark.path || "Bookmarks",
					);
					results.successful++;
				} catch (error) {
					results.failed++;
					const errorMsg = `Failed to sync "${bookmark.title}": ${
						error instanceof Error ? error.message : "Unknown error"
					}`;
					results.errors.push(errorMsg);
					console.warn(`⚠️ ${errorMsg}`);
				}
				results.processed++;
			});

			await Promise.all(batchPromises);

			// Small delay between batches to be respectful to APIs
			if (i + batchSize < bookmarks.length) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		console.log("🎉 Bulk bookmark sync completed:", results);

		// Store sync results
		await chrome.storage.local.set({
			last_bulk_sync: new Date().toISOString(),
			last_sync_results: results,
		});

		if (results.failed > 0) {
			throw new Error(
				`Sync completed with ${results.failed} failures out of ${results.total} bookmarks`,
			);
		}

		return results;
	} catch (error) {
		console.error("❌ Bulk bookmark sync failed:", error);
		throw error;
	}
}

function flattenBookmarks(
	bookmarkNodes: chrome.bookmarks.BookmarkTreeNode[],
): BookmarkItem[] {
	const flattened: BookmarkItem[] = [];

	function traverse(
		nodes: chrome.bookmarks.BookmarkTreeNode[],
		parentPath = "",
	) {
		for (const node of nodes) {
			const currentPath = parentPath
				? `${parentPath} > ${node.title}`
				: node.title;

			if (node.url) {
				// This is a bookmark (leaf node)
				flattened.push({
					id: node.id,
					title: node.title,
					url: node.url,
					parentId: node.parentId,
					dateAdded: node.dateAdded,
					dateGroupModified: node.dateGroupModified,
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

export async function processBookmarkForNotion(
	_bookmarkId: string,
	url: string,
	title: string,
	path: string,
) {
	console.log(`🔖 ${title}`);

	try {
		// Validate URL before processing
		if (!url || !isValidUrl(url)) {
			throw new Error(`Invalid URL: ${url}`);
		}

		// Extract content from the page with timeout
		const content = await Promise.race([
			extractPageContent(url),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Content extraction timeout")),
					15000,
				),
			),
		]);

		// Create the bookmark in Notion with basic information
		const notionResponse = await createNotionPage({
			title: title || content.title || url,
			url: url,
			description:
				content.description || `Bookmarked from ${new URL(url).hostname}`,
			content: content.text,
			keywords: content.keywords,
			dateAdded: new Date().toISOString(),
			path: path,
		});

		// Log the actual Notion API response for debugging
		console.log("✅ Notion Response:", {
			id: notionResponse.id,
			object: notionResponse.object,
			title: title,
		});
	} catch (error) {
		console.error(`❌ Failed "${title}":`, error);
		throw error;
	}
}

function isValidUrl(url: string): boolean {
	try {
		const urlObj = new URL(url);
		return ["http:", "https:"].includes(urlObj.protocol);
	} catch {
		return false;
	}
}
