# Pricing & Limits Configuration

## Overview

The pricing and limits are now **environment-driven** and served dynamically through the `/v1/public-config` API endpoint. This allows you to change pricing and limits without deploying new code.

## Configuration

### Server (.env)

```bash
# Pricing & Limits Configuration
# Keep these values in sync with your Paddle pricing
PRICING_MONTHLY=10  # USD per month
PRICING_YEARLY_DISCOUNT=0.4  # 40% off annual (10*12*0.6 = $72/year)
FREE_DAILY_LIMIT=50
FREE_INTERVAL_HOURS=12
PRO_DAILY_LIMIT=1000
PRO_INTERVAL_HOURS=0.5
```

### How It Works

```
┌─────────────────────────────────────────────────┐
│  1. Server reads from environment variables     │
│     config.pricing.monthly = PRICING_MONTHLY    │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  2. API endpoint returns dynamic config         │
│     GET /v1/public-config                       │
│     { pricing: { monthly: 10, ... }, ... }      │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  3. Extension fetches and caches (6 hours)      │
│     store.publicConfig = { ... }                │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  4. UI components use cached values             │
│     BillingSection shows prices                 │
│     SyncSettings enforces limits                │
└─────────────────────────────────────────────────┘
```

## API Response

### Endpoint
```
GET /v1/public-config
```

### Response
```json
{
  "pricing": {
    "monthly": 10,
    "yearlyDiscount": 0.4
  },
  "limits": {
    "free": {
      "dailyLimit": 50,
      "minIntervalHours": 12
    },
    "pro": {
      "dailyLimit": 1000,
      "minIntervalHours": 0.5
    }
  }
}
```

### Caching
- **ETag**: Returns 304 Not Modified if unchanged
- **Cache-Control**: `public, max-age=300` (5 minutes)
- **Extension Cache**: 6 hours in chrome.storage

## Pricing Configuration

### Monthly Pricing
```bash
PRICING_MONTHLY=10  # USD per month
```

**Calculated yearly cost:**
```
Annual without discount: $10 × 12 = $120
Annual with 40% discount: $120 × (1 - 0.4) = $72
Monthly equivalent: $72 ÷ 12 = $6/month
```

### Yearly Discount
```bash
PRICING_YEARLY_DISCOUNT=0.4  # 40% off
```

**Discount format:**
- Use decimal: `0.4` for 40% off
- Range: `0.0` (no discount) to `0.99` (99% off)
- Display: "Save 40%" in UI

### Important: Keep In Sync With Paddle

⚠️ **Manual Sync Required:**

When you change pricing, update **both**:

1. **Paddle Dashboard** → Catalog → Prices
   - Monthly price: $10/month
   - Yearly price: $72/year (or $6/month billed annually)

2. **Server .env** → `PRICING_MONTHLY` and `PRICING_YEARLY_DISCOUNT`
   - Set to match Paddle prices
   - Extension will fetch these values

**Why separate?**
- Paddle controls actual payment processing
- Config controls UI display
- They must match for consistency

## Limits Configuration

### Free Tier
```bash
FREE_DAILY_LIMIT=50          # Bookmarks per day
FREE_INTERVAL_HOURS=12       # Minimum sync interval
```

**Purpose:**
- Rate limiting for free users
- Prevent abuse
- Encourage upgrades

### Pro Tier
```bash
PRO_DAILY_LIMIT=1000         # Bookmarks per day
PRO_INTERVAL_HOURS=0.5       # 30 minutes minimum
```

**Purpose:**
- Higher limits for paying users
- Better UX for Pro members
- Value proposition for upgrade

## Changing Configuration

### Step 1: Update Environment Variables

```bash
# packages/server/.env
PRICING_MONTHLY=12  # Changed from 10
PRICING_YEARLY_DISCOUNT=0.5  # Changed from 0.4 (50% off)
```

### Step 2: Restart Server

```bash
cd packages/server
pnpm dev
# or in production:
pm2 restart server
```

### Step 3: Verify API Response

```bash
curl http://localhost:3333/v1/public-config | jq
```

Expected:
```json
{
  "pricing": {
    "monthly": 12,
    "yearlyDiscount": 0.5
  }
}
```

### Step 4: Extension Auto-Updates

- Extension fetches config on startup
- Cache expires after 6 hours
- Users see new pricing automatically

