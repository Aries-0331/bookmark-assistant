---
title: Fix website pricing to fetch from backend API
type: fix
date: 2026-02-18
---

# Fix Website Pricing to Fetch from Backend API

## Overview

The website's pricing section displays hardcoded prices while the server already provides a pricing API. This creates a maintenance burden and potential pricing inconsistencies.

## Problem Statement

The website displays hardcoded pricing in `packages/website/components/sections/Pricing.tsx`:

```typescript
const pricing = {
  monthly: 2.5,
  lifetime: 30,
  currencySymbol: '$',
};
```

However, the server provides a `/api/pricing` endpoint that fetches live prices from Paddle with fallback values. The website is not using this endpoint, causing:
1. Hardcoded prices that may become outdated
2. Inconsistency between website and extension pricing
3. Manual updates required when pricing changes

## Proposed Solution

1. **Add API client function** in website to fetch pricing from `/api/pricing`
2. **Update Pricing.tsx** to fetch and display dynamic pricing
3. **Add loading/error states** for robust UX
4. **Consider adding pricing to extension** (optional, for consistency)

## Technical Approach

### Server API (Already Exists)

**Endpoint:** `GET /api/pricing`

**Response:**
```json
{
  "success": true,
  "pricing": {
    "monthly": 2.5,
    "lifetime": 30
  }
}
```

**Implementation:** `packages/server/src/routes/pricing.ts`

### Website Changes

1. **Create API client** - Add fetch function to call pricing endpoint
2. **Update Pricing component** - Use useEffect to fetch pricing on mount
3. **Handle loading state** - Show skeleton or placeholder while fetching
4. **Handle error state** - Fallback to hardcoded values if API fails

### Files to Modify

| File | Change |
|------|--------|
| `packages/website/components/sections/Pricing.tsx` | Fetch pricing from API, add loading states |

### Files to Create (if needed)

| File | Purpose |
|------|---------|
| `packages/website/lib/api.ts` | API client functions (if not exists) |

## Acceptance Criteria

- [x] Pricing section fetches from `/api/pricing` endpoint
- [x] Shows loading state while fetching
- [x] Falls back to hardcoded values if API fails
- [x] Price toggle between monthly/lifetime works correctly
- [x] Build passes without errors

## Context

### Server Pricing API

- **Route:** `packages/server/src/routes/pricing.ts`
- **Service:** `packages/server/src/services/paddlePricing.ts`
- **Caching:** 5-minute TTL with fallback to config values

### Current Hardcoded Values

- Monthly: $2.50/month
- Lifetime: $30 one-time
- Currency: USD

### Environment

- Website API URL: `NEXT_PUBLIC_API_URL` (defaults to localhost:3333)
- Server must be running for API calls to work
