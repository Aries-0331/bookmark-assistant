#!/usr/bin/env node
/**
 * Chrome Extension Build & Zip Script
 * Automatically builds extension and creates a publish-ready zip file
 *
 * This script:
 * 1. Detects and backs up .env.local if present
 * 2. Builds extension with production config
 * 3. Creates a clean zip file for Chrome Web Store
 * 4. Restores .env.local for development
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envLocalPath = path.join(projectRoot, '.env.local');
const envLocalBackup = path.join(projectRoot, '.env.local.backup');
const distPath = path.join(projectRoot, 'dist');
const buildDir = path.join(projectRoot, 'build');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logStep(step, message) {
  console.log(`\n${COLORS.cyan}[${step}]${COLORS.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${COLORS.green}✓ ${message}${COLORS.reset}`);
}

function logWarning(message) {
  console.log(`${COLORS.yellow}⚠ ${message}${COLORS.reset}`);
}

function logError(message) {
  console.log(`${COLORS.red}✗ ${message}${COLORS.reset}`);
}

async function cleanup() {
  logStep('Cleanup', 'Removing temporary files...');
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  if (fs.existsSync(envLocalBackup)) {
    fs.rmSync(envLocalBackup, { force: true });
  }
}

async function backupEnvLocal() {
  if (fs.existsSync(envLocalPath)) {
    logWarning('.env.local detected - backing up for production build');
    fs.copyFileSync(envLocalPath, envLocalBackup);
    fs.rmSync(envLocalPath);
    logSuccess('Backed up .env.local');
  }
}

async function restoreEnvLocal() {
  if (fs.existsSync(envLocalBackup)) {
    logStep('Restore', 'Restoring .env.local for development');
    fs.copyFileSync(envLocalBackup, envLocalPath);
    fs.rmSync(envLocalBackup);
    logSuccess('Restored .env.local');
  }
}

async function buildExtension() {
  logStep('Build', 'Building extension for production...');
  try {
    execSync('npm run build:prod', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    logSuccess('Extension built successfully');
  } catch (error) {
    logError('Build failed');
    throw error;
  }
}

async function createPublishZip() {
  const manifestPath = path.join(distPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json not found. Build may have failed.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const version = manifest.version;
  const zipName = `bookmark-assistant-v${version}.zip`;
  const zipPath = path.join(projectRoot, zipName);

  logStep('Archive', `Creating ${zipName}...`);

  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }

  // Create build directory and copy necessary files
  fs.mkdirSync(buildDir, { recursive: true });

  // Files to include in the zip (Chrome Web Store requirements)
  const requiredFiles = [
    'manifest.json',
    'serviceWorker.js',
  ];

  // Copy required files from dist
  for (const file of requiredFiles) {
    const srcPath = path.join(distPath, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(buildDir, file));
    }
  }

  // Copy directories (assets, src, _locales)
  const dirsToCopy = ['assets', 'src', '_locales'];
  for (const dir of dirsToCopy) {
    const srcDir = path.join(distPath, dir);
    if (fs.existsSync(srcDir)) {
      copyDirectory(srcDir, path.join(buildDir, dir));
    }
  }

  // Copy HTML files
  const htmlFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.html'));
  for (const file of htmlFiles) {
    fs.copyFileSync(
      path.join(distPath, file),
      path.join(buildDir, file)
    );
  }

  // Create zip using zip command (macOS/Linux)
  try {
    execSync(`cd "${buildDir}" && zip -r "${zipPath}" . -x "*.DS_Store" "*.git*"`, {
      stdio: 'inherit',
    });
  } catch (error) {
    // If zip command not available, try using node's native capabilities
    logWarning('System zip command not available, using alternative method...');
    await createZipAlternative(buildDir, zipPath);
  }

  // Clean up build directory
  fs.rmSync(buildDir, { recursive: true, force: true });

  logSuccess(`Created: ${zipName}`);
  return { zipPath, zipName, version };
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function createZipAlternative(sourceDir, outputPath) {
  // Fallback method using JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  function addFilesToZip(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(dir, entry.name);
      const zipPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        addFilesToZip(srcPath, zipPath);
      } else {
        const content = fs.readFileSync(srcPath);
        zip.file(zipPath, content);
      }
    }
  }

  addFilesToZip(sourceDir);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, content);
}

function printSummary({ zipName, version }) {
  console.log('\n' + '='.repeat(60));
  logSuccess('Build Complete!', COLORS.green);
  console.log('='.repeat(60));
  console.log(`\n  Version: ${COLORS.cyan}${version}${COLORS.reset}`);
  console.log(`  Zip file: ${COLORS.green}${zipName}${COLORS.reset}`);
  console.log(`\n${COLORS.yellow}Ready for Chrome Web Store upload!${COLORS.reset}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('Chrome Extension Build & Zip Tool', COLORS.cyan);
  console.log('='.repeat(60) + '\n');

  try {
    // Cleanup on start
    await cleanup();

    // Backup and remove .env.local for production build
    await backupEnvLocal();

    // Build the extension
    await buildExtension();

    // Create publish-ready zip
    const result = await createPublishZip();

    // Restore .env.local
    await restoreEnvLocal();

    // Print summary
    printSummary(result);

    process.exit(0);
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    console.error('\nStack trace:', error.stack);

    // Try to restore .env.local on error
    try {
      await restoreEnvLocal();
    } catch (restoreError) {
      // Ignore restore errors
    }

    // Cleanup on error
    await cleanup();

    process.exit(1);
  }
}

// Run main function
main();