### Step 5: Update Paddle (if needed)

If you changed pricing:
1. Go to Paddle Dashboard → Catalog
2. Update or create new prices
3. Update `PADDLE_PRO_MONTHLY_PRICE_ID` and `PADDLE_PRO_YEARLY_PRICE_ID`

## Validation

The server validates configuration on startup:

```bash
⚠️  Missing pricing configuration: PRICING_MONTHLY. Using defaults.
⚠️  PRICING_MONTHLY should be > 0 (current: 0)
⚠️  PRICING_YEARLY_DISCOUNT should be between 0 and 1 (current: 1.2)
```

**Fix these warnings by:**
1. Setting proper environment variables
2. Restarting server
3. Checking logs for validation success

## Fallback Behavior

### If API Fails
Extension uses **hardcoded defaults**:
```typescript
PRICE_MONTHLY_USD = 10
DISCOUNT_YEARLY = 0.4
FREE_DAILY_LIMIT = 50
FREE_INTERVAL_HOURS = 12
PRO_MIN_INTERVAL_HOURS = 0.5
```

### Why Fallbacks?
- ✅ Extension works offline
- ✅ Graceful degradation
- ✅ No hard dependency on server

## Testing

### Test Different Environments

**Development:**
```bash
# packages/server/.env.development
PRICING_MONTHLY=1  # $1 for testing
PRICING_YEARLY_DISCOUNT=0.9  # 90% off
```

**Staging:**
```bash
# packages/server/.env.staging
PRICING_MONTHLY=5  # Half price for beta
PRICING_YEARLY_DISCOUNT=0.5
```

**Production:**
```bash
# packages/server/.env.production
PRICING_MONTHLY=10  # Full price
PRICING_YEARLY_DISCOUNT=0.4
```

### Verify Extension Receives Updates

```javascript
// In extension DevTools console
chrome.storage.local.get('public_config_cache', console.log);

// Force refresh
await useAppStore.getState().fetchPublicConfig();
```

## Best Practices

### 1. Always Sync With Paddle
```bash
# When creating Paddle prices, match them in config
Paddle: $10/month → PRICING_MONTHLY=10
Paddle: $72/year → PRICING_YEARLY_DISCOUNT=0.4 (40% off $120)
```

### 2. Document Changes
Keep a changelog when updating pricing:
```
2025-01-15: Increased monthly from $10 to $12
2025-02-01: Increased yearly discount from 40% to 50%
```

### 3. Test Before Production
```bash
# Test in sandbox first
PADDLE_ENVIRONMENT=sandbox
PRICING_MONTHLY=1

# Then production
PADDLE_ENVIRONMENT=production
PRICING_MONTHLY=10
```

### 4. Monitor API Response
```bash
# Watch for config changes
watch -n 60 'curl -s http://localhost:3333/v1/public-config | jq'
```

### 5. Cache Busting
If you need immediate updates:
- Users will see changes after 6-hour cache expires
- OR restart extension to force refresh
- OR clear chrome.storage manually

## Troubleshooting

### Pricing not updating in extension

**Check:**
1. Server config is correct: `echo $PRICING_MONTHLY`
2. API returns new values: `curl http://localhost:3333/v1/public-config`
3. Extension cache age: `chrome.storage.local.get('public_config_cache')`
4. Clear cache and reload extension

### Users see wrong prices

**Likely causes:**
- Extension cache not expired yet (wait 6 hours)
- Server not restarted after .env change
- Paddle prices don't match config

**Fix:**
1. Restart server
2. Verify API response
3. Wait for cache expiry or clear manually
4. Check Paddle Dashboard prices match

### Validation warnings

```
⚠️  PRICING_MONTHLY should be > 0 (current: 0)
```

**Fix:**
```bash
# Set in .env
PRICING_MONTHLY=10

# Restart
pnpm dev
```

## Summary

- ✅ **Dynamic**: Change prices without code deployment
- ✅ **Cached**: Efficient with 6-hour cache
- ✅ **Validated**: Server checks config on startup
- ✅ **Fallback**: Works offline with defaults
- ⚠️ **Manual Sync**: Must keep Paddle prices in sync

**Key Takeaway:** Update `.env` → Restart server → Wait 6 hours → Users see new pricing
