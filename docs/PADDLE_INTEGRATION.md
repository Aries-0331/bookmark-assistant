# Paddle Payment Integration

## Overview

The project uses Paddle Billing for Pro subscription payments. This document consolidates setup and configuration information.

## Current Implementation

### Pricing
- **Monthly**: $5/month
- **Yearly**: $42/year (30% discount)
- Currency: USD only
- Environment variables control pricing (see Configuration)

### Plan Features
| Feature | Free | Pro ($5/mo) |
|---------|------|-------------|
| Manual Sync | ✅ | ✅ |
| Auto-Sync | ❌ | ✅ |
| Sync Interval | 24h min | 6h min |
| AI Features | ❌ | ✅ (Roadmap) |

## Configuration

### Environment Variables

**Server** (`packages/server/.env`):
```bash
# Paddle API
PADDLE_API_KEY=test_xxxxx
PADDLE_ENVIRONMENT=sandbox
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxx
PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxx
PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxx

# Pricing (must match Paddle prices)
PRICE_MONTHLY_USD=5
DISCOUNT_YEARLY=0.3

# Limits
FREE_INTERVAL_HOURS=24
```

**Extension** (`packages/extension/.env`):
```bash
VITE_PADDLE_CLIENT_TOKEN=test_xxxxx
VITE_PADDLE_ENVIRONMENT=sandbox
```

## Quick Start Testing

1. **Setup Paddle Sandbox**
   - Create account: https://sandbox-login.paddle.com/signup
   - Create product "Bookmark Sync Pro"
   - Create monthly and yearly prices
   - Copy Price IDs to .env

2. **Configure Webhooks**
   ```bash
   # Start server
   pnpm dev:server
   
   # Start ngrok
   ngrok http 3333
   
   # Add webhook in Paddle dashboard:
   # URL: https://your-ngrok-url.ngrok.io/api/paddle/webhooks/paddle
   # Events: All subscription events
   ```

3. **Test Checkout**
   - Load extension
   - Navigate to Billing section
   - Click "Upgrade to Pro"
   - Use test card: 4242 4242 4242 4242

## Webhook Events

Handled events:
- `subscription.created`
- `subscription.activated`
- `subscription.canceled`
- `subscription.updated`
- `transaction.completed`

See `packages/server/src/routes/paddle.ts` for implementation.

## Testing Checklist

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for comprehensive testing steps.

## Architecture

### Frontend-First Checkout
- Extension/Website calls `Paddle.Checkout.open()` directly
- No backend "create checkout" endpoint needed
- Custom data includes `userId` for user linking
- Webhooks update database after payment

### Security
- ✅ Webhook signature verification
- ✅ API key kept server-side only
- ✅ Client token safe in browser
- ✅ User reconciliation via email

## References

- Paddle Docs: https://developer.paddle.com/
- Sandbox Dashboard: https://sandbox-vendors.paddle.com/
- Test Cards: https://developer.paddle.com/concepts/payment-methods/credit-debit-card
