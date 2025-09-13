# Environment Setup Guide

This guide will help you set up the environment variables needed for the Bookmark Notion Sync Chrome extension.

## Required Environment Variables

### 1. Notion Integration

To connect with Notion, you need to create a Notion integration:

1. Go to [Notion Developers](https://developers.notion.com/)
2. Click "New integration"
3. Fill in the details and create the integration
4. Copy the "Internal Integration Token" (this is your client secret)
5. Get your Client ID from the integration settings

```bash
VITE_NOTION_CLIENT_ID=your_notion_client_id_here
VITE_NOTION_CLIENT_SECRET=your_notion_client_secret_here
```

### 2. OpenAI API (Optional but Recommended)

For AI-powered tagging and summarization:

1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key

```bash
VITE_OPENAI_API_KEY=sk-your_openai_api_key_here
```

## Setup Instructions

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Fill in Your Values

Edit the `.env` file and replace the placeholder values:

```bash
# Required - Notion Integration
VITE_NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612  # Your actual client ID
VITE_NOTION_CLIENT_SECRET=secret_xyz123...                   # Your actual client secret

# Optional - AI Features
VITE_OPENAI_API_KEY=sk-proj-xyz123...                       # Your OpenAI API key

# These can stay as default
VITE_OPENAI_MODEL=gpt-3.5-turbo
VITE_OPENAI_MAX_TOKENS=150
VITE_APP_NAME=Bookmark Notion Sync
VITE_APP_VERSION=0.1.0
VITE_DEBUG_MODE=true
```

### 3. Development vs Production

- **Development**: Use `.env.development` for local development
- **Production**: Environment variables will be baked into the build

### 4. Build the Extension

```bash
# Development build (with debug logging)
npm run build:dev

# Production build (optimized)
npm run build
```

## Security Notes

- Never commit your actual API keys to version control
- The `.env` file is already in `.gitignore`
- Environment variables are baked into the built extension, so be careful when distributing

## Environment Variable Types

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `VITE_NOTION_CLIENT_ID` | string | ✅ | Notion integration client ID |
| `VITE_NOTION_CLIENT_SECRET` | string | ✅ | Notion integration secret |
| `VITE_OPENAI_API_KEY` | string | ❌ | OpenAI API key for AI features |
| `VITE_OPENAI_MODEL` | string | ❌ | AI model to use (default: gpt-3.5-turbo) |
| `VITE_DEBUG_MODE` | boolean | ❌ | Enable debug logging (default: false) |
| `VITE_AUTO_SYNC_ENABLED` | boolean | ❌ | Auto-sync bookmarks (default: true) |

## Troubleshooting

### Configuration Validation

The extension will validate your configuration on startup and log any issues to the console.

### Missing Environment Variables

If required environment variables are missing:
- The extension will still work but with limited functionality
- AI features will fall back to simple keyword extraction
- Check the browser console for configuration warnings

### Debug Mode

Set `VITE_DEBUG_MODE=true` to see detailed configuration logging in the browser console.
