#!/bin/bash
set -e

echo "🚀 Vercel Deployment Helper Script"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo -e "${GREEN}✓${NC} Vercel CLI found"
echo ""

# Function to deploy server
deploy_server() {
    echo "📦 Deploying Server..."
    cd packages/server
    
    echo "Checking environment variables..."
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit packages/server/.env with production values${NC}"
        exit 1
    fi
    
    echo "Deploying to Vercel..."
    vercel --prod
    
    echo -e "${GREEN}✓${NC} Server deployed!"
    echo ""
    cd ../..
}

# Function to deploy website
deploy_website() {
    echo "🌐 Deploying Website..."
    cd packages/website
    
    echo "Checking environment variables..."
    if [ ! -f .env.local ] && [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env.local
        echo -e "${YELLOW}⚠️  Please edit packages/website/.env.local with production values${NC}"
        exit 1
    fi
    
    echo "Deploying to Vercel..."
    vercel --prod
    
    echo -e "${GREEN}✓${NC} Website deployed!"
    echo ""
    cd ../..
}

# Function to build extension
build_extension() {
    echo "🧩 Building Extension..."
    cd packages/extension
    
    echo "Checking environment variables..."
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit packages/extension/.env with production values${NC}"
        exit 1
    fi
    
    echo "Building extension..."
    pnpm build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Extension built successfully!"
        echo ""
        echo "📦 Creating ZIP for Chrome Web Store..."
        cd dist
        zip -r ../bookmark-assistant-v0.1.0.zip . -x "*.DS_Store"
        cd ..
        echo -e "${GREEN}✓${NC} ZIP created: packages/extension/bookmark-assistant-v0.1.0.zip"
    else
        echo -e "${RED}❌ Extension build failed${NC}"
        exit 1
    fi
    
    cd ../..
}

# Main menu
echo "What would you like to deploy?"
echo "1) Server only"
echo "2) Website only"
echo "3) Build Extension only"
echo "4) Server + Website"
echo "5) Full deployment (Server + Website + Extension)"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        deploy_server
        ;;
    2)
        deploy_website
        ;;
    3)
        build_extension
        ;;
    4)
        deploy_server
        deploy_website
        ;;
    5)
        deploy_server
        deploy_website
        build_extension
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "1. Note your deployment URLs from Vercel output above"
echo "2. Update Paddle webhook URL with server URL"
echo "3. Update Notion OAuth redirect with server URL"
if [ "$choice" = "3" ] || [ "$choice" = "5" ]; then
    echo "4. Upload bookmark-assistant-v0.1.0.zip to Chrome Web Store"
fi
