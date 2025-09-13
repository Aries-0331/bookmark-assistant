// Content script that runs on all pages
// This script helps extract page content when bookmarks are created

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === "EXTRACT_PAGE_CONTENT") {
		try {
			const content = extractPageContent();
			sendResponse({ success: true, content });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			sendResponse({ success: false, error: errorMessage });
		}
		return true; // Will respond asynchronously
	}
});

function extractPageContent() {
	const title = document.title;
	const description = document
		.querySelector('meta[name="description"]')
		?.getAttribute("content");
	const keywords = document
		.querySelector('meta[name="keywords"]')
		?.getAttribute("content")
		?.split(",");

	// Try to extract main content using common content selectors
	const contentSelectors = [
		"main",
		"article",
		'[role="main"]',
		".content",
		".post-content",
		".entry-content",
		"#content",
		".main-content",
	];

	let mainContent = "";
	for (const selector of contentSelectors) {
		const element = document.querySelector(selector);
		if (element) {
			mainContent =
				(element as HTMLElement).innerText || element.textContent || "";
			break;
		}
	}

	// Fallback to body content if no main content found
	if (!mainContent) {
		mainContent = document.body.innerText || document.body.textContent || "";
	}

	// Clean up the content
	mainContent = mainContent
		.replace(/\s+/g, " ") // Replace multiple whitespace with single space
		.replace(/\n\s*\n/g, "\n") // Remove empty lines
		.trim()
		.substring(0, 5000); // Limit content length

	return {
		text: mainContent,
		title,
		description,
		keywords: keywords?.map((k) => k.trim()).filter(Boolean),
		url: window.location.href,
		extractedAt: new Date().toISOString(),
	};
}

// Auto-extract content when page loads (for newly bookmarked pages)
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		// Page is loaded, content can be extracted if needed
	});
} else {
	// Page is already loaded
}
