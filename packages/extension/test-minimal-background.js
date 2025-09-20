// Minimal test background script without polyfills
console.log('=== WINDOW ACCESS TEST ===');

// Test 1: Direct window access
console.log('1. Testing direct window access...');
try {
  console.log('typeof window:', typeof window);
  if (typeof window !== 'undefined') {
    console.log('window.location:', window.location);
  }
} catch (error) {
  console.error('❌ Direct window access error:', error.message);
}

// Test 2: Import our config (should have its own polyfill)
console.log('2. Testing config import...');
try {
  // This would import the config which has a window polyfill
  import('./src/lib/config.js').then(config => {
    console.log('✅ Config imported successfully');
  }).catch(error => {
    console.error('❌ Config import error:', error.message);
  });
} catch (error) {
  console.error('❌ Config import error:', error.message);
}

// Test 3: Import @notionhq/client directly
console.log('3. Testing @notionhq/client import...');
try {
  import('@notionhq/client').then(({ Client }) => {
    console.log('✅ @notionhq/client imported successfully');
    try {
      const client = new Client({ auth: 'test' });
      console.log('✅ Client instantiated successfully');
    } catch (error) {
      console.error('❌ Client instantiation error:', error.message);
    }
  }).catch(error => {
    console.error('❌ @notionhq/client import error:', error.message);
  });
} catch (error) {
  console.error('❌ @notionhq/client import error:', error.message);
}
