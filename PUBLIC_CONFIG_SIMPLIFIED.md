# Public Config API - Simplified & Dynamic

## Summary of Changes

✅ **Simplified the public-config API** to remove currency complexity while making it fully dynamic via environment variables.

## What Changed

### ❌ Removed
- `currency` field (always USD, matches Paddle)
- Hardcoded values in server endpoint
- Regional pricing complexity

### ✅ Added
- Environment variable configuration
- Dynamic pricing from `.env`
- Validation on server startup
- Better documentation

## New Configuration

### Server Environment Variables

```bash
# packages/server/.env

# Pricing (must match Paddle prices)
PRICING_MONTHLY=10                  # USD per month
PRICING_YEARLY_DISCOUNT=0.4         # 40% off annual

# Limits
FREE_DAILY_LIMIT=50
FREE_INTERVAL_HOURS=12
PRO_DAILY_LIMIT=1000
PRO_INTERVAL_HOURS=0.5
```

### API Response

**Before:**
```json
{
  "pricing": {
    "currency": "USD",
    "monthly": 10,
    "yearlyDiscount": 0.4
  }
}
```

**After:**
```json
{
  "pricing": {
    "monthly": 10,
    "yearlyDiscount": 0.4
  }
}
```

## Benefits

1. **Dynamic Pricing**
   - Change prices via environment variables
   - No code deployment needed
   - Different prices for dev/staging/prod

2. **Simplified**
   - No currency handling (always USD)
   - Removed regional pricing code
   - Single source of truth in `.env`

3. **Validated**
   - Server checks config on startup
   - Warns about invalid values
   - Ensures pricing > 0 and discount 0-1

4. **Cached**
   - 6-hour cache in extension
   - ETag support for 304 responses
   - Fallback to hardcoded defaults

## How to Use

### Update Pricing

1. **Edit `.env`**
   ```bash
   PRICING_MONTHLY=12  # Changed from 10
   ```

2. **Restart server**
   ```bash
   pnpm dev:server
   ```

3. **Verify**
   ```bash
   curl http://localhost:3333/v1/public-config
   ```

4. **Extension auto-updates** (within 6 hours)

### Keep Paddle in Sync

⚠️ **Important:** When changing pricing, update both:

1. **Paddle Dashboard** → Set actual prices
2. **Server .env** → Match display prices

Example:
```bash
# Paddle: $12/month, $72/year (50% off)
# Server .env:
PRICING_MONTHLY=12
PRICING_YEARLY_DISCOUNT=0.5  # 50% off $144 = $72
```

## Files Modified

### Backend
- ✅ `packages/server/src/config/index.ts` - Added pricing/limits config
- ✅ `packages/server/src/routes/index.ts` - Made endpoint dynamic
- ✅ `packages/server/.env.example` - Added new variables

### Frontend  
- ✅ `packages/extension/src/utils/config.ts` - Removed currency
- ✅ `packages/extension/src/options/store.ts` - Updated types

### Documentation
- ✅ `docs/PRICING_CONFIGURATION.md` - Comprehensive guide
- ✅ `docs/PUBLIC_CONFIG_ANALYSIS.md` - Analysis and rationale

## Validation

Server validates on startup:

```bash
✅ All pricing variables set correctly
⚠️  Missing pricing configuration: PRICING_MONTHLY. Using defaults.
⚠️  PRICING_MONTHLY should be > 0 (current: 0)
⚠️  PRICING_YEARLY_DISCOUNT should be between 0 and 1 (current: 1.2)
```

## Testing

```bash
# Test API
curl http://localhost:3333/v1/public-config | jq

# Expected:
{
  "pricing": {
    "monthly": 10,
    "yearlyDiscount": 0.4
  },
  "limits": {
    "free": { "dailyLimit": 50, "minIntervalHours": 12 },
    "pro": { "dailyLimit": 1000, "minIntervalHours": 0.5 }
  }
}
```

## Migration Notes

**For existing deployments:**

1. Add new environment variables to `.env`
2. Restart server
3. No extension changes needed
4. Existing cache will expire naturally

**No breaking changes** - defaults ensure backward compatibility!

## Next Steps

1. ✅ Add env variables to your `.env` file
2. ✅ Restart server to load new config
3. ✅ Verify API returns dynamic values
4. ✅ Keep Paddle prices in sync
5. ✅ Document pricing changes

## See Also

- [PRICING_CONFIGURATION.md](docs/PRICING_CONFIGURATION.md) - Detailed configuration guide
- [PUBLIC_CONFIG_ANALYSIS.md](docs/PUBLIC_CONFIG_ANALYSIS.md) - Why we kept this API
- [PADDLE_SETUP.md](docs/PADDLE_SETUP.md) - Paddle integration setup

---

**Status:** ✅ Complete
**Breaking Changes:** None
**Action Required:** Add environment variables (optional, has defaults)
