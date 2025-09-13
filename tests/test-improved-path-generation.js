// Test the improved path generation with deep nesting and internationalization
function buildBookmarkPath(bookmarkTree, targetId) {
	// Find the full path to a bookmark by its ID
	function findBookmarkPath(nodes, targetId, currentPath = []) {
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

	// Filter out empty titles and normalize localized bookmark folder names
	const filteredPath = path.filter(part => part && part.trim() !== "");

	return filteredPath.length > 0 ? filteredPath.join(" / ") : "Bookmarks";
}

// Test with a complex bookmark tree including Chinese localization and deep nesting
const complexBookmarkTree = [
	{
		id: "0",
		title: "",
		children: [
			{
				id: "1",
				title: "书签栏", // Chinese for "Bookmarks bar"
				children: [
					{
						id: "2",
						title: "Development",
						children: [
							{
								id: "3",
								title: "Frontend",
								children: [
									{
										id: "4",
										title: "React",
										children: [
											{
												id: "5",
												title: "React Docs",
												url: "https://react.dev"
											}
										]
									}
								]
							},
							{
								id: "6",
								title: "Backend",
								children: [
									{
										id: "7",
										title: "Node.js Guide",
										url: "https://nodejs.org"
									}
								]
							}
						]
					},
					{
						id: "8",
						title: "Google",
						url: "https://google.com"
					}
				]
			},
			{
				id: "9",
				title: "其他书签", // Chinese for "Other bookmarks"
				children: [
					{
						id: "10",
						title: "Personal",
						children: [
							{
								id: "11",
								title: "GitHub",
								url: "https://github.com"
							}
						]
					}
				]
			}
		]
	}
];

// Test various scenarios
console.log("Testing improved path generation:");
console.log("React Docs (deep nested):", buildBookmarkPath(complexBookmarkTree, "5"));
console.log("Node.js Guide (nested):", buildBookmarkPath(complexBookmarkTree, "7"));
console.log("Google (root level):", buildBookmarkPath(complexBookmarkTree, "8"));
console.log("GitHub (other bookmarks):", buildBookmarkPath(complexBookmarkTree, "11"));
console.log("Non-existent bookmark:", buildBookmarkPath(complexBookmarkTree, "999"));

// Test the folder paths themselves
console.log("\nTesting folder paths:");
console.log("Development folder:", buildBookmarkPath(complexBookmarkTree, "2"));
console.log("Frontend folder:", buildBookmarkPath(complexBookmarkTree, "3"));
console.log("React folder:", buildBookmarkPath(complexBookmarkTree, "4"));
console.log("Personal folder:", buildBookmarkPath(complexBookmarkTree, "10"));
