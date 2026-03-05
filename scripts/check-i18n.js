#!/usr/bin/env node
/**
 * i18n Validation Script
 * Checks for:
 * 1. Unused translation keys (in messages.json but not used in code)
 * 2. Missing translation keys (used in code but not in messages.json)
 *
 * Usage: node scripts/check-i18n.js
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_PATH = path.join(__dirname, '../packages/extension/_locales/en/messages.json');
const EXTENSION_SRC = path.join(__dirname, '../packages/extension/src');

// Load messages.json
let messages;
try {
  messages = JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf8'));
} catch (e) {
  console.error('Failed to load messages.json:', e.message);
  process.exit(1);
}

const messageKeys = new Set(Object.keys(messages));
console.log(`Found ${messageKeys.size} translation keys in messages.json`);

// Known non-translation patterns to exclude
const KNOWN_STORAGE_KEYS = new Set([
  'auto_sync_enabled',
  'sync_in_progress',
  'error_reports',
  'upgraded',
  'session_token',
  'notion_token',
  'is_pro',
  'user_id',
  'last_sync',
  'code', // URLSearchParams.get('code') - not a translation key
]);

// Find all translation key usages in source code
// Match patterns: t('key'), t("key")
// Exclude patterns that are not translation keys (storage keys, email templates, etc.)
const translationPattern = /t\(['"]([a-z_][a-z0-9_]*)['"]\)/g;

const usedKeys = new Set();
const sourceFiles = ['tsx', 'ts', 'jsx', 'js'];

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === 'dist' || file === '.git') {
        continue;
      }
      scanDirectory(fullPath);
    } else {
      const ext = file.split('.').pop();
      // Skip test files for production check
      if (!sourceFiles.includes(ext) || file.includes('.test.') || file.includes('.spec.')) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        let match;
        while ((match = translationPattern.exec(content)) !== null) {
          const key = match[1];
          // Skip single-letter keys, very short keys, and known storage keys
          if (key.length >= 3 && !KNOWN_STORAGE_KEYS.has(key)) {
            usedKeys.add(key);
          }
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
  }
}

console.log('Scanning source files for translation key usage...');
scanDirectory(EXTENSION_SRC);

console.log(`Found ${usedKeys.size} translation keys used in code`);

// Check for unused keys (in messages.json but not used in code)
const unusedKeys = [...messageKeys].filter(key => !usedKeys.has(key));

// Check for missing keys (used in code but not in messages.json)
const missingKeys = [...usedKeys].filter(key => !messageKeys.has(key));

// Report results
console.log('\n--- Results ---');

let hasErrors = false;

if (unusedKeys.length > 0) {
  console.log(`\nUnused translation keys (${unusedKeys.length}):`);
  unusedKeys.slice(0, 20).forEach(key => console.log(`  - ${key}`));
  if (unusedKeys.length > 20) {
    console.log(`  ... and ${unusedKeys.length - 20} more`);
  }
}

if (missingKeys.length > 0) {
  console.log(`\nMissing translation keys (${missingKeys.length}):`);
  missingKeys.forEach(key => console.log(`  - ${key}`));
  hasErrors = true;
}

if (unusedKeys.length === 0 && missingKeys.length === 0) {
  console.log('\nAll translation keys are in use and defined!');
} else if (missingKeys.length === 0) {
  console.log('\nAll used keys have translations (no missing keys)');
}

if (hasErrors) {
  console.log('\ni18n check failed: missing translation keys');
  process.exit(1);
} else {
  console.log('\ni18n check passed');
  process.exit(0);
}
