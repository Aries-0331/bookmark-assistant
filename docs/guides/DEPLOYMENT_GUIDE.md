# 🚀 Server Deployment & Local Development Guide

## 🏠 **Local Development Setup**

### **1. Initial Setup**

```bash
# Navigate to server directory
cd /Users/aries/dev/bookmark-notion-sync/server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

### **2. Environment Configuration**

```bash
# .env file contents
NODE_ENV=development
PORT=3000

# Security
ALLOWED_EXTENSION_ID=jkhnkokaididilhegkiogbedlmejdfhj
JWT_SECRET=your_super_secure_jwt_secret_here

# Notion OAuth Credentials
NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612
NOTION_CLIENT_SECRET=secret_DZsSv4r9K0r8PB7jIw7COcdYoeM0Z0b48KnnTgFMA6k
```

### **3. Start Development Server**

```bash
# Start with auto-reload
npm run dev

# Or start without TypeScript compilation
npm start
```

### **4. Test Local Server**

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-13T...",
  "uptime": 123.456
}
```

## 🔧 **Local Debugging Guide**

### **1. Chrome Extension Setup**

```bash
# Update extension environment
# Edit .env.development in your extension root
VITE_OAUTH_SERVER_URL=http://localhost:3000
```

### **2. Test OAuth Flow Locally**

```bash
# 1. Build and load extension
cd /Users/aries/dev/bookmark-notion-sync
npm run build

# 2. Load extension in Chrome
# - Go to chrome://extensions/
# - Enable Developer mode
# - Click "Load unpacked"
# - Select the 'dist' folder

# 3. Test OAuth connection
# - Click extension icon
# - Click "Connect to Notion"
# - Watch server logs for OAuth flow
```

### **3. Server Logging & Debugging**

```typescript
// Enhanced logging in server
console.log(`[DEBUG] ${new Date().toISOString()} - OAuth request:`, req.body);

// View real-time logs
tail -f server.log

// Debug specific endpoints
curl -X POST http://localhost:3000/oauth/exchange \
  -H "Content-Type: application/json" \
  -H "X-Extension-ID: jkhnkokaididilhegkiogbedlmejdfhj" \
  -d '{"code":"test","redirectUri":"test","extensionUserId":"test"}'
```

### **4. Database Debugging**

```bash
# Check stored user data
GET http://localhost:3000/user/profile
Authorization: Bearer YOUR_JWT_TOKEN

# Test bookmark sync
POST http://localhost:3000/bookmarks/upsert
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "bookmarks": [{
    "title": "Test Bookmark",
    "url": "https://example.com",
    "description": "Test description",
    "path": "Test Folder"
  }]
}
```

## ☁️ **Production Deployment Options**

### **Option 1: Vercel (Recommended for simplicity)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from server directory
cd packages/server/
vercel

# Configure environment variables in Vercel dashboard
# - NOTION_CLIENT_ID
# - NOTION_CLIENT_SECRET
# - JWT_SECRET
# - ALLOWED_EXTENSION_ID
```

### **Option 2: Railway**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables
railway variables set NOTION_CLIENT_ID=your_client_id
railway variables set NOTION_CLIENT_SECRET=your_secret
railway variables set JWT_SECRET=your_jwt_secret
railway variables set ALLOWED_EXTENSION_ID=your_extension_id
```

### **Option 3: Heroku**

```bash
# Install Heroku CLI
# Create Heroku app
heroku create bookmark-notion-sync-server

# Set environment variables
heroku config:set NOTION_CLIENT_ID=your_client_id
heroku config:set NOTION_CLIENT_SECRET=your_secret
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set ALLOWED_EXTENSION_ID=your_extension_id

# Deploy
git push heroku main
```

### **Option 4: DigitalOcean App Platform**

```yaml
# .do/app.yaml
name: bookmark-notion-sync-server
services:
  - name: api
    source_dir: /server
    github:
      repo: your-username/bookmark-notion-sync
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: NOTION_CLIENT_ID
        value: your_client_id
      - key: NOTION_CLIENT_SECRET
        value: your_secret
        type: SECRET
      - key: JWT_SECRET
        value: your_jwt_secret
        type: SECRET
```

### **Option 5: AWS Lambda (Serverless)**

```bash
# Install Serverless Framework
npm install -g serverless

# Create serverless.yml
# Deploy
serverless deploy
```

## 🔒 **Production Security Checklist**

### **1. Environment Variables**

- ✅ `NOTION_CLIENT_SECRET` - Keep secret, never expose
- ✅ `JWT_SECRET` - Use crypto.randomBytes(64).toString('hex')
- ✅ `ALLOWED_EXTENSION_ID` - Your Chrome extension ID
- ✅ `NODE_ENV=production` - Disable debug logs

### **2. Security Headers**

```javascript
// Already configured in server
app.use(helmet()); // Security headers
app.use(cors({...})); // Strict CORS
app.use(rateLimit({...})); // Rate limiting
```

### **3. HTTPS & SSL**

```bash
# Most platforms provide HTTPS automatically
# For custom domains, configure SSL certificates
```

### **4. Database Security (Future)**

```bash
# When moving from in-memory to database
# Use encrypted connections
# Encrypt sensitive data at rest
# Regular backups
```

## 🧪 **Testing Your Deployment**

### **1. Health Check**

```bash
curl https://your-deployed-server.com/health
```

### **2. CORS Test**

```bash
# Should fail (good!)
curl -X POST https://your-server.com/oauth/exchange \
  -H "Origin: https://malicious-site.com"

# Should work
curl -X POST https://your-server.com/oauth/exchange \
  -H "Origin: chrome-extension://your-extension-id"
```

### **3. Extension Integration Test**

```bash
# Update extension config
VITE_OAUTH_SERVER_URL=https://your-deployed-server.com

# Build and test
npm run build
# Load in Chrome and test OAuth flow
```

## 📊 **Monitoring & Logs**

### **1. Server Logs**

```bash
# View logs (varies by platform)
vercel logs your-deployment-url
railway logs
heroku logs --tail
```

### **2. Performance Monitoring**

```javascript
// Add to server for basic monitoring
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    users: userStore.size,
    timestamp: new Date().toISOString(),
  });
});
```

### **3. Error Tracking**

```bash
# Consider adding Sentry or similar
npm install @sentry/node
```

## 🎯 **API Endpoints Summary**

| Endpoint              | Method | Purpose                | Auth         |
| --------------------- | ------ | ---------------------- | ------------ |
| `/health`             | GET    | Health check           | None         |
| `/oauth/exchange`     | POST   | Exchange OAuth code    | Extension ID |
| `/oauth/refresh`      | POST   | Refresh tokens         | JWT          |
| `/template/duplicate` | POST   | Create bookmark DB     | JWT          |
| `/bookmarks/sync`     | POST   | Sync bookmarks (batch) | JWT          |
| `/bookmarks/upsert`   | POST   | Smart upsert bookmarks | JWT          |
| `/notion/databases`   | GET    | List databases         | JWT          |
| `/user/profile`       | GET    | User status            | JWT          |

## 🎉 **Ready to Deploy!**

1. **Choose deployment platform** (Vercel recommended)
2. **Set environment variables** (client secret, JWT secret)
3. **Deploy server**
4. **Update extension config** with server URL
5. **Test complete OAuth flow**
6. **Monitor logs and performance**

Your server-first architecture is now production-ready! 🚀
