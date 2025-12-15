#!/bin/bash
set -e

echo "🧩 Building Extension for Chrome Web Store"
echo "=========================================="

cd packages/extension

echo "Building extension..."
pnpm build

if [ $? -eq 0 ]; then
    echo "✓ Extension built successfully!"
    
    VERSION=$(node -p "require('./package.json').version")
    ZIP_NAME="bookmark-assistant-v${VERSION}.zip"
    
    echo "📦 Creating ZIP for Chrome Web Store..."
    cd dist
    zip -r ../$ZIP_NAME . -x "*.DS_Store"
    cd ..
    
    echo "✓ ZIP created: packages/extension/$ZIP_NAME"
    echo ""
    echo "📤 Ready to upload to Chrome Web Store!"
else
    echo "❌ Extension build failed"
    exit 1
fi
