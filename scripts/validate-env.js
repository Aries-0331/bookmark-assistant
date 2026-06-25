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
const repoRoot = process.cwd();
const extensionDir = path.join(repoRoot, 'packages', 'extension');
let envPath = path.join(repoRoot, envFile);

console.log(`🔍 Validating environment for mode: ${mode}`);
console.log(`📁 Looking for env file: ${envFile}`);

// Check if environment file exists
if (!fs.existsSync(envPath)) {
  const altPath = path.join(extensionDir, envFile);
  if (fs.existsSync(altPath)) {
    envPath = altPath;
    console.log(`   ➜ Using extension env at: packages/extension/${envFile}`);
  } else {
    console.error(`❌ Environment file not found at repo root or extension package`);
    console.log(`   Tried: ${envPath} and ${altPath}`);
    console.log(`💡 Create packages/extension/${envFile} with required variables (see packages/extension/.env.example)`);
    process.exit(1);
  }
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
    'VITE_OAUTH_SERVER_URL',
    // Redirect URI is derived at runtime via chrome.identity.getRedirectURL
    'VITE_NOTION_REDIRECT_URI'
  ],
  defaults: {
    'VITE_APP_NAME': 'Bookmark Assistant',
    'VITE_APP_VERSION': '1.0.19',
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
    console.log(`   ⚠️  ${key}: Not configured`);
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
console.log('   ℹ️ Notion redirect URI is generated dynamically using chrome.identity.getRedirectURL');

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
