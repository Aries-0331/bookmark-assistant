# Vercel Deployment Guide

## 🚀 Complete Guide to Deploy Bookmark Notion Sync Server to Vercel

### **Prerequisites**

Before starting, ensure you have:
- ✅ Vercel account (free tier works fine)
- ✅ GitHub account with your repository
- ✅ Notion integration app created
- ✅ Server builds successfully locally

### **Step 1: Prepare Server for Vercel**

#### **1.1 Create Vercel Configuration**

Create a `vercel.json` file in the server package:

```bash
cd packages/server
```

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["src/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "src/index.ts": {
      "maxDuration": 30
    }
  }
}
```

#### **1.2 Update Server Package.json**

Ensure your `packages/server/package.json` has the correct build script:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "vercel-build": "tsc"
  }
}
```

#### **1.3 Create Environment Template**

Create `packages/server/.env.example`:

```bash
# Notion OAuth Configuration
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=https://your-app.vercel.app/auth/callback

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_min_256_bits

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=chrome-extension://your-extension-id,https://your-domain.com
```

### **Step 2: Install Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Or use with npx (no installation needed)
# npx vercel
```

### **Step 3: Deploy to Vercel**

#### **3.1 Login to Vercel**

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

#### **3.2 Initialize Vercel Project**

Navigate to your server directory:

```bash
cd packages/server
```

Initialize the Vercel project:

```bash
vercel
```

Answer the prompts:
- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → `N` (for first deployment)
- **Project name** → `bookmark-notion-sync-server` (or your preferred name)
- **Directory** → `.` (current directory)
- **Override settings?** → `N`

#### **3.3 Configure Environment Variables**

After initial deployment, configure environment variables:

**Option A: Via Vercel CLI**

```bash
# Set each environment variable
vercel env add NOTION_CLIENT_ID
vercel env add NOTION_CLIENT_SECRET
vercel env add NOTION_REDIRECT_URI
vercel env add JWT_SECRET
vercel env add ALLOWED_ORIGINS
```

**Option B: Via Vercel Dashboard**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

```
NOTION_CLIENT_ID = your_notion_client_id
NOTION_CLIENT_SECRET = your_notion_client_secret  
NOTION_REDIRECT_URI = https://your-app.vercel.app/auth/callback
JWT_SECRET = your_super_secure_jwt_secret_min_256_bits
ALLOWED_ORIGINS = chrome-extension://your-extension-id
```

### **Step 4: Update Notion App Settings**

#### **4.1 Update Redirect URIs**

1. Go to [Notion Developer Console](https://www.notion.so/my-integrations)
2. Select your integration
3. Update **Redirect URIs** to include:
   ```
   https://your-app.vercel.app/auth/callback
   ```

#### **4.2 Update OAuth Domain**

Add your Vercel domain to allowed OAuth domains if required.

### **Step 5: Update Extension Configuration**

Update your extension's environment variables to point to the deployed server:

#### **5.1 Update Extension Environment**

In `packages/extension/.env.production`:

```bash
VITE_OAUTH_SERVER_URL=https://your-app.vercel.app
```

#### **5.2 Rebuild Extension**

```bash
cd packages/extension
npm run build:prod
```

### **Step 6: Test Deployment**

#### **6.1 Test Server Endpoints**

```bash
# Test health endpoint
curl https://your-app.vercel.app/health

# Expected response:
# {"status":"OK","timestamp":"2024-01-01T00:00:00.000Z"}
```

#### **6.2 Test OAuth Flow**

1. Load updated extension in Chrome
2. Try connecting to Notion
3. Verify OAuth redirect works correctly

### **Step 7: Set Up Continuous Deployment**

#### **7.1 Connect to GitHub**

1. Go to Vercel Dashboard → Your Project → Settings
2. Connect to your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Other
   - **Root Directory**: `packages/server`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### **7.2 Auto-Deploy on Push**

Once connected, Vercel will automatically deploy when you push to main branch.

### **Step 8: Custom Domain (Optional)**

#### **8.1 Add Custom Domain**

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

#### **8.2 Update Environment Variables**

Update `NOTION_REDIRECT_URI` and `ALLOWED_ORIGINS` to use custom domain.

### **Step 9: Monitoring and Logs**

#### **9.1 View Deployment Logs**

```bash
vercel logs https://your-app.vercel.app
```

#### **9.2 Monitor Function Performance**

Check Vercel Dashboard → Your Project → Functions for:
- Execution time
- Memory usage
- Error rates

### **Step 10: Production Checklist**

Before going live, verify:

- ✅ **Environment Variables**: All secrets properly set
- ✅ **CORS Configuration**: Extension domain allowed
- ✅ **JWT Secret**: Strong, unique secret (256+ bits)
- ✅ **Notion Integration**: Redirect URIs updated
- ✅ **Error Handling**: Proper error responses
- ✅ **Logging**: Audit logs working
- ✅ **Rate Limiting**: Protection against abuse
- ✅ **HTTPS**: All communications encrypted

### **Troubleshooting Common Issues**

#### **Issue: Build Fails on Vercel**

**Solution**: Check build logs and ensure:
```bash
# Verify build works locally
cd packages/server
npm run build

# Check TypeScript compilation
npx tsc --noEmit
```

#### **Issue: Environment Variables Not Found**

**Solution**: Redeploy after setting variables:
```bash
vercel --prod
```

#### **Issue: CORS Errors**

**Solution**: Update `ALLOWED_ORIGINS` with correct extension ID:
```bash
chrome-extension://abcdefghijklmnopqrstuvwxyz123456
```

#### **Issue: Notion OAuth Fails**

**Solution**: Verify redirect URI matches exactly:
```
Notion Console: https://your-app.vercel.app/auth/callback
Server ENV: https://your-app.vercel.app/auth/callback
```

### **Useful Commands**

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# View logs
vercel logs

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME

# Download build
vercel pull
```

### **Security Best Practices**

1. **JWT Secret**: Use a strong, random secret (256+ bits)
2. **Environment Variables**: Never commit secrets to Git
3. **CORS**: Restrict to specific origins only
4. **Rate Limiting**: Implement appropriate limits
5. **HTTPS**: Ensure all communication is encrypted
6. **Audit Logs**: Monitor for suspicious activity

### **Cost Optimization**

- **Hobby Plan**: Free tier includes 100GB bandwidth
- **Function Duration**: Optimize for faster execution
- **Cold Starts**: Use Vercel's edge functions if needed
- **Caching**: Implement appropriate caching strategies

### **Next Steps**

After successful deployment:
1. 🔄 Set up monitoring and alerts
2. 📊 Configure analytics
3. 🚀 Update extension store listing with new server URL
4. 📝 Document deployment process for team
5. 🔧 Set up staging environment

**Your server is now live on Vercel! 🎉**

Access your deployed server at: `https://your-app.vercel.app`
