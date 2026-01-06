# Paddle Environment Configuration

To enable payment functionality on the website, you need to configure Paddle environment variables.

## Required Environment Variables

Create a `.env.local` file in `packages/website/` with the following:

```bash
# Paddle Payment Configuration
# Get these from Paddle Dashboard: https://dashboard.paddle.com

# Client Token (Required for payments)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=paddle_live_xxxxxxxxxxxxxxxxxxxxx

# Environment: 'sandbox' or 'production'
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox

# Price IDs (Get from Paddle Dashboard → Products)
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxxxxx
NEXT_PUBLIC_PADDLE_PRO_LIFETIME_PRICE_ID=pri_xxxxxxxx

# Server URL (for webhooks)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Where to Find Values

### Paddle Dashboard
1. Go to: https://dashboard.paddle.com
2. Navigate to **Developer Tools** → **Authentication**
3. Copy your **Client-side token**

### Product Price IDs
1. Go to **Products** in Paddle Dashboard
2. Click on your Pro Monthly product → Copy the Price ID
3. Click on your Pro Lifetime product → Copy the Price ID

## Current Status

**Development Mode:**
- Console shows Paddle initialization logs
- Helpful for debugging

**Production Mode:**
- No console errors
- Clean user experience
- Payments section shows but won't function without credentials

## Note

The website works perfectly fine without Paddle configured:
- All other features work normally
- Pricing section displays but upgrade buttons won't work
- No console errors in production

