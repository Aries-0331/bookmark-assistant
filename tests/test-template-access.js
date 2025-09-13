import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test template access
async function testTemplateAccess() {
    console.log('🔍 Testing template database access...');
    
    const templateUrl = 'https://www.notion.so/2659466de76d8071b304f2e6654873bd?v=2659466de76d80a0b18b000c997a014a&source=copy_link';
    
    // Extract the database ID from the URL
    const match = templateUrl.match(/([a-f0-9]{32})/);
    if (!match) {
        console.error('❌ Could not extract database ID from URL');
        return;
    }
    
    const templateId = match[1];
    // Add hyphens to make proper UUID format
    const formattedId = templateId.substring(0,8) + '-' + templateId.substring(8,12) + '-' + templateId.substring(12,16) + '-' + templateId.substring(16,20) + '-' + templateId.substring(20);
    console.log('📋 Extracted template database ID:', formattedId);
    
    // Test if it's publicly accessible
    console.log('🌐 Template URL analysis:');
    console.log('  - Database ID:', formattedId);
    console.log('  - View ID:', templateUrl.match(/v=([a-f0-9]+)/)?.[1] || 'Not found');
    console.log('  - Source:', templateUrl.includes('source=copy_link') ? 'Copy link' : 'Direct');
    
    // Since we're not in Chrome extension environment, provide manual instructions
    console.log('🔧 Manual testing approach needed:');
    console.log('1. Share the template database with your Notion integration');
    console.log('2. Use this ID to test: ' + formattedId);
    console.log('3. The API can then be used to read the schema and create new databases');
    
    return {
        success: 'pending',
        templateId: formattedId,
        instructions: [
            'Share template with integration',
            'Test API access from extension',
            'Implement schema duplication'
        ]
    };
}

// Run the test
testTemplateAccess().then(result => {
    console.log('🎯 Test result:', result);
}).catch(error => {
    console.error('💥 Test failed:', error);
});
