// Test script to identify window access source
console.log('Testing window access...');

// Test direct imports
try {
  console.log('1. Testing @notionhq/client import...');
  const { Client } = require('@notionhq/client');
  console.log('✅ @notionhq/client imported successfully');

  console.log('2. Testing Client instantiation...');
  const client = new Client({ auth: 'test' });
  console.log('✅ Client instantiated successfully');
} catch (error) {
  console.error('❌ Error during Client operations:', error.message);
}

// Test our modules without polyfills
try {
  console.log('3. Testing config import...');
  // This would normally cause the window error if config.ts needs window
} catch (error) {
  console.error('❌ Error during config import:', error.message);
}
