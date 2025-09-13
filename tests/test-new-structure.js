// Test script to reset and create new database structure
// This will clear your stored database ID so a new one gets created with the correct structure

console.log('🧹 Clearing stored database ID...');

chrome.storage.local.remove(['notion_database_id'], () => {
  console.log('✅ Database ID cleared');
  console.log('🔄 Next bookmark sync will create a new database with correct structure');
  console.log('📝 The new structure will be:');
  console.log('   1. One workspace page: "📚 Chrome Bookmarks"');
  console.log('   2. One database inside it: "Bookmarks" (table view)');
  console.log('   3. Each bookmark will be a row in the table');
  console.log('');
  console.log('💡 To test: Try bookmarking any page and it should create the new structure');
});
