#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment validation script for Chrome extension
 * Validates environment variables for different modes (development/production)
 */

const mode = process.argv[2] || 'development';
const envFile = `.env.${mode}`;
const envPath = path.join(process.cwd(), envFile);

console.log(`🔍 Validating environment for mode: ${mode}`);
console.log(`📁 Checking file: ${envFile}`);

// Check if environment file exists
if (!fs.existsSync(envPath)) {
  console.error(`❌ Environment file not found: ${envFile}`);
  console.log(`💡 Create the file with required variables:`);
  console.log(`   cp .env.example ${envFile}`);
  process.exit(1);
}

// Read and parse environment file
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=');
    }
  }
});

// Define validation rules
const validationRules = {
  required: [
    'VITE_NOTION_CLIENT_ID'
  ],
  optional: [
    'VITE_OPENAI_API_KEY',
    'VITE_OPENAI_MODEL',
    'VITE_OPENAI_MAX_TOKENS'
  ],
  defaults: {
    'VITE_APP_NAME': 'Bookmark Notion Sync',
    'VITE_APP_VERSION': '0.1.0',
    'VITE_DEBUG_MODE': mode === 'development' ? 'true' : 'false',
    'VITE_MAX_CONTENT_LENGTH': '5000',
    'VITE_EXTRACTION_TIMEOUT': '10000',
    'VITE_AUTO_SYNC_ENABLED': 'true',
    'VITE_BATCH_SIZE': '10',
    'VITE_SYNC_DELAY': '1000'
  }
};

let hasErrors = false;
let hasWarnings = false;

console.log('\n📋 Validation Results:');

// Check required variables
console.log('\n✅ Required Variables:');
validationRules.required.forEach(key => {
  const value = envVars[key];
  if (!value || value.includes('your_') || value.includes('_here')) {
    console.log(`   ❌ ${key}: Missing or placeholder value`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${key}: Configured`);
  }
});

// Check optional variables
console.log('\n⚠️  Optional Variables:');
validationRules.optional.forEach(key => {
  const value = envVars[key];
  if (!value || value.includes('your_') || value.includes('_here')) {
    console.log(`   ⚠️  ${key}: Not configured (AI features disabled)`);
    hasWarnings = true;
  } else {
    console.log(`   ✅ ${key}: Configured`);
  }
});

// Check default variables
console.log('\n🔧 Configuration Variables:');
Object.entries(validationRules.defaults).forEach(([key, defaultValue]) => {
  const value = envVars[key] || defaultValue;
  console.log(`   📝 ${key}: ${value}`);
});

// Mode-specific validations
if (mode === 'production') {
  console.log('\n🚀 Production Mode Checks:');

  if (envVars['VITE_DEBUG_MODE'] === 'true') {
    console.log('   ⚠️  VITE_DEBUG_MODE is enabled in production');
    hasWarnings = true;
  } else {
    console.log('   ✅ Debug mode disabled');
  }

  if (!envVars['VITE_OPENAI_API_KEY'] || envVars['VITE_OPENAI_API_KEY'].includes('your_')) {
    console.log('   ⚠️  AI features will be disabled in production build');
    hasWarnings = true;
  }
}

if (mode === 'development') {
  console.log('\n🛠️  Development Mode Checks:');

  if (envVars['VITE_DEBUG_MODE'] !== 'true') {
    console.log('   💡 Consider enabling VITE_DEBUG_MODE for development');
  } else {
    console.log('   ✅ Debug mode enabled');
  }
}

// Chrome Extension specific validations
console.log('\n🌐 Chrome Extension Checks:');

// Check if redirect URI matches expected format
const redirectUri = envVars['VITE_NOTION_REDIRECT_URI'];
if (redirectUri && redirectUri.startsWith('chrome-extension://')) {
  console.log('   ✅ Redirect URI format looks correct');
} else if (redirectUri) {
  console.log('   ⚠️  Redirect URI should start with chrome-extension://');
  hasWarnings = true;
} else {
  console.log('   💡 VITE_NOTION_REDIRECT_URI will be generated dynamically');
}

// Summary
console.log('\n📊 Summary:');
if (hasErrors) {
  console.log('❌ Validation failed - please fix the required variables');
  console.log('💡 Required variables must be configured for the extension to work');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Validation passed with warnings');
  console.log('💡 Some features may be limited due to missing optional configuration');
  process.exit(0);
} else {
  console.log('✅ All validations passed!');
  console.log('🚀 Environment is ready for build');
  process.exit(0);
}
