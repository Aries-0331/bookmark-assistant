# Bookmark Notion Sync

A Chrome extension that syncs your bookmarks to Notion with AI-powered tagging and summarization.

## ✨ Features

- **Bulk Bookmark Sync**: Export all your Chrome bookmarks to Notion at once
- **Smart Content Extraction**: Extract meaningful content from bookmarked pages
- **OAuth Integration**: Secure connection to your Notion workspace
- **Batch Processing**: Syncs bookmarks in small batches to respect API limits
- **Error Handling**: Robust fallbacks and user-friendly error messages
- **🔮 Coming Soon**: AI-powered tagging and summarization (planned as advanced features)

## 🚀 Quick Start

### 1. Setup Your Environment

Create environment files for configuration in the extension package:

`packages/extension/.env.development` (for development):

```env
# Notion OAuth (client-side)
# IMPORTANT: Only include the public Client ID here. The Client Secret MUST remain server-only.
VITE_NOTION_CLIENT_ID=your_notion_integration_client_id

# Note: AI features are currently disabled to focus on core functionality
# They will be added back as advanced features in the future
```

`packages/extension/.env.production` (for production build):

```env
# Same as development but with production values
VITE_NOTION_CLIENT_ID=your_production_notion_client_id
# (No secret in extension env; redirect URI is computed dynamically)

You can also set `VITE_EDITION` to `open-source` or `pro` to toggle feature flags in the client.
```

### 2. Build and Install

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# The built extension will be in the /dist folder
```

### 3. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `/dist` folder

### 4. Configure the Extension

1. **Connect to Notion**:
   - Click the extension icon
   - Click "Connect to Notion"
   - Complete OAuth authentication

2. **Setup Database**:
   - Go to extension options (Settings)
   - Create a database in Notion with these properties:
     - `Title` (Title) - Bookmark title
     - `URL` (URL) - Bookmark URL
     - `Description` (Text) - Page description or content summary
     - `Created` (Date) - When bookmark was added
     - `BookmarkId` (Text) - Internal ID
     - `Source` (Text) - Always "Chrome Bookmarks"
   - Copy the database ID from the Notion URL
   - Paste it in the extension settings

3. **Start Syncing**:
   - Click "Sync All Bookmarks" in the popup
   - Watch your bookmarks appear in Notion!

## 🔧 Technical Details

### Service Worker Compatibility

This extension handles the Chrome extension service worker `fetch` context issues using:

1. **Primary Method**: `fetch.call(null, url, options)` for proper context binding
2. **Fallback Method**: XMLHttpRequest for maximum compatibility
3. **Error Handling**: Graceful degradation when AI features are unavailable

### Architecture

- **Manifest V3**: Uses modern Chrome extension APIs
- **React + TypeScript**: Modern development stack
- **Vite**: Fast build tool with hot reload
- **Tailwind CSS**: Utility-first styling
- **ES Modules**: Modern JavaScript module system

### API Integration

- **Notion API**: Uses OAuth 2.0 for secure authentication
- **Chrome APIs**: Bookmarks, Storage, Scripting, and Identity
- **Content Extraction**: Intelligent page content extraction with fallbacks

## 📋 Usage Guide

### Bulk Sync (Recommended)

1. Click the extension icon
2. Ensure you're connected to Notion and database is configured
3. Click "Sync All Bookmarks"
4. Wait for the sync to complete (processes 5 bookmarks at a time)

### Single Page Sync (Future Feature)

Visit any webpage and use the extension to add it as a bookmark with AI enhancement.

## 🛠️ Development

### Environment Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd bookmark-notion-sync

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:prod
```

### Project Structure

```
src/
├── background/          # Service worker scripts
│   ├── index.ts        # Main background script
│   ├── oauth.ts        # Notion OAuth handling
│   └── bookmark-sync.ts # Bulk bookmark processing
├── popup/              # Extension popup UI
├── options/            # Extension options page
├── content/            # Content scripts
├── lib/                # Shared utilities
│   ├── notion.ts       # Notion API integration
│   ├── ai-tagger.ts    # OpenAI integration
│   ├── content-extractor.ts # Page content extraction
│   ├── config.ts       # Environment configuration
│   └── storage.ts      # Chrome storage utilities
└── types/              # TypeScript type definitions
```

### Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm run validate-env` - Validate environment configuration

## 🐛 Troubleshooting

### Common Issues

1. **"Notion database not configured"**
   - Complete database setup in extension options
   - Ensure database has all required properties

2. **"Failed to execute 'fetch'"**
   - Extension now includes XMLHttpRequest fallback
   - Check internet connection and API keys

3. **OAuth Authentication Failed**
   - Verify Notion integration redirect URI
   - Clear browser cache and try again

4. **Content Extraction Issues**
   - Ensure target pages are accessible
   - Some sites may block content extraction

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

## 📚 Documentation

- [Database Setup Guide](DATABASE_SETUP.md)
- [OAuth Setup Guide](OAUTH_SETUP_FIX.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Testing Guide](TESTING_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Features Roadmap

### Core Features ✅

- [x] Bulk bookmark sync
- [x] OAuth authentication
- [x] Content extraction
- [x] Error handling

### Advanced Features 🔮

- [ ] AI-powered tagging (OpenAI integration)
- [ ] AI-generated summaries
- [ ] Custom tag templates
- [ ] Folder-based syncing
- [ ] Bulk edit operations
- [ ] Export/import bookmarks
- [ ] Multiple Notion databases
- [ ] Browser bookmark folders mapping

---

**Happy bookmarking! 🔖**
// Optionally, add this for stylistic rules
...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },

},
])

````

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
````
