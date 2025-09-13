// Script to fix database access issue - run in extension console

(async function fixDatabaseIssue() {
  console.log('🔧 Fixing database access issue...');
  
  try {
    // Clear the problematic database ID
    await chrome.storage.local.remove(['notion_database_id']);
    console.log('✅ Cleared inaccessible database ID');
    
    // Show current storage state
    const storage = await chrome.storage.local.get(['notion_token', 'notion_database_id']);
    console.log('📊 Current storage:', {
      hasToken: !!storage.notion_token,
      databaseId: storage.notion_database_id || 'Not set'
    });
    
    console.log('🚀 Next sync will create a new database that your integration can access');
    
    // Optionally reload the extension
    if (confirm('Reload extension to ensure changes take effect?')) {
      chrome.runtime.reload();
    }
    
  } catch (error) {
    console.error('❌ Error fixing database issue:', error);
  }
})();

// Alternative: Use the new message handler
// chrome.runtime.sendMessage({ type: "CLEAR_DATABASE" }, (response) => {
//   console.log('Clear database response:', response);
// });
