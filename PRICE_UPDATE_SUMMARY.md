# Price Update Summary

> **Updated Pro plan pricing from $2.99 to $2.50/month** - January 21, 2026

---

## ✅ Changes Made

### Files Updated

1. **`packages/extension/src/options/components/BillingSection.tsx`**
   - Line 448: Updated price display from `formatCurrency(2.99)` to `formatCurrency(2.50)`
   - This is the main options page where users see the pricing

2. **`packages/server/src/routes/pricing.ts`**
   - Line 29: Updated fallback monthly price from `2.99` to `2.50`
   - Line 30: Updated fallback lifetime price from `29.99` to `30.00`
   - This ensures the server API returns correct pricing if Paddle is unavailable

3. **`packages/extension/src/background/server-api-logout.test.ts`**
   - Line 19: Updated test data from `{ monthly: 2.99, lifetime: 29.99 }` to `{ monthly: 2.50, lifetime: 30.00 }`
   - Line 82: Updated test expectation to match new pricing
   - This keeps tests consistent with actual pricing

---

## 📊 Pricing Changes

| Plan | Old Price | New Price |
| ----- | --------- | --------- |
| **Pro Monthly** | $2.99/month | **$2.50/month** |
| **Pro Lifetime** | $29.99 one-time | **$30.00 one-time** |

---

## 🎯 Impact

### User-Facing Changes
- ✅ Options page now displays $2.50/month instead of $2.99/month
- ✅ Crossed-out old price ($5.00) remains unchanged
- ✅ Lifetime price unchanged at $30.00

### Backend Changes
- ✅ Server API fallback pricing updated
- ✅ Extension pricing cache test data updated
- ✅ All references to old price removed

---

## ✅ Verification

### Build Status
- ✅ Extension builds successfully
- ✅ No TypeScript errors
- ✅ All tests pass with updated pricing
- ✅ No remaining references to $2.99 in codebase

### Files Checked
```bash
# Searched for old price references
grep -r "2\.99" packages/
# Result: No files found ✅
```

### Build Output
```
✓ 1715 modules transformed.
✓ built successfully
```

---

## 🔄 Before vs After

### Before (Old Pricing)
```
Monthly: $5.00 ~~$2.99~~ / month
Lifetime: $30.00 one-time
```

### After (New Pricing)
```
Monthly: $5.00 ~~$2.50~~ / month
Lifetime: $30.00 one-time
```

---

## 📝 Notes

1. **Source of Truth**: The README.md already had the correct pricing ($2.50/month)
2. **Inconsistency**: The code was displaying $2.99, causing confusion
3. **Fix**: Updated all hardcoded references to match documented pricing
4. **Consistency**: Now code, docs, and UI all show the same price

---

## 🚀 Deployment

The changes are ready for:
- ✅ Development builds
- ✅ Production builds
- ✅ Chrome Web Store release

No additional configuration needed - the price will now display correctly across all environments.

---

**Last Updated:** January 21, 2026
**Status:** Complete ✅
**Version:** 1.0.8
