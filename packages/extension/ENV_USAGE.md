# Environment Variables Usage Guide

## 📁 Environment Files

### `.env` - Production Settings
- **Purpose**: Production configuration
- **Tracked by Git**: Yes
- **Used for**: Chrome Web Store builds, production deployments
- **Example**:
  ```
  VITE_OAUTH_SERVER_URL=http://bookmark-assistant-server.vercel.app
  VITE_DEBUG_MODE=false
  VITE_APP_VERSION=1.0.7
  ```

### `.env.local` - Development Settings
- **Purpose**: Local development overrides
- **Tracked by Git**: No (in .gitignore)
- **Used for**: Local development only
- **Example**:
  ```
  VITE_OAUTH_SERVER_URL=http://localhost:3333
  VITE_DEBUG_MODE=true
  VITE_APP_VERSION=1.0.7
  ```

## 🔄 Vite Environment Precedence

Vite loads environment variables in this order (later overrides earlier):

1. `.env` - Base configuration
2. `.env.local` - Local overrides ← **Development uses this**
3. `.env.production` - Production overrides
4. `.env.[mode]` - Mode-specific (e.g., `.env.development`)

## 🏗️ Build Commands

### Development Build
```bash
# Uses .env.local (overrides .env)
pnpm build:dev
# or
pnpm dev
```

### Production Build
```bash
# Uses .env only (no .env.local in production)
pnpm build:prod
# or use build script (defaults to production)
pnpm build
```

### Chrome Web Store Release Build
```bash
# ⭐ RECOMMENDED for publishing
# Automatically:
# 1. Backs up .env.local
# 2. Builds with production config
# 3. Creates publish-ready zip file
# 4. Restores .env.local
pnpm build:zip

# Output: bookmark-assistant-v{version}.zip
# Ready to upload directly to Chrome Web Store!
```

## 📋 Version Management

All version numbers should be kept in sync:

| File | Version Field | Purpose |
|------|--------------|---------|
| `manifest.json` | `version` | Chrome Web Store |
| `package.json` | `version` | npm/package |
| `.env` | `VITE_APP_VERSION` | Build metadata |
| `.env.local` | `VITE_APP_VERSION` | Dev override |

### Update Version
1. Update `manifest.json` (Chrome Web Store uses this)
2. Update `package.json` (keep in sync)
3. Update `.env` VITE_APP_VERSION
4. (Optional) Update `.env.local` VITE_APP_VERSION
5. Rebuild extension

## 🚀 Deployment Workflow

### Local Development
```bash
# .env.local is automatically used
pnpm dev  # Uses localhost:3333
pnpm build:dev # Uses localhost for dev build
```

### Production Deployment
```bash
# Standard production build
pnpm build:prod
# Uses production server URLs

# Chrome Web Store Release (RECOMMENDED)
pnpm build:zip
# Creates bookmark-assistant-v{version}.zip
# Upload this zip directly to Chrome Web Store!

# Deploy server to Vercel
vercel --prod
```

## ⚙️ Configuration Matrix

| Setting | `.env` (Production) | `.env.local` (Development) |
|---------|---------------------|---------------------------|
| OAuth Server | Production URL | localhost:3333 |
| Debug Mode | false | true |
| Website URL | Production site | localhost |
| Support URLs | Production links | Same as prod |
| Version | 1.0.7 | 1.0.7 |

## 🔐 Sensitive Data

- **OK in `.env`**: Public URLs, non-sensitive config
- **NEVER in `.env`**: API keys, secrets (use Vercel env vars)
- **`.env.local`**: Safe for local overrides

## 📝 Best Practices

1. **Always use `.env.local` for local development**
2. **Never commit `.env.local` to git**
3. **Keep `.env` as production baseline**
4. **Sync version numbers across all files**
5. **Use production URLs in `.env`**
6. **Test production build before deploying**

## 🔍 Troubleshooting

### Issue: Build uses localhost instead of production
**Solution**: Use `pnpm build:zip` instead of `pnpm build`
- This automatically backs up `.env.local` before building
- Ensures production URLs are embedded in the build
- Creates a ready-to-upload zip file

### Issue: Version mismatch
**Solution**: Manually sync version numbers across all files

### Issue: Environment variables not loading
**Solution**:
1. Check file names (`.env`, not `env`)
2. Ensure variables start with `VITE_`
3. Restart dev server after changes

### Issue: Need to manually zip files for Chrome Web Store
**Solution**: Use `pnpm build:zip`
- Automatically creates `bookmark-assistant-v{version}.zip`
- Only includes necessary files
- Ready to upload directly to Chrome Web Store
