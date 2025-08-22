# Troubleshooting Guide

## 🔧 Common Issues and Solutions

### 1. "Notion database not configured" Error

**Problem**: Extension shows error when trying to sync bookmarks.

**Solution**:
1. Go to Extension Options (Settings)
2. Complete the database setup process:
   - Create a database in Notion with required properties
   - Get the database ID from the URL
   - Enter it in the extension settings

**Required Database Properties**:
- `Title` (Title) - Bookmark title
- `URL` (URL) - Bookmark URL  
- `Tags` (Multi-select) - AI-generated tags
- `Summary` (Text) - AI-generated summary
- `Created` (Date) - When bookmark was added
- `BookmarkId` (Text) - Internal ID

---

### 2. "Failed to execute 'fetch'" Error

**Problem**: Network-related errors when processing bookmarks.

**Symptoms**:
- TypeError: Failed to execute 'fetch'
- Illegal invocation errors

**Solutions**:
1. **Check Internet Connection**: Ensure stable internet connection
2. **Disable VPN/Proxy**: Some VPNs can interfere with extension requests
3. **Update Extension**: Reload the extension in Chrome
4. **Clear Storage**: Go to extension options and disconnect/reconnect

---

### 3. OAuth Authentication Issues

**Problem**: Can't connect to Notion or authentication fails.

**Solutions**:
1. **Check Redirect URI**: Ensure your Notion integration has the correct redirect URI
2. **Clear Browser Cache**: Clear cookies and site data for Notion
3. **Disable Ad Blockers**: Temporarily disable ad blockers during setup
4. **Use Incognito Mode**: Try connecting in an incognito window

**Correct Redirect URI Format**:
```
https://YOUR_EXTENSION_ID.chromiumapp.org/
```

---

### 4. Content Extraction Failures

**Problem**: Bookmarks sync but with minimal content.

**Symptoms**:
- Generic titles like "hostname.com/path"
- Missing descriptions or content
- No AI-generated tags

**Solutions**:
1. **Open Target Pages**: Visit the bookmarked pages in browser tabs
2. **Check Page Accessibility**: Some sites block content extraction
3. **Wait for Page Load**: Ensure pages fully load before syncing
4. **Try Individual Sync**: Use single bookmark sync instead of bulk

---

### 5. AI Features Not Working

**Problem**: No AI-generated tags or summaries.

**Possible Causes**:
- OpenAI API key not configured
- API quota exceeded
- Network issues

**Solutions**:
1. **Check API Configuration**: Verify OpenAI API key in environment
2. **Fallback Mode**: Extension will use simple tag extraction
3. **Review API Limits**: Check OpenAI usage limits
4. **Manual Configuration**: Set up `.env` file with API credentials

---

### 6. Extension Performance Issues

**Problem**: Slow syncing or browser becomes unresponsive.

**Solutions**:
1. **Reduce Batch Size**: Extension processes 5 bookmarks at a time
2. **Close Unnecessary Tabs**: Free up browser memory
3. **Sync in Smaller Groups**: Use folder-based syncing (future feature)
4. **Check Browser Resources**: Monitor CPU and memory usage

---

### 7. Database Access Denied

**Problem**: "Access denied" errors when writing to Notion.

**Solutions**:
1. **Share Database**: Ensure the database is shared with your integration
2. **Check Permissions**: Verify integration has write access
3. **Database Location**: Make sure database is in a page accessible to the integration
4. **Reconnect Integration**: Disconnect and reconnect to refresh permissions

---

### 8. Bookmark Duplicates

**Problem**: Same bookmarks appearing multiple times in Notion.

**Solutions**:
1. **Check BookmarkId**: Each bookmark has a unique ID to prevent duplicates
2. **Database Cleanup**: Remove duplicate entries manually
3. **Fresh Sync**: Clear sync history and perform fresh sync
4. **Contact Support**: Report if duplicates persist

---

## 🐛 Debug Information

### Enable Debug Mode
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for extension logs starting with 🔖, 📄, 🤖, etc.

### Useful Console Commands
```javascript
// Check extension storage
chrome.storage.local.get(null, console.log)

// Clear all extension data
chrome.storage.local.clear()

// Check last sync results
chrome.storage.local.get(['last_sync_results'], console.log)
```

### Log Patterns
- 🔖 = Bookmark processing
- 📄 = Content extraction  
- 🤖 = AI processing
- ✅ = Success
- ⚠️ = Warning
- ❌ = Error

---

## 📞 Getting Help

If issues persist:

1. **Check Console Logs**: Copy any error messages from browser console
2. **Note Extension Version**: Check extension version in Chrome settings
3. **Describe Steps**: Document exact steps that cause the issue
4. **Include Environment**: Browser version, OS, network setup

### Common Error Codes
- `NOTION_AUTH_FAILED`: Authentication issue
- `DATABASE_NOT_CONFIGURED`: Database setup required
- `CONTENT_EXTRACTION_FAILED`: Page content couldn't be extracted
- `API_RATE_LIMITED`: Too many requests, wait and retry

---

## ✅ Best Practices

1. **Setup Order**: Connect to Notion first, then configure database
2. **Small Batches**: Start with a few bookmarks to test setup
3. **Stable Network**: Use reliable internet connection for bulk syncs
4. **Regular Backups**: Export bookmarks before major changes
5. **Update Regularly**: Keep extension updated for bug fixes
