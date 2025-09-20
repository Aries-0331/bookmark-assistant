// Test Direct Notion OAuth flow
// Run this in the extension background context

import { launchNotionOAuth, exchangeCodeForToken } from './oauth';

async function testDirectOAuthFlow() {
  console.log('🧪 Testing DIRECT Notion OAuth flow...');

  try {
    // Test 1: Launch OAuth (should work)
    console.log('Step 1: Testing OAuth launch...');
    const result = await launchNotionOAuth();
    console.log('✅ OAuth launch successful:', result);

    // Test 2: Check environment variables
    console.log('Step 2: Checking OAuth credentials...');
    console.log(
      'VITE_NOTION_CLIENT_ID:',
      import.meta.env.VITE_NOTION_CLIENT_ID?.substring(0, 8) + '...'
    );
    console.log(
      'VITE_NOTION_CLIENT_SECRET available:',
      !!import.meta.env.VITE_NOTION_CLIENT_SECRET
    );

    // Test 3: Simulate direct code exchange (will fail with invalid code, but should show no window errors)
    console.log('Step 3: Testing direct Notion API call...');
    const mockCode = 'test_code_123';
    const redirectUri = `chrome-extension://${chrome.runtime.id}/oauth-callback.html`;

    try {
      const tokenResult = await exchangeCodeForToken(mockCode);
      console.log('Token exchange result:', tokenResult);
    } catch (error) {
      console.log('Expected error for mock code:', error.message);

      // Check if the error is window-related
      if (error.message && error.message.includes('window')) {
        console.error('❌ WINDOW ERROR STILL EXISTS:', error);
      } else {
        console.log('✅ No window errors - this is expected Notion API error');
      }
    }
  } catch (error) {
    console.log('Test error:', error);

    // Check if the error is window-related
    if (error.message && error.message.includes('window')) {
      console.error('❌ WINDOW ERROR STILL EXISTS:', error);
    } else {
      console.log('✅ No window errors detected');
    }
  }
}

// Export for manual testing
(globalThis as any).testDirectOAuthFlow = testDirectOAuthFlow;

console.log('🧪 Direct OAuth test loaded. Run testDirectOAuthFlow() in extension console.');
