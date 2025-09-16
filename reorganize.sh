#!/bin/bash
# reorganize.sh - Script to reorganize the bookmark-notion-sync project

echo "🏗️ Starting project reorganization..."

# Create new directory structure
mkdir -p packages/extension/src/{background,popup,options,content,lib,types}
mkdir -p packages/extension/public/icons
mkdir -p packages/server/src/{middleware,routes,utils,types}
mkdir -p docs/{setup,guides,implementation,troubleshooting}
mkdir -p tests/{unit,integration,e2e}
mkdir -p scripts
mkdir -p tools

echo "📁 Created new directory structure"

# Move Chrome Extension files
echo "🔄 Moving Chrome Extension files..."
cp -r src/* packages/extension/src/ 2>/dev/null || true
cp manifest.json packages/extension/ 2>/dev/null || true
cp index.html packages/extension/ 2>/dev/null || true
cp vite.config.ts packages/extension/ 2>/dev/null || true
cp postcss.config.js packages/extension/ 2>/dev/null || true
cp tailwind.config.js packages/extension/ 2>/dev/null || true
cp tsconfig.app.json packages/extension/ 2>/dev/null || true
cp tsconfig.node.json packages/extension/ 2>/dev/null || true

# Copy environment files for extension
cp .env.development packages/extension/ 2>/dev/null || true
cp .env.production packages/extension/ 2>/dev/null || true
cp .env.example packages/extension/ 2>/dev/null || true

# Copy public directory
cp -r public/* packages/extension/public/ 2>/dev/null || true

echo "🔄 Moving server files..."
cp -r server/* packages/server/ 2>/dev/null || true

echo "📚 Moving documentation..."
cp QUICK_START.md docs/setup/ 2>/dev/null || true
cp DATABASE_SETUP.md docs/setup/ 2>/dev/null || true
cp OAUTH_SETUP_FIX.md docs/setup/ 2>/dev/null || true
cp docs/ENVIRONMENT.md docs/setup/ 2>/dev/null || true

cp DEPLOYMENT_GUIDE.md docs/guides/ 2>/dev/null || true
cp OAUTH_INTEGRATION_GUIDE.md docs/guides/ 2>/dev/null || true
cp SECURITY_ARCHITECTURE.md docs/guides/ 2>/dev/null || true
cp SERVER_ARCHITECTURE.md docs/guides/ 2>/dev/null || true

cp IMPLEMENTATION_COMPLETE.md docs/implementation/ 2>/dev/null || true
cp OAUTH_IMPLEMENTATION_COMPLETE.md docs/implementation/ 2>/dev/null || true
cp OPTIMIZATION_SUMMARY.md docs/implementation/ 2>/dev/null || true
cp AI_FEATURES_STATUS.md docs/implementation/ 2>/dev/null || true

cp TROUBLESHOOTING.md docs/troubleshooting/ 2>/dev/null || true
cp OAUTH_TROUBLESHOOTING.md docs/troubleshooting/ 2>/dev/null || true
cp NOTION_INTEGRATION_FIX.md docs/troubleshooting/ 2>/dev/null || true

echo "🧪 Moving test files..."
cp test-*.js tests/ 2>/dev/null || true
cp TESTING_GUIDE.md tests/ 2>/dev/null || true

echo "🔧 Moving scripts..."
cp fix-database-now.js scripts/ 2>/dev/null || true
cp fix-storage.js scripts/ 2>/dev/null || true
cp scripts/dev-workflow.js scripts/ 2>/dev/null || true
cp scripts/validate-env.js scripts/ 2>/dev/null || true

echo "🛠️ Moving development tools..."
cp .prettierrc tools/ 2>/dev/null || true
cp .prettierignore tools/ 2>/dev/null || true
cp eslint.config.js tools/ 2>/dev/null || true

echo "✅ Project reorganization complete!"
echo "📝 Next steps:"
echo "  1. Update import paths in files"
echo "  2. Create package.json files for each package"
echo "  3. Test builds"
echo "  4. Remove old files after verification"

# Cleanup old files (run after verification)
echo "🧹 Cleaning up old files..."
echo "⚠️  This will remove the original files - ensure everything builds first!"
read -p "Continue with cleanup? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ Removing old files..."
    rm -rf src/
    rm -rf server/
    rm -rf public/
    rm -f manifest.json index.html vite.config.ts postcss.config.js tailwind.config.js tsconfig.app.json tsconfig.node.json
    rm -f test-*.js
    rm -f fix-database-now.js fix-storage.js
    rm -f AI_FEATURES_STATUS.md DATABASE_SETUP.md DEPLOYMENT_GUIDE.md IMPLEMENTATION_COMPLETE.md
    rm -f NOTION_INTEGRATION_FIX.md OAUTH_IMPLEMENTATION_COMPLETE.md OAUTH_INTEGRATION_GUIDE.md
    rm -f OAUTH_SETUP_FIX.md OAUTH_TROUBLESHOOTING.md OPTIMIZATION_SUMMARY.md QUICK_START.md
    rm -f SECURITY_ARCHITECTURE.md SERVER_ARCHITECTURE.md TEMPLATE_DESCRIPTION.md
    rm -f TEMPLATE_DUPLICATION_SUMMARY.md TEMPLATE_FEATURE_GUIDE.md TESTING_GUIDE.md TROUBLESHOOTING.md
    rm -f package-old.json
    echo "✅ Cleanup complete!"
else
    echo "⏸️ Cleanup skipped. Run cleanup manually when ready."
fi
