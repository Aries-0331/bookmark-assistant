// Test script to isolate window access in OAuth flow
import { serverAPI } from '../lib/server-api';

console.log('🧪 Testing server API directly...');

// Test the exact OAuth exchange that's failing
async function testOAuthExchange() {
  try {
    console.log('1️⃣ Testing serverAPI instance creation...');
    console.log('serverAPI created:', !!serverAPI);

    console.log('2️⃣ Testing makeRequest method accessibility...');
    // We can't call the private method directly, but we can test the public method that uses it

    console.log('3️⃣ Testing OAuth exchange with mock data...');
    await serverAPI.exchangeOAuthCode('test-code', 'test-redirect-uri');
  } catch (error) {
    console.error('🚨 Error during test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testOAuthExchange();
