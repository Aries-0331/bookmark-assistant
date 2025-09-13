// Reset script for testing the new singleton database pattern
// Run this in your extension console to clear everything and test

console.log('🧹 Resetting extension for singleton database test...');

(async function resetForSingletonTest() {
  try {
    // Clear stored database ID
    await chrome.storage.local.remove(['notion_database_id']);
    console.log('✅ Cleared stored database ID');
    
    // Test message to clear cache (if extension is already loaded)
    try {
      await chrome.runtime.sendMessage({ type: "CLEAR_DATABASE" });
      console.log('✅ Cleared database cache');
    } catch (error) {
      console.log('ℹ️ Extension may need to be reloaded to clear cache');
    }
    
    console.log('');
    console.log('🚀 Ready for singleton database test!');
    console.log('📝 What will happen now:');
    console.log('   1. First bookmark sync will create ONE database');
    console.log('   2. All subsequent bookmarks will use the SAME database');
    console.log('   3. You should see "Using cached database ID" messages');
    console.log('   4. Result: ONE page with ONE database containing ALL bookmarks');
    console.log('');
    console.log('💡 To test: Click "Sync All Bookmarks" and watch the console');
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
})();
