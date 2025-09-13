# 🚀 Quick Start: Test Your Server-First Architecture

## 🎯 **1. Start Local Server**

```bash
# Terminal 1: Start server
cd /Users/aries/dev/bookmark-notion-sync/server
npm install
cp .env.example .env

# Edit .env with your values:
# NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612
# NOTION_CLIENT_SECRET=secret_DZsSv4r9K0r8PB7jIw7COcdYoeM0Z0b48KnnTgFMA6k
# ALLOWED_EXTENSION_ID=jkhnkokaididilhegkiogbedlmejdfhj
# JWT_SECRET=your_crypto_random_secret_here

npm run dev
```

Expected output:

```
🔐 OAuth Server running on port 3000
🛡️ Allowed extension ID: jkhnkokaididilhegkiogbedlmejdfhj
🔧 Environment: development
```

## 🎯 **2. Build & Load Extension**

```bash
# Terminal 2: Build extension
cd /Users/aries/dev/bookmark-notion-sync
npm run build
```

**Load in Chrome:**

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder
5. Note your extension ID (should match .env)

## 🎯 **3. Test OAuth Flow**

1. **Click extension icon** → Open popup
2. **Click "Connect to Notion"** → OAuth flow starts
3. **Authorize in Notion** → Select template if available
4. **Check server logs** → Should see OAuth exchange

Expected server logs:

```
[AUDIT] 2025-01-13T... - oauth_exchange_start
[AUDIT] 2025-01-13T... - oauth_exchange_success
```

## 🎯 **4. Test Template Duplication**

```bash
# Test template duplication via server
curl -X POST http://localhost:3000/template/duplicate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"templateId": "2659466d-e76d-8071-b304-f2e6654873bd"}'
```

Expected response:

```json
{
  "success": true,
  "database": {
    "id": "new-database-id",
    "name": "📚 Chrome Bookmarks DB",
    "url": "https://notion.so/..."
  }
}
```

## 🎯 **5. Test Bookmark Sync**

1. **In extension popup** → Click "Sync All Bookmarks"
2. **Check server logs** → Should see batch processing
3. **Check Notion** → Bookmarks should appear in database

Expected server logs:

```
[AUDIT] 2025-01-13T... - bookmark_upsert_start
[AUDIT] 2025-01-13T... - bookmark_upsert_complete
```

## 🎯 **6. Test API Endpoints**

### Health Check

```bash
curl http://localhost:3000/health
```

### User Profile

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/user/profile
```

### List Databases

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/notion/databases
```

## 🎯 **7. Debug Common Issues**

### **CORS Error**

```
Error: Not allowed by CORS policy
```

**Fix:** Check `ALLOWED_EXTENSION_ID` in server `.env`

### **Extension ID Mismatch**

```
{ "error": "Forbidden", "message": "Invalid extension ID" }
```

**Fix:** Update extension ID in server `.env`

### **OAuth Exchange Failed**

```
{ "error": "OAuth Exchange Failed" }
```

**Fix:** Check Notion client ID/secret in server `.env`

### **Session Token Invalid**

```
{ "error": "Unauthorized", "message": "Invalid session token" }
```

**Fix:** Re-authenticate through extension

## 🎯 **8. Monitor Server Performance**

```bash
# Terminal 3: Monitor logs
tail -f server.log

# Check server metrics
curl http://localhost:3000/metrics
```

## 🎯 **9. Production Deployment Test**

### **Deploy to Vercel:**

```bash
cd packages/server/
npm install -g vercel
vercel

# Set environment variables in Vercel dashboard
# Update extension .env.development:
# VITE_OAUTH_SERVER_URL=https://your-deployment.vercel.app
```

### **Test production:**

```bash
npm run build
# Reload extension and test OAuth flow
```

## 🎯 **10. Key Benefits Achieved**

✅ **Security**: Client secrets never exposed in extension
✅ **Reliability**: Automatic token refresh and retry logic  
✅ **Performance**: Smart upsert prevents duplicates
✅ **User Experience**: One-click template duplication
✅ **Scalability**: Server handles all API rate limiting
✅ **Monitoring**: Complete audit logs and error tracking

## 🎉 **You're Ready!**

Your server-first architecture is now:

- **Locally testable**
- **Production deployable**
- **Secure and scalable**
- **User-friendly**

Next: Deploy to production and share with users! 🚀
