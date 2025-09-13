# Testing Guide - Notion Bookmark Sync Extension

## 🚀 Quick Start Testing

### Step 1: Environment Setup

Create a `.env` file in the project root:

```env
# Required for basic functionality
VITE_NOTION_CLIENT_ID=your_notion_client_id
VITE_NOTION_CLIENT_SECRET=your_notion_client_secret

# Optional for AI features (extension works without these)
VITE_OPENAI_API_KEY=your_openai_api_key
```

### Step 2: Build the Extension

```bash
npm run build
```

### Step 3: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist` folder from your project

### Step 4: Get Extension ID

After loading the extension:
1. Copy the Extension ID from the Chrome extensions page
2. Note this ID - you'll need it for Notion integration setup

### Step 5: Notion Integration Setup

1. Go to [Notion Developer Portal](https://www.notion.so/my-integrations)
2. Create a new integration
3. Set the redirect URI to: `chrome-extension://YOUR_EXTENSION_ID/callback`
4. Copy the Client ID and Client Secret to your `.env` file

## 🧪 Testing Scenarios

### Scenario 1: OAuth Flow Testing

**Prerequisites:** Notion credentials configured

1. Click the extension popup
2. Click "Connect to Notion"
3. Authorize the extension in Notion
4. Verify connection status shows "Connected"

**Expected Results:**
- OAuth flow completes successfully
- Token is stored in Chrome storage
- Popup shows connected status

**Common Issues:**
- "User didn't approve access" → User cancelled authorization
- "Invalid redirect URI" → Extension ID mismatch in Notion settings

### Scenario 2: Bookmark Sync Testing

**Prerequisites:** Successfully connected to Notion

1. Navigate to any webpage
2. Click extension popup
3. Click "Sync Current Page"
4. Check your Notion workspace for the new bookmark

**Expected Results:**
- Page is saved to Notion database
- Title, URL, and extracted content are included
- AI tags and summary (if OpenAI key provided)

### Scenario 3: AI Features Testing

**Prerequisites:** OpenAI API key configured

1. Sync a bookmark with rich content
2. Verify AI-generated tags appear
3. Check that content summary is generated

**Expected Results:**
- Intelligent tags based on content
- Concise summary of page content
- Graceful fallback if AI unavailable

### Scenario 4: Graceful Degradation

**Prerequisites:** No OpenAI API key

1. Sync bookmarks without AI configuration
2. Verify extension still works
3. Check that manual tags are used instead

**Expected Results:**
- Extension functions normally
- Basic tags from keywords/domain
- No AI-related errors

## 🔍 Debugging

### Check Extension Logs

1. Go to `chrome://extensions/`
2. Click "Details" on your extension
3. Click "Inspect views: service worker"
4. Check Console for logs

### Check Storage

```javascript
// In extension console
chrome.storage.local.get(null, console.log);
```

### Common Log Messages

- `🔧 Configuration loaded` - Config is working
- `🔗 OAuth Redirect URI:` - OAuth flow started
- `✅ Token exchange successful` - OAuth completed
- `📄 Extracting content from:` - Content extraction started
- `🔖 Creating bookmark in Notion` - Notion API call

## 🐛 Troubleshooting

### Connection Issues

**Problem:** "Notion credentials not configured"
**Solution:** Verify `.env` file has correct VITE_NOTION_CLIENT_ID and VITE_NOTION_CLIENT_SECRET

**Problem:** "Invalid redirect URI"
**Solution:** Update Notion integration settings with correct extension ID

### Content Extraction Issues

**Problem:** Empty content extracted
**Solution:** Try on different websites; some sites block content extraction

**Problem:** Script execution failed
**Solution:** Some sites have strict CSP; this is expected behavior

### AI Features Issues

**Problem:** No AI tags generated
**Solution:** Verify OpenAI API key is configured and valid

**Problem:** AI API rate limit
**Solution:** AI features will gracefully fallback to basic tags

## 📊 Testing Checklist

- [ ] Extension builds without errors
- [ ] Extension loads in Chrome
- [ ] OAuth flow completes successfully
- [ ] Bookmark sync works for various websites
- [ ] AI features work when configured
- [ ] Extension works without AI features
- [ ] Error messages are user-friendly
- [ ] Extension popup is responsive
- [ ] Settings page is accessible

## 🔧 Advanced Testing

### Test Different Website Types

1. **Static websites** - Basic HTML content
2. **Dynamic websites** - JavaScript-heavy sites
3. **Social media** - Complex layouts
4. **News sites** - Rich metadata
5. **Documentation** - Technical content

### Test Edge Cases

1. **No internet connection**
2. **Notion API temporarily down**
3. **OpenAI API rate limits**
4. **Very long page content**
5. **Pages with no metadata**

### Performance Testing

1. **Large content pages** - Verify extraction limits work
2. **Multiple rapid syncs** - Check for race conditions
3. **Background sync** - Test automatic bookmark creation

## 📈 Success Metrics

- OAuth success rate > 95%
- Content extraction success rate > 90%
- AI feature availability when configured > 95%
- User-friendly error messages for all failure cases
- Extension performance < 2 seconds for typical operations
