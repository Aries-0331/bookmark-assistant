# 🎫 Paddle Payment Integration Setup Guide

This guide walks you through setting up Paddle Billing for the Bookmark Notion Sync project.

## 📋 Prerequisites

1. **Paddle Account**: Sign up at [https://sandbox-login.paddle.com/signup](https://sandbox-login.paddle.com/signup) for sandbox testing
2. **Database**: PostgreSQL database with updated schema (includes Paddle fields)
3. **Server**: Node.js backend running with Prisma

## 🚀 Quick Start

### Step 1: Create Paddle Sandbox Account

1. Go to [Paddle Sandbox Signup](https://sandbox-login.paddle.com/signup)
2. Complete registration and verify your email
3. Log in to the Paddle Dashboard

### Step 2: Create Products and Prices

1. Navigate to **Paddle Dashboard > Catalog > Products**
2. Click **"Create Product"**
3. Create a product called **"Bookmark Sync Pro"**
4. Add two prices:
   - **Monthly**: $9/month (or your preferred price)
   - **Yearly**: $72/year ($6/month, 33% savings)
5. Copy the Price IDs (they look like `pri_xxxxxxxxxxxxx`)

### Step 3: Get API Keys and Tokens

#### Server-Side API Key
1. Go to **Paddle Dashboard > Developer tools > Authentication**
2. Click **"Create API Key"**
3. Name it "Bookmark Sync Server"
4. Select permissions: `subscriptions:read`, `subscriptions:write`, `transactions:read`
5. Copy the API key (starts with `test_` for sandbox)

#### Client-Side Token
1. In the same **Authentication** page
2. Click **"Create Client-Side Token"**
3. Name it "Bookmark Sync Frontend"
4. Copy the token (starts with `test_` for sandbox)

#### Webhook Secret
1. Go to **Paddle Dashboard > Developer tools > Notifications**
2. Click **"Create Notification Destination"**
3. Enter your webhook URL:
   - Development: `https://your-ngrok-url.ngrok.io/webhooks/paddle`
   - Production: `https://your-production-domain.com/webhooks/paddle`
4. Subscribe to these events:
   - `subscription.created`
   - `subscription.activated`
   - `subscription.trialing`
   - `subscription.past_due`
   - `subscription.paused`
   - `subscription.canceled`
   - `subscription.resumed`
   - `subscription.updated`
   - `transaction.completed`
5. Copy the **Webhook Secret** (looks like `pdl_ntfset_xxxxxxxxxxxxx`)

### Step 4: Configure Environment Variables

#### Server (`packages/server/.env`)
```bash
# Paddle Configuration
PADDLE_API_KEY=test_xxxxxxxxxxxxx
PADDLE_ENVIRONMENT=sandbox
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxxxxxxxxxx
PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxxxxxxxxxx
PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxxxxxxxxxx
```

#### Extension (`packages/extension/.env`)
```bash
# Paddle Configuration
VITE_PADDLE_CLIENT_TOKEN=test_xxxxxxxxxxxxx
VITE_PADDLE_ENVIRONMENT=sandbox
VITE_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxxxxxxxxxx
VITE_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxxxxxxxxxx
```

#### Website (`packages/website/.env.local`)
```bash
# Paddle Configuration
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxxxxxxxxxxxx
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxxxxxxxxxx
NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxxxxxxxxxx
```

### Step 5: Update Database Schema

```bash
cd packages/server
pnpm prisma migrate deploy  # In production
# OR
pnpm prisma db push  # In development
```

### Step 6: Test Webhook Endpoint (Local Development)

1. Install ngrok: `brew install ngrok` (macOS) or download from [ngrok.com](https://ngrok.com)
2. Start your server: `pnpm dev` in `packages/server`
3. In another terminal, run: `ngrok http 3333`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update Paddle webhook destination with: `https://abc123.ngrok.io/webhooks/paddle`

### Step 7: Test Payment Flow

1. Start the extension dev server: `cd packages/extension && pnpm dev`
2. Load the extension in Chrome
3. Go to Options page > Billing section
4. Click **"Upgrade to Pro"**
5. Use Paddle test card:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date
   - **CVC**: `100`
   - **Email**: Your test email
   - **Country**: Any supported country

6. Complete checkout
7. Check server logs for webhook events
8. Verify user is upgraded in database:
   ```sql
   SELECT user_id, plan, subscription_status, paddle_subscription_id 
   FROM "User" 
   WHERE plan = 'pro';
   ```

## 🔍 Debugging

### Check Webhook Logs
1. Go to **Paddle Dashboard > Developer tools > Events & logs**
2. View recent webhook deliveries
3. Check response codes and payloads

### Check Server Logs
```bash
# In packages/server
tail -f logs/audit.log  # If you have file logging
# OR check console output
```

### Common Issues

#### 1. Webhook Not Received
- Ensure ngrok is running and URL is correct
- Check Paddle webhook settings include all required events
- Verify webhook secret matches `.env`

#### 2. Signature Verification Failed
- Ensure you're passing raw body to `paddle.webhooks.unmarshal()`
- Check webhook secret is correct
- Verify Paddle SDK is installed: `@paddle/paddle-node-sdk`

#### 3. User Not Updated
- Check `customData.userId` is being passed correctly in checkout
- Verify user exists in database with matching `user_id`
- Check Prisma schema has all required fields

#### 4. Checkout Won't Open
- Verify client-side token is set in frontend `.env`
- Check browser console for Paddle.js errors
- Ensure Paddle.js script loads successfully
- Verify price IDs are correct

## �� Testing Scenarios

### 1. New Subscription
1. Free user clicks "Upgrade to Pro"
2. Completes Paddle checkout
3. Webhook `subscription.created` fires
4. User's `plan` becomes `"pro"`
5. User's `subscriptionStatus` becomes `"active"` or `"trialing"`

### 2. Subscription Cancellation
1. Pro user cancels via Paddle portal
2. Webhook `subscription.canceled` fires
3. User's `plan` becomes `"free"`
4. User's `subscriptionStatus` becomes `"canceled"`

### 3. Payment Failure
1. Payment method expires or fails
2. Webhook `subscription.past_due` fires
3. User's `subscriptionStatus` becomes `"past_due"`
4. User keeps pro access (grace period)

## 🚀 Going to Production

### 1. Create Production Paddle Account
1. Sign up at [https://vendors.paddle.com/signup](https://vendors.paddle.com/signup)
2. Complete business verification (required for live payments)
3. Set up payout methods

### 2. Create Production Products
- Same process as sandbox, but in production account
- Note: Production price IDs will be different

### 3. Update Environment Variables
```bash
# Change to production values
PADDLE_API_KEY=live_xxxxxxxxxxxxx
PADDLE_ENVIRONMENT=production
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production
# ... etc
```

### 4. Update Webhook URL
- Point to your production domain
- Use HTTPS (required by Paddle)
- Example: `https://api.yourdomain.com/webhooks/paddle`

### 5. Test with Real Card
- Use a real payment method
- Verify webhooks work in production
- Check customer portal links

## 📖 Additional Resources

- [Paddle Billing Docs](https://developer.paddle.com/)
- [Paddle Sandbox](https://sandbox-vendors.paddle.com/)
- [Paddle Node.js SDK](https://github.com/PaddleHQ/paddle-node-sdk)
- [Webhook Reference](https://developer.paddle.com/webhooks/overview)

## 🛟 Support

If you encounter issues:
1. Check Paddle Dashboard > Events & logs
2. Review server logs for webhook errors
3. Verify all environment variables are set
4. Test with Paddle's webhook simulator
5. Contact Paddle support for payment issues

---

**Note**: Always test thoroughly in sandbox before going to production!
