# Environment Variables Setup Guide

## 🔧 Complete Environment Variables Configuration for Dev & Production

### **Overview**

After deploying your server to Vercel, you need to configure environment variables for:

1. **Vercel Server** (Production & Preview)
2. **Local Development Server**
3. **Chrome Extension** (Development & Production builds)

---

## **Part 1: Vercel Server Environment Variables**

### **🚀 Production Environment (Vercel)**

#### **Method 1: Via Vercel Dashboard (Recommended)**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `bookmark-notion-sync-server` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable with these values:

| Variable Name          | Value                                                   | Environment         |
| ---------------------- | ------------------------------------------------------- | ------------------- |
| `NOTION_CLIENT_ID`     | `257d872b-594c-805a-9f58-0037c0162612`                  | Production, Preview |
| `NOTION_CLIENT_SECRET` | `secret_DZsSv4r9K0r8PB7jIw7COcdYoeM0Z0b48KnnTgFMA6k`    | Production, Preview |
| `NOTION_REDIRECT_URI`  | `https://your-app.vercel.app/auth/callback`             | Production          |
| `NOTION_REDIRECT_URI`  | `https://your-app-git-preview.vercel.app/auth/callback` | Preview             |
| `JWT_SECRET`           | `your_256_bit_random_secret_here`                       | Production, Preview |
| `ALLOWED_ORIGINS`      | `chrome-extension://your-extension-id`                  | Production, Preview |
| `NODE_ENV`             | `production`                                            | Production          |
| `NODE_ENV`             | `development`                                           | Preview             |

#### **Method 2: Via Vercel CLI**

```bash
cd packages/server

# Production environment
vercel env add NOTION_CLIENT_ID production
# Enter: 257d872b-594c-805a-9f58-0037c0162612

vercel env add NOTION_CLIENT_SECRET production
# Enter: secret_DZsSv4r9K0r8PB7jIw7COcdYoeM0Z0b48KnnTgFMA6k

vercel env add NOTION_REDIRECT_URI production
# Enter: https://your-app.vercel.app/auth/callback

vercel env add JWT_SECRET production
# Enter: your_256_bit_random_secret

vercel env add ALLOWED_ORIGINS production
# Enter: chrome-extension://your-extension-id

# Preview environment (for testing)
vercel env add NOTION_REDIRECT_URI preview
# Enter: https://your-app-git-main.vercel.app/auth/callback
```

### **🔑 Generate JWT Secret**

```bash
# Generate a secure JWT secret
openssl rand -base64 32
# Use this output as your JWT_SECRET
```

---

## **Part 2: Local Development Server**

### **📝 Create Server Environment File**

Create `packages/server/.env`:

```bash
cd packages/server
cp .env.example .env
```

Edit `packages/server/.env`:

```bash
# Notion OAuth Configuration
NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612
NOTION_CLIENT_SECRET=secret_DZsSv4r9K0r8PB7jIw7COcdYoeM0Z0b48KnnTgFMA6k
NOTION_REDIRECT_URI=http://localhost:3001/auth/callback

# JWT Configuration
JWT_SECRET=your_local_jwt_secret_256_bits

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=chrome-extension://your-extension-id,http://localhost:3000
```

---

## **Part 3: Chrome Extension Environment Variables**

### **🔧 Development Environment**

Your current `.env.development` needs updates:

```bash
# Development Environment Variables
# For local development with local server

# OAuth Server Configuration
VITE_OAUTH_SERVER_URL=http://localhost:3001

# Notion Integration (Extension-side)
VITE_NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612
VITE_NOTION_REDIRECT_URI=https://jkhnkokaididilhegkiogbedlmejdfhj.chromiumapp.org/callback

# AI Services (OpenAI)
VITE_OPENAI_API_KEY=sk-your_actual_openai_api_key_here
VITE_OPENAI_MODEL=gpt-3.5-turbo
VITE_OPENAI_MAX_TOKENS=150

# Extension Configuration
VITE_APP_NAME=Bookmark Notion Sync
VITE_APP_VERSION=0.1.0
VITE_DEBUG_MODE=true

# Content Extraction Settings
VITE_MAX_CONTENT_LENGTH=5000
VITE_EXTRACTION_TIMEOUT=10000

# Sync Settings
VITE_AUTO_SYNC_ENABLED=true
VITE_BATCH_SIZE=10
VITE_SYNC_DELAY=1000
```

### **🚀 Production Environment**

Create/update `packages/extension/.env.production`:

