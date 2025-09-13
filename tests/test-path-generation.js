function buildBookmarkPath(bookmarkTree, targetId, currentPath = []) {
	for (const node of bookmarkTree) {
		const newPath = node.title ? [...currentPath, node.title] : currentPath;
		
		// If this node contains the target as a direct child
		if (node.children) {
			const hasTargetChild = node.children.some(child => child.id === targetId);
			if (hasTargetChild) {
				// Filter out empty titles and join
				const pathParts = newPath.filter(part => part !== "");
				const result = pathParts.length > 0 ? pathParts.join(" / ") : "Bookmarks";
				console.log(`buildBookmarkPath: Found ${targetId} in ${node.id}, returning: "${result}"`);
				return result;
			}
			
			// Recursively search in children
			const result = buildBookmarkPath(node.children, targetId, newPath);
			if (result !== "Bookmarks") { // Only return if we found something other than default
				console.log(`buildBookmarkPath: Recursive result for ${targetId}: "${result}"`);
				return result;
			}
		}
	}
	console.log(`buildBookmarkPath: No path found for ${targetId}, returning default`);
	return "Bookmarks";
}

// Better approach - find the path to the parent of a bookmark
function findBookmarkParentPath(bookmarkTree, targetId, currentPath = []) {
	for (const node of bookmarkTree) {
		const newPath = node.title ? [...currentPath, node.title] : currentPath;
		
		// If this node contains the target as a direct child
		if (node.children) {
			const hasTargetChild = node.children.some(child => child.id === targetId);
			if (hasTargetChild) {
				// Filter out empty root titles and join
				const pathParts = newPath.filter(part => part !== "");
				return pathParts.length > 0 ? pathParts.join(" / ") : "Bookmarks";
			}
			
			// Recursively search in children
			const result = findBookmarkParentPath(node.children, targetId, newPath);
			if (result !== "Bookmarks") { // Only return if we found something other than default
				return result;
			}
		}
	}
	return "Bookmarks";
}

// Test with a mock bookmark tree structure
const mockBookmarkTree = [
	{
		id: "0",
		title: "",
		children: [
			{
				id: "1",
				title: "Bookmarks bar",
				children: [
					{
						id: "2",
						title: "Development",
						children: [
							{
								id: "3",
								title: "React Docs",
								url: "https://react.dev"
							}
						]
					},
					{
						id: "4",
						title: "Google",
						url: "https://google.com"
					}
				]
			},
			{
				id: "5",
				title: "Other bookmarks",
				children: [
					{
						id: "6",
						title: "GitHub",
						url: "https://github.com"
					}
				]
			}
		]
	}
];

// Test both functions
console.log("Testing buildBookmarkPath (updated):");
console.log("React Docs:", buildBookmarkPath(mockBookmarkTree, "3")); // Should be "Bookmarks bar / Development"
console.log("Google:", buildBookmarkPath(mockBookmarkTree, "4")); // Should be "Bookmarks bar"  
console.log("GitHub:", buildBookmarkPath(mockBookmarkTree, "6")); // Should be "Other bookmarks"

console.log("\nTesting findBookmarkParentPath:");
console.log("React Docs (nested):", findBookmarkParentPath(mockBookmarkTree, "3")); // Should be "Bookmarks bar / Development"
console.log("Google (root level):", findBookmarkParentPath(mockBookmarkTree, "4")); // Should be "Bookmarks bar"
console.log("GitHub (other bookmarks):", findBookmarkParentPath(mockBookmarkTree, "6")); // Should be "Other bookmarks"

// Debug the structure
console.log("\nDebugging GitHub path:");
function debugPath(tree, target, path = []) {
	for (const node of tree) {
		const newPath = node.title ? [...path, node.title] : path;
		console.log(`Checking node ${node.id} (${node.title || 'no title'}) with path:`, newPath);
		
		if (node.children) {
			const hasTarget = node.children.some(child => child.id === target);
			console.log(`  Has child ${target}:`, hasTarget);
			if (hasTarget) {
				console.log(`  Found target ${target} in children of ${node.id}`);
				const pathParts = newPath.filter(part => part !== "");
				const result = pathParts.length > 0 ? pathParts.join(" / ") : "Bookmarks";
				console.log(`  Returning path: "${result}"`);
				return result;
			}
			debugPath(node.children, target, newPath);
		}
	}
}
debugPath(mockBookmarkTree, "6");
