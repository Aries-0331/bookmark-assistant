# Environment Configuration Guide

## Overview

The server uses a multi-tier environment configuration to separate sensitive production data from safe defaults and development templates.

## File Structure

### 1. `.env.local` (NOT tracked in git)
**Purpose:** Local development with actual secrets
- Contains real API keys, secrets, and sensitive values
- Extension ID: `khffaaemphidjmhokafmiilkcjpgiije` ✅
- NEVER commit to git (already in .gitignore)
- Copy from `.env.example` and fill in your values

**Usage:**
```bash
# Copy template
cp .env.example .env.local

# Edit with your values
nano .env.local
```

### 2. `.env` (tracked in git)
**Purpose:** Safe defaults and configuration structure
- Contains non-sensitive defaults
- No secrets, API keys, or passwords
- Safe to commit to git
- Loaded for all environments

### 3. `.env.example` (tracked in git)
**Purpose:** Template for new developers
- Complete reference of all environment variables
- Helpful comments explaining each variable
- Instructions for obtaining API keys

## Environment Variable Precedence

Vite/Node loads environment variables in this order:

1. `.env` (loaded first, base values)
2. `.env.local` (loaded second, overrides .env)
3. `.env.development` / `.env.production` (environment-specific)
4. Process environment variables (from shell/deployment platform)

Later files override earlier ones.

## Production Deployment

### Vercel (or similar platforms)

Set these variables in your deployment platform dashboard:

**Required:**
- `ALLOWED_EXTENSION_ID=khffaaemphidjmhokafmiilkcjpgiije`
- `JWT_SECRET=your-secret`
- `NOTION_CLIENT_ID=your-id`
- `NOTION_CLIENT_SECRET=your-secret`
- `DATABASE_URL=your-connection-string`

**Optional:**
- Paddle payment variables
- Custom rate limits
- Description extraction tuning

Platform variables override `.env` files.

## Security Best Practices

1. ✅ **NEVER commit secrets to git**
   - `.env.local` is in `.gitignore`
   - `.env` contains only safe defaults

2. ✅ **Use `.env.local` for local development**
   - Real secrets stay on your machine
   - Safe to use for testing

3. ✅ **Verify deployment platform settings**
   - Check Vercel dashboard for correct values
   - Ensure extension ID matches published extension

4. ✅ **Rotate secrets regularly**
   - Update JWT_SECRET periodically
   - Rotate API keys if compromised

## Common Tasks

### Setting Up Local Development

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Fill in your actual values
#   - Get Notion credentials from: https://www.notion.so/my-integrations
#   - Get Chrome Extension ID from: chrome://extensions (for development)
#   - Get Paddle credentials from your Paddle Dashboard

# 3. Start the server
npm run dev
```

### Checking Extension ID

**Development:**
- Load unpacked extension in Chrome
- Go to: `chrome://extensions`
- Find your extension
- Copy the extension ID (32-character string)

**Production:**
- Published extension ID: `khffaaemphidjmhokafmiilkcjpgiije`
- Found in Chrome Web Store URL

### Verifying Configuration

```bash
# Check what the server thinks the extension ID is
npm run dev
# Look for: "Allowed Extension ID: ..."

# Test OAuth flow
# Extension → Notion → Server
```

## Troubleshooting

### "Invalid extension identity" Error

**Cause:** Extension ID mismatch between extension and server

**Solution:**
1. Verify extension ID in server: Check logs or dashboard
2. Update server environment: `ALLOWED_EXTENSION_ID=<correct-id>`
3. Redeploy server

### OAuth Redirect URI Mismatch

**Cause:** Wrong redirect URI configured

**Solution:**
- Extension uses: `chrome-extension://{extensionId}/callback`
- No server callback URL needed
- Notion OAuth uses Chrome Identity API

### "Missing required environment variables"

**Cause:** Required vars not set in `.env.local` or deployment platform

**Solution:**
1. Check `.env.example` for required variables
2. Ensure all `JWT_SECRET`, `NOTION_*`, etc. are set
3. Verify deployment platform has all required vars

## Migration from Old Setup

If you have the old `.env` with secrets:

```bash
# 1. Backup your secrets
cp .env .env.backup

# 2. Move secrets to .env.local
cp .env.example .env.local
# Edit .env.local and copy values from .env.backup

# 3. Verify .env.local is in .gitignore
cat .gitignore | grep env.local
# Should output: .env.local

# 4. Remove old .env
rm .env

# 5. Commit changes
git add .gitignore .env.example
git commit -m "Secure environment configuration"
```

## Summary

| File | Tracked | Contains | Purpose |
|------|---------|----------|---------|
| `.env.local` | ❌ | Secrets | Local development |
| `.env` | ✅ | Defaults | Shared configuration |
| `.env.example` | ✅ | Template | Developer onboarding |

**Key Point:** Sensitive values go in `.env.local` (never commit), safe defaults in `.env` (safe to commit).
