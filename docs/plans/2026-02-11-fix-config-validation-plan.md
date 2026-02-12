---
title: Fix Config Validation Bug - Remove Yearly References
type: fix
date: 2026-02-11
---

# Production Hardening: Config Validation Bug Fix

## Overview

Fix critical configuration validation bug - remove yearly price ID references since only monthly and lifetime plans exist.

## Problem Statement

The server configuration validation checks for `PADDLE_PRO_YEARLY_PRICE_ID` but the code uses `PADDLE_PRO_LIFETIME_PRICE_ID`. Since there's no yearly plan (only monthly and lifetime), this creates a validation mismatch that could cause production issues.

**Current state:**
- Config uses: `PADDLE_PRO_LIFETIME_PRICE_ID` (line 105)
- Validation checks: `PADDLE_PRO_YEARLY_PRICE_ID` (line 125) - WRONG

## Proposed Solution

### Fix Validation to Use Correct Price IDs

Change line 125 in `packages/server/src/config/index.ts` from `'PADDLE_PRO_YEARLY_PRICE_ID'` to `'PADDLE_PRO_LIFETIME_PRICE_ID'`:

```typescript
// Before (incorrect)
const paddleVars = [
  'PADDLE_API_KEY',
  'PADDLE_WEBHOOK_SECRET',
  'PADDLE_PRO_MONTHLY_PRICE_ID',
  'PADDLE_PRO_YEARLY_PRICE_ID',  // ❌ Wrong - doesn't exist
];

// After (correct)
const paddleVars = [
  'PADDLE_API_KEY',
  'PADDLE_WEBHOOK_SECRET',
  'PADDLE_PRO_MONTHLY_PRICE_ID',
  'PADDLE_PRO_LIFETIME_PRICE_ID',  // ✅ Correct
];
```

## Technical Details

- **File**: `packages/server/src/config/index.ts`
- **Line**: 125
- **Impact**: Validation warns about missing yearly price ID which isn't used
- **Risk**: Low - straightforward string fix

## Acceptance Criteria

- [x] Change validation from `PADDLE_PRO_YEARLY_PRICE_ID` to `PADDLE_PRO_LIFETIME_PRICE_ID`
- [x] Verify TypeScript compiles: `pnpm -F server build`
- [x] Verify config validation works: `pnpm dev:server`

## Context

- Monthly and lifetime are the only active plans
- Yearly was replaced by lifetime (as noted in comment on line 105: "// Previously YEARLY")

## Implementation

### Edit packages/server/src/config/index.ts

```typescript
// Line ~121-126
const paddleVars = [
  'PADDLE_API_KEY',
  'PADDLE_WEBHOOK_SECRET',
  'PADDLE_PRO_MONTHLY_PRICE_ID',
  'PADDLE_PRO_LIFETIME_PRICE_ID', // Fixed: was YEARLY
];
```

### Verify

```bash
# Build server
pnpm -F server build

# Test validation
pnpm dev:server
```

Should see "Configuration validated successfully" in output.
