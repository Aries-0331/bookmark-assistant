# 🚀 Deployment Guide

Quick guide to deploy Bookmark Assistant to production.

## Prerequisites

- [ ] Vercel account created
- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Paddle production account set up
- [ ] Notion OAuth integration created
- [ ] PostgreSQL database provisioned (Vercel Postgres or external)

---

## 🎯 Quick Deployment (Recommended)

Use the deployment script:

```bash
./scripts/deploy-vercel.sh
```

Choose option 5 for full deployment, or deploy components individually.

---

## 📋 Manual Deployment Steps

### Step 1: Prepare Environment Files

Create production `.env` files from examples:

```bash
# Server
cp packages/server/.env.example packages/server/.env
# Edit with production values

# Website  
cp packages/website/.env.example packages/website/.env.local
# Edit with production values

# Extension
cp packages/extension/.env.example packages/extension/.env
# Edit with production values (use Vercel URLs after deployment)
```

### Step 2: Deploy Server

```bash
cd packages/server

# First time: Link to Vercel project
vercel

# Production deployment
vercel --prod
```

**Note the deployment URL:** `https://bookmark-api-xxx.vercel.app`

### Step 3: Configure Server Environment on Vercel

Go to Vercel Dashboard → Your Server Project → Settings → Environment Variables

Add these variables:

```
NODE_ENV=production
JWT_SECRET=<generate-with: openssl rand -base64 32>
DATABASE_URL=postgresql://...
NOTION_CLIENT_ID=<from-notion-portal>
NOTION_CLIENT_SECRET=<from-notion-portal>
NOTION_API_VERSION=2025-09-03
PADDLE_API_KEY=live_xxx
PADDLE_ENVIRONMENT=production
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx
PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxx
PADDLE_PRO_YEARLY_PRICE_ID=pri_xxx
WEBSITE_URL=<will-update-after-website-deployment>
ALLOWED_EXTENSION_ID=<will-update-after-chrome-store-publish>
FREE_DAILY_LIMIT=100
FREE_INTERVAL_HOURS=24
PRO_DAILY_LIMIT=1000
PRO_INTERVAL_HOURS=6
```

Redeploy: `vercel --prod`

### Step 4: Update Third-Party Services

**Paddle Webhook:**
- Dashboard → Notifications → Webhook Destinations
- Add: `https://bookmark-api-xxx.vercel.app/webhooks/paddle`

**Notion OAuth:**
- Developer Portal → Your Integration → OAuth Settings
- Redirect URI: `https://bookmark-api-xxx.vercel.app/oauth/notion/callback`

### Step 5: Deploy Website

```bash
cd packages/website

# Update .env.local with server URL
echo "NEXT_PUBLIC_API_URL=https://bookmark-api-xxx.vercel.app" >> .env.local

# Deploy
vercel --prod
```

**Note the deployment URL:** `https://bookmark-website-xxx.vercel.app`

### Step 6: Update Server with Website URL

```bash
# Go to Vercel Dashboard → Server Project → Environment Variables
# Update WEBSITE_URL to: https://bookmark-website-xxx.vercel.app
# Redeploy server
cd packages/server
vercel --prod
```

### Step 7: Build Extension

```bash
cd packages/extension

# Update .env with production URLs
cat > .env << EOL
VITE_OAUTH_SERVER_URL=https://bookmark-api-xxx.vercel.app
VITE_WEBSITE_URL=https://bookmark-website-xxx.vercel.app
VITE_NOTION_CLIENT_ID=<your-notion-client-id>
VITE_DEBUG_MODE=false
VITE_APP_NAME=Bookmark Assistant
VITE_APP_VERSION=0.1.0
EOL

# Note: Paddle checkout is handled server-side, no Paddle env vars needed

# Build
pnpm build

# Create ZIP
cd dist
zip -r ../bookmark-assistant-v0.1.0.zip . -x "*.DS_Store"
cd ..
```

### Step 8: Upload to Chrome Web Store

1. Go to Chrome Developer Dashboard
2. Create new item or update existing
3. Upload `bookmark-assistant-v0.1.0.zip`
4. Note the Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### Step 9: Update Server with Extension ID

```bash
# Go to Vercel Dashboard → Server Project → Environment Variables
# Add or update: ALLOWED_EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456
# Redeploy server
cd packages/server
vercel --prod
```

---

## ✅ Verification Checklist

After deployment, test these flows:

- [ ] Server health check: `curl https://your-api.vercel.app/health`
- [ ] Website loads correctly
- [ ] Extension OAuth flow works
- [ ] Manual sync works
- [ ] Payment checkout opens
- [ ] Webhook receives test event from Paddle
- [ ] Entitlements update after payment
- [ ] Auto-sync activates for Pro users

