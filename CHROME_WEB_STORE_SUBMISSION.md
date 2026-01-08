# Chrome Web Store Submission Guide

> **Consolidated documentation for Chrome Web Store submission, rejections, and fixes**

---

## 📋 Current Status

**Extension ID:** `khffaaemphidjmhokafmiilkcjpgiije`  
**Latest Version:** 1.0.2  
**Status:** Pending Configuration → Ready for Resubmission  

---

## 🚨 Rejection History

### Rejection #1: Purple Potassium (Dec 29, 2025)

**Issue:** Requesting but not using `notifications` permission

**Fix:**
- Removed `notifications` from manifest.json
- Removed dead code containing `chrome.notifications` API calls
- Updated to v1.0.1

---

### Rejection #2: Red Potassium (Dec 29, 2025)

**Issue:** Authentication Error - `Invalid redirect_uri`

**Root Cause:**
- Extension ID: `khffaaemphidjmhokafmiilkcjpgiije`
- Generated redirect_uri: `chrome-extension://khffaaemphidjmhokafmiilkcjpgiije/callback`
- This redirect_uri was NOT registered in Notion OAuth app
- Result: Notion rejected OAuth requests

**Fixes Applied (v1.0.2):**
1. Code Changes:
   - Updated version to 1.0.2
   - Removed unnecessary `host_permissions`: `["https://api.notion.com/*", "https://*.vercel.app/*"]` → `[]`
   - Reason: Extension only uses service worker fetch (no permissions needed)

2. Configuration Required (Manual):
   - Add redirect_uri to Notion OAuth app
   - Set `ALLOWED_EXTENSION_ID` in Vercel
   - Build extension with production `.env`

---

## ⚡ Quick Resubmission Steps (30 mins)

### Step 1: Update Notion OAuth App (5 mins) ⚠️ CRITICAL

```
1. Go to: https://www.notion.so/my-integrations
2. Select your OAuth integration
3. Add redirect URI: chrome-extension://khffaaemphidjmhokafmiilkcjpgiije/callback
4. Save changes
```

### Step 2: Update Vercel Server (10 mins) ⚠️ CRITICAL

```bash
# In Vercel Dashboard → Server → Environment Variables
ALLOWED_EXTENSION_ID=khffaaemphidjmhokafmiilkcjpgiije
NOTION_CLIENT_ID=<your-notion-client-id>
NOTION_CLIENT_SECRET=<your-notion-client-secret>

# Redeploy
cd packages/server && vercel --prod
```

### Step 3: Build Extension (15 mins) ⚠️ CRITICAL

```bash
cd packages/extension

# Create .env from template
cp ENV_TEMPLATE_PRODUCTION.txt .env
nano .env  # Set YOUR production Vercel URL!

# Build
pnpm build

# Verify NO localhost
grep -r "localhost" dist/ | grep -v ".map"
# ^^^ MUST BE EMPTY

# Package
cd dist && zip -r ../bookmark-assistant-v1.0.2.zip .
```

### Step 4: Upload (5 mins)

```
1. Go to: https://chrome.google.com/webstore/devconsole
2. Upload: packages/extension/bookmark-assistant-v1.0.2.zip
3. Version notes: "Fixed OAuth configuration (Red Potassium)"
4. Reference: Routing ID FZSL, Violations Purple + Red Potassium
5. Submit for review
```

---

## ✅ Pre-Upload Checklist

- [ ] Notion OAuth redirect URI registered
- [ ] Server `ALLOWED_EXTENSION_ID` set correctly
- [ ] Server redeployed
- [ ] Extension `.env` configured with production URL
- [ ] Extension built with NO localhost: `grep -r "localhost" dist/`
- [ ] Version is 1.0.2 in manifest
- [ ] `host_permissions` is `[]`
- [ ] Package created: `bookmark-assistant-v1.0.2.zip`

---

## 🐛 Technical Details

### OAuth Flow

**Extension generates redirect_uri:**
```javascript
// packages/extension/src/background/oauth.ts
const redirectUri = chrome.identity.getRedirectURL('callback');
// Result: chrome-extension://khffaaemphidjmhokafmiilkcjpgiije/callback
```

**Server CORS configuration:**
```javascript
// packages/server/src/config/index.ts
allowedOrigins: [
  `chrome-extension://${process.env.ALLOWED_EXTENSION_ID}`,
  // ...
]
```

**Extension API client:**
```javascript
// packages/extension/src/background/server-api.ts
this.baseUrl = import.meta.env.VITE_OAUTH_SERVER_URL || 'http://localhost:3333';
```

### Issues Found & Fixed

1. **Unused Permissions (v1.0.1)**
   - Removed: `notifications` permission
   - Removed: Dead code with `chrome.notifications` API

2. **OAuth redirect_uri Not Registered (v1.0.2)**
   - Must register in Notion OAuth app manually

3. **Broad host_permissions (v1.0.2)**
   - Before: `["https://api.notion.com/*", "https://*.vercel.app/*"]`
   - After: `[]`
   - Reason: Service worker doesn't need host_permissions

4. **Potential localhost in Production**
   - Risk: If `VITE_OAUTH_SERVER_URL` not set
   - Fix: Created `ENV_TEMPLATE_PRODUCTION.txt` + verification

---

## 🧪 Testing

### Test in Fresh Chrome Profile

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir=/tmp/chrome-test

# Test:
# 1. Load extension
# 2. Click "Connect to Notion"
# 3. Should redirect to Notion OAuth (no errors)
# 4. After auth, should show "Connected"
# 5. Test sync functionality
```

### Verify Configuration

```bash
# Check console logs (Service Worker DevTools)
# Should show:
✅ Extension ID: khffaaemphidjmhokafmiilkcjpgiije
✅ Redirect URI: chrome-extension://khffaaemphidjmhokafmiilkcjpgiije/callback
✅ Server URL: https://your-server.vercel.app (NOT localhost)
```

---

## 🆘 Troubleshooting

### "Invalid redirect_uri"

**Check:**
- Notion OAuth app has EXACT redirect URI registered
- Redirect URI is saved and active (green checkmark)

### CORS Errors

**Check:**
- Vercel env: `ALLOWED_EXTENSION_ID=khffaaemphidjmhokafmiilkcjpgiije`
- Server redeployed after env var update

### Connects to localhost

**Check:**
- `.env` file exists in `packages/extension/`
- `VITE_OAUTH_SERVER_URL` set to production URL
- Rebuild: `rm -rf dist/ && pnpm build`
- Verify: `grep -r "localhost" dist/` is EMPTY

---

## 📊 Submission History

| Version | Date | Status | Violation | Fix |
|---------|------|--------|-----------|-----|
| 1.0.0 | Dec 26 | ❌ Rejected | Purple Potassium | Removed notifications permission |
| 1.0.1 | Dec 29 | ❌ Rejected | Red Potassium | OAuth configuration |
| 1.0.2 | Dec 29 | 🟡 Pending | - | Ready for resubmission |

---

## 📚 Related Files

**Production Build:**
- `packages/extension/ENV_TEMPLATE_PRODUCTION.txt` - Environment template
- `packages/extension/public/manifest.json` - Extension manifest

**Server Configuration:**
- `packages/server/src/config/index.ts` - CORS and env config
- `packages/server/src/routes/oauth.ts` - OAuth exchange endpoint

**Extension OAuth:**
- `packages/extension/src/background/oauth.ts` - OAuth flow
- `packages/extension/src/background/server-api.ts` - API client

---

**Routing ID:** FZSL  
**Confidence:** 95% will be approved after configuration steps  
**ETA:** Can resubmit within 1 hour after manual config

