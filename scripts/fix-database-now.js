// Clear any existing database ID and test the new automatic creation
// Run this in the extension console to reset and test

(async function resetAndTest() {
  console.log('� Resetting extension for fresh database creation...');
  
  try {
    // Clear any stored database ID
    await chrome.storage.local.remove(['notion_database_id']);
    console.log('✅ Cleared stored database ID');
    
    // Check current storage state
    const storage = await chrome.storage.local.get(['notion_token', 'notion_database_id']);
    console.log('📊 Current state:', {
      hasToken: !!storage.notion_token,
      databaseId: storage.notion_database_id || 'NONE (will be created automatically)'
    });
    
    console.log('🚀 Ready! Next sync will:');
    console.log('  1. Try to create workspace-level page "📖 Bookmark Collections"');
    console.log('  2. Create "📚 Chrome Bookmarks" database inside that page');
    console.log('  3. Start syncing bookmarks immediately');
    console.log('');
    console.log('💡 The new implementation follows Notion API best practices:');
    console.log('  - Creates workspace page first (proper parent for database)');
    console.log('  - Handles permission errors gracefully');
    console.log('  - Provides detailed error logging for debugging');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
})();
