import { extractPageContent } from "../lib/content-extractor";
import { createNotionPage, initNotion } from "../lib/notion";

export async function processBookmarkForNotion(url: string, title: string, path: string = "Bookmarks") {
	try {
		// Get stored token
		const result = await chrome.storage.local.get(["notion_token"]);
		if (!result.notion_token) {
			throw new Error("Notion not connected");
		}

		initNotion(result.notion_token);

		// Extract page content
		const content = await extractPageContent(url);

		// Extract AI features (simplified without OpenAI)
		const summary = `${content.text.substring(0, 500)}${
			content.text.length > 500 ? "..." : ""
		}`;

		// Use createNotionPage which handles database validation
		await createNotionPage({
			title,
			url,
			description: summary,
			content: content.text.substring(0, 2000), // Limit content length
			dateAdded: new Date().toISOString(),
			path: path,
		});
	} catch (error) {
		console.error("Failed to process bookmark:", error);
		// Show notification to user
		chrome.notifications.create({
			type: "basic",
			iconUrl: "/icons/icon48.png",
			title: "Bookmark Sync Failed",
			message: `Failed to sync "${title}" to Notion`,
		});
	}
}
