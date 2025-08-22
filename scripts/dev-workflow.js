#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

/**
 * Development workflow helper
 * Automates common development tasks with environment validation
 */

const command = process.argv[2];
const mode = process.argv[3] || 'development';

function run(cmd, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    process.exit(1);
  }
}

function validateEnvironment(mode) {
  console.log(`🔍 Validating ${mode} environment...`);
  try {
    execSync(`node scripts/validate-env.js ${mode}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Environment validation failed for ${mode}`);
    process.exit(1);
  }
}

switch (command) {
  case 'setup':
    console.log('🚀 Setting up development environment...\n');
    
    // Check if environment files exist
    if (!fs.existsSync('.env.development')) {
      console.log('📋 Creating .env.development from template...');
      execSync('cp .env.example .env.development');
      console.log('📝 Please edit .env.development with your actual values\n');
    }
    
    if (!fs.existsSync('.env.production')) {
      console.log('📋 Creating .env.production from template...');
      execSync('cp .env.example .env.production');
      console.log('📝 Please edit .env.production with your actual values\n');
    }
    
    run('npm install', 'Installing dependencies');
    validateEnvironment('development');
    run('npm run type-check', 'Type checking');
    run('npm run lint', 'Linting code');
    
    console.log('🎉 Development environment setup complete!');
    console.log('💡 Next steps:');
    console.log('   1. Edit .env.development with your Notion credentials');
    console.log('   2. Run: npm run build (development mode)');
    console.log('   3. Load the extension from the dist/ folder');
    break;

  case 'dev':
    console.log('🛠️  Starting development build...\n');
    validateEnvironment('development');
    run('npm run clean', 'Cleaning previous build');
    run('npm run build', 'Building development version');
    console.log('🎉 Development build ready in dist/ folder');
    break;

  case 'prod':
    console.log('🚀 Starting production build...\n');
    validateEnvironment('production');
    run('npm run clean', 'Cleaning previous build');
    run('npm run type-check', 'Type checking');
    run('npm run lint', 'Linting code');
    run('npm run build:prod', 'Building production version');
    console.log('🎉 Production build ready in dist/ folder');
    break;

  case 'validate':
    validateEnvironment(mode);
    break;

  case 'clean':
    run('npm run clean', 'Cleaning build files');
    break;

  default:
    console.log('🔧 Development Workflow Helper\n');
    console.log('Usage: node scripts/dev-workflow.js <command> [mode]\n');
    console.log('Commands:');
    console.log('  setup     - Initial development environment setup');
    console.log('  dev       - Build for development (uses npm run build)');
    console.log('  prod      - Build for production (uses npm run build:prod)');
    console.log('  validate  - Validate environment for specified mode');
    console.log('  clean     - Clean build files');
    console.log('\nModes: development (default), production\n');
    console.log('Examples:');
    console.log('  node scripts/dev-workflow.js setup');
    console.log('  node scripts/dev-workflow.js dev');
    console.log('  node scripts/dev-workflow.js prod');
    console.log('  node scripts/dev-workflow.js validate production');
}