---

## 🔧 Troubleshooting

### Webhook Failures

```bash
# Check Vercel logs
vercel logs <your-server-project>

# Verify webhook secret matches
echo $PADDLE_WEBHOOK_SECRET

# Test webhook manually
curl -X POST https://your-api.vercel.app/webhooks/paddle \
  -H "Content-Type: application/json" \
  -d '{"event_type":"subscription.created"}'
```

### OAuth Redirect Errors

- Ensure Notion redirect URI **exactly** matches: `https://your-api.vercel.app/oauth/notion/callback`
- Check `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET` are correct
- Verify no trailing slashes in URLs

### Extension Can't Connect

- Open extension console (right-click extension icon → Inspect)
- Check `VITE_OAUTH_SERVER_URL` matches deployed API URL
- Verify CORS is enabled on server
- Check `ALLOWED_EXTENSION_ID` matches published extension ID

### Database Connection Errors

```bash
# Test connection locally
cd packages/server
vercel env pull
npx prisma db push
npx prisma studio
```

---

## 🔄 Update/Redeploy

### Update Server Code

```bash
cd packages/server
git pull
vercel --prod
```

### Update Website

```bash
cd packages/website
git pull
vercel --prod
```

### Update Extension

```bash
cd packages/extension
git pull
pnpm build
cd dist && zip -r ../bookmark-assistant-v0.1.1.zip . && cd ..
# Upload new version to Chrome Web Store
```

---

## 📊 Monitoring

### Vercel Logs

```bash
# Real-time logs
vercel logs <deployment-url> --follow

# Recent logs
vercel logs <deployment-url>
```

### Database Monitoring

```bash
# Check user count
cd packages/server
vercel env pull
npx prisma studio
# Or use SQL:
# SELECT COUNT(*) FROM "User";
# SELECT plan, COUNT(*) FROM "User" GROUP BY plan;
```

### Payment Monitoring

- Check Paddle Dashboard → Reports → Transactions
- Monitor webhook delivery in Paddle Dashboard → Notifications

---

## 🎯 Environment Variables Reference

### Server (Required)

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `JWT_SECRET` | `abc123...` | Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | `postgresql://...` | Vercel Postgres or external provider |
| `NOTION_CLIENT_ID` | `257d872b-...` | Notion Developer Portal |
| `NOTION_CLIENT_SECRET` | `secret_abc...` | Notion Developer Portal |
| `PADDLE_API_KEY` | `live_abc...` | Paddle Dashboard → Authentication |
| `PADDLE_WEBHOOK_SECRET` | `pdl_ntfset_...` | Paddle Dashboard → Notifications |
| `PADDLE_PRO_MONTHLY_PRICE_ID` | `pri_abc...` | Paddle Dashboard → Catalog |
| `PADDLE_PRO_YEARLY_PRICE_ID` | `pri_xyz...` | Paddle Dashboard → Catalog |
| `WEBSITE_URL` | `https://...vercel.app` | After website deployment |
| `ALLOWED_EXTENSION_ID` | `abcdef...` | After Chrome Store publish |

### Website (Required)

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | `live_abc...` | Paddle Dashboard |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | `production` | Hardcoded |
| `NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID` | `pri_abc...` | Paddle Dashboard |
| `NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID` | `pri_xyz...` | Paddle Dashboard |
| `NEXT_PUBLIC_API_URL` | `https://...vercel.app` | After server deployment |

### Extension (Required)

| Variable | Example | Where to Get |
|----------|---------|--------------||
| `VITE_OAUTH_SERVER_URL` | `https://...vercel.app` | After server deployment |
| `VITE_NOTION_CLIENT_ID` | `257d872b-...` | Same as server |
| `VITE_WEBSITE_URL` | `https://...vercel.app` | After website deployment |

**Note:** Extension uses server-side Paddle checkout. No Paddle environment variables needed.

---

## 🚀 Quick Commands

```bash
# Deploy everything
./scripts/deploy-vercel.sh

# Deploy server only
cd packages/server && vercel --prod

# Deploy website only
cd packages/website && vercel --prod

# Build extension
cd packages/extension && pnpm build

# Create extension ZIP
cd packages/extension/dist && zip -r ../bookmark-assistant.zip .

# View logs
vercel logs <deployment-url>

# Pull env vars locally
cd packages/server && vercel env pull
```

---

**Need help?** Check:
- [Vercel Documentation](https://vercel.com/docs)
- [Paddle Integration Guide](./docs/PADDLE_INTEGRATION.md)
- [Testing Checklist](./docs/TESTING_CHECKLIST.md)
