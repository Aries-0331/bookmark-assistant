# Build Configuration Fixes

## Problem

When building the extension for production (`pnpm build:prod`), the built files contained `localhost:3333` URLs instead of production URLs, which would cause the extension to fail for Chrome Web Store users.

## Root Cause

The `.env.local` file contained `VITE_OAUTH_SERVER_URL=http://localhost:3333`, and Vite loads `.env.local` in **ALL modes** (development AND production), which overrode the production URL from `.env`.

## Solution

### 1. **Fixed `.env.local`**
Removed `VITE_OAUTH_SERVER_URL` from `.env.local` to let production builds use the URL from `.env`:

```env
# .env.local - Development only
VITE_DEBUG_MODE=true
VITE_APP_NAME=Bookmark Assistant
VITE_APP_VERSION=1.0.4
# Note: Server URLs are in .env file
```

### 2. **Production Configuration (`.env`)**
Production URLs are in `.env`:

```env
# .env - Production Configuration
VITE_OAUTH_SERVER_URL=http://bookmark-assistant-server.vercel.app
VITE_NOTION_CLIENT_ID=257d872b-594c-805a-9f58-0037c0162612
VITE_DEBUG_MODE=false
VITE_APP_VERSION=1.0.4
VITE_WEBSITE_URL=https://bookmark-assistant.vercel.app/
VITE_SUPPORT_EMAIL=aries0331.dev@gmail.com
VITE_FAQ_URL=https://bookmark-assistant.vercel.app/#faq
VITE_PRIVACY_URL=https://bookmark-assistant.notion.site/Privacy-Policy-2a24fd51dd3e806eb918cb2f37fefda7
VITE_TERMS_URL=https://www.notion.so/bookmark-assistant/Terms-of-Service-2a24fd51dd3e80258c2df46cab36d400
```

### 3. **Updated Fallback URLs**
Changed fallback URLs in source code from `localhost` to production URLs:

- `src/lib/paddle.ts`
- `src/background/server-api.ts`
- `src/background/config.ts`

## Build Commands

### Development Build (uses `.env.local`)
```bash
pnpm dev
pnpm build
```

### Production Build (ignores `.env.local` for URLs, uses `.env`)
```bash
pnpm build:prod
# or
NODE_ENV=production pnpm build
```

## Verification

After `pnpm build:prod`:

```bash
# Should return 0 (no localhost)
grep -r "localhost" dist/

# Should return > 0 (production URL present)
grep -r "bookmark-assistant-server.vercel.app" dist/
```

## Files Modified

1. `packages/extension/.env.local` - Removed VITE_OAUTH_SERVER_URL
2. `packages/extension/.env` - Added support URLs
3. `packages/extension/src/lib/paddle.ts` - Updated fallback URL
4. `packages/extension/src/background/server-api.ts` - Updated fallback URL
5. `packages/extension/src/background/config.ts` - Updated fallback URL

## Result

✅ Extension now builds with production URLs
✅ No localhost references in production build
✅ Chrome Web Store ready!

---

**Date:** December 26, 2025
**Version:** 1.0.4