```bash
# Production Environment Variables
# For production extension with Vercel server

# OAuth Server Configuration
VITE_OAUTH_SERVER_URL=https://your-app.vercel.app

# Notion Integration (Extension-side)
VITE_NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612
VITE_NOTION_REDIRECT_URI=https://jkhnkokaididilhegkiogbedlmejdfhj.chromiumapp.org/callback

# AI Services (OpenAI)
VITE_OPENAI_API_KEY=sk-your_actual_openai_api_key_here
VITE_OPENAI_MODEL=gpt-3.5-turbo
VITE_OPENAI_MAX_TOKENS=150

# Extension Configuration
VITE_APP_NAME=Bookmark Notion Sync
VITE_APP_VERSION=1.0.0
VITE_DEBUG_MODE=false

# Content Extraction Settings
VITE_MAX_CONTENT_LENGTH=5000
VITE_EXTRACTION_TIMEOUT=10000

# Sync Settings
VITE_AUTO_SYNC_ENABLED=true
VITE_BATCH_SIZE=10
VITE_SYNC_DELAY=1000
```

---

## **Part 4: Update Notion Integration Settings**

### **🔄 Update Notion App Configuration**

1. Go to [Notion Developer Console](https://www.notion.so/my-integrations)
2. Select your integration
3. Update **Redirect URIs** to include:

   ```
   # For Production
   https://your-app.vercel.app/auth/callback

   # For Development
   http://localhost:3001/auth/callback

   # Keep existing extension redirect
   https://jkhnkokaididilhegkiogbedlmejdfhj.chromiumapp.org/callback
   ```

---

## **Part 5: Get Your Chrome Extension ID**

### **📋 Find Extension ID**

1. Build and load your extension in Chrome:

   ```bash
   cd packages/extension
   npm run build
   ```

2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → Select `packages/extension/dist`
5. Copy the extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### **🔄 Update Environment Variables with Real Extension ID**

Update all `ALLOWED_ORIGINS` and extension configs with your real extension ID.

---

## **Part 6: Environment-Specific Configuration**

### **🏠 Development Workflow**

```bash
# 1. Start local server
cd packages/server
npm run dev

# 2. Start extension development
cd packages/extension
npm run dev

# 3. Load extension in Chrome
# Use localhost:3001 as server URL
```

### **🚀 Production Workflow**

```bash
# 1. Build production extension
cd packages/extension
npm run build:prod

# 2. Load extension in Chrome
# Extension will use https://your-app.vercel.app
```

---

## **Part 7: Security Considerations**

### **🔒 Environment Variables Security**

| Variable               | Security Level | Notes                          |
| ---------------------- | -------------- | ------------------------------ |
| `NOTION_CLIENT_SECRET` | **CRITICAL**   | Never expose in extension      |
| `JWT_SECRET`           | **CRITICAL**   | Server-only, 256+ bits         |
| `NOTION_CLIENT_ID`     | **Public**     | Safe to use in extension       |
| `OPENAI_API_KEY`       | **CRITICAL**   | Extension-only, secure storage |

### **✅ Best Practices**

1. **Different secrets** for dev/prod environments
2. **Rotate secrets** regularly
3. **Monitor usage** in Vercel dashboard
4. **Use HTTPS** everywhere in production
5. **Restrict CORS** to specific origins only

---

## **Part 8: Testing Configuration**

### **🧪 Test Development Setup**

```bash
# Test local server
curl http://localhost:3001/health

# Test extension connection
# Should connect to localhost:3001
```

### **🚀 Test Production Setup**

```bash
# Test Vercel deployment
curl https://your-app.vercel.app/health

# Test extension connection
# Should connect to Vercel URL
```

---

## **Part 9: Troubleshooting Common Issues**

### **❌ CORS Errors**

- Check `ALLOWED_ORIGINS` includes correct extension ID
- Verify no typos in extension ID

### **❌ OAuth Redirect Errors**

- Ensure Notion app has correct redirect URIs
- Check `NOTION_REDIRECT_URI` matches exactly

### **❌ Environment Variables Not Found**

- Redeploy after setting variables: `vercel --prod`
- Check environment is set correctly (Production vs Preview)

### **❌ JWT Errors**

- Ensure `JWT_SECRET` is 256+ bits
- Use different secrets for dev/prod

---

## **Part 10: Quick Setup Commands**

### **🚀 Complete Setup Script**

```bash
# 1. Set up server environment
cd packages/server
cp .env.example .env
# Edit .env with your values

# 2. Set up Vercel environment variables
vercel env add NOTION_CLIENT_ID
vercel env add NOTION_CLIENT_SECRET
vercel env add NOTION_REDIRECT_URI
vercel env add JWT_SECRET
vercel env add ALLOWED_ORIGINS

# 3. Deploy with new environment
vercel --prod

# 4. Build production extension
cd ../extension
npm run build:prod

# 5. Test everything
curl https://your-app.vercel.app/health
```

**Your environment is now properly configured for both development and production! 🎉**

Replace `your-app.vercel.app` with your actual Vercel URL and `your-extension-id` with your real Chrome extension ID.
