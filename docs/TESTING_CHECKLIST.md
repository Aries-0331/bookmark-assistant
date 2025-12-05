\*\*\*\*# 🧪 Paddle Integration Testing Checklist

## Overview

This checklist guides you through testing the Paddle payment integration for Bookmark Sync Pro subscriptions.

**Current Pricing**: $5/month or $42/year (30% discount)
**Test Environment**: Paddle Sandbox

## Pre-Testing Setup

### 1. Paddle Sandbox Account

- [ ] Created Paddle Sandbox account at https://sandbox-login.paddle.com/signup
- [ ] Email verified and logged in
- [ ] Dashboard accessible

### 2. Products & Prices Created

- [ ] Product "Bookmark Sync Pro" created
- [ ] Monthly price created ($5/month)
- [ ] Yearly price created ($42/year - 30% discount)
- [ ] Copied both Price IDs (pri_xxxxx)

### 3. API Credentials

- [ ] Server API Key created (test_xxxxx)
- [ ] Client-Side Token created (test_xxxxx)
- [ ] Webhook Secret obtained (pdl_ntfset_xxxxx)

### 4. Environment Variables Configured

#### Server (.env)

```bash
PADDLE_API_KEY=test_xxxxx
PADDLE_ENVIRONMENT=sandbox
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxx
PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxx
PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxx
```

#### Extension (.env)

```bash
VITE_PADDLE_CLIENT_TOKEN=test_xxxxx
VITE_PADDLE_ENVIRONMENT=sandbox
VITE_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxx
VITE_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxx
```

#### Website (.env.local)

```bash
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_xxxxx
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxx
NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxxxx
```

### 5. Webhook Setup

- [ ] ngrok installed (`brew install ngrok`)
- [ ] Server running (`pnpm dev` in packages/server)
- [ ] ngrok tunnel started (`ngrok http 3333`)
- [ ] Webhook destination created in Paddle Dashboard
- [ ] Webhook URL set to: `https://your-ngrok-url.ngrok.io/webhooks/paddle`
- [ ] All subscription events subscribed:
  - [ ] subscription.created
  - [ ] subscription.activated
  - [ ] subscription.trialing
  - [ ] subscription.**past_due**
  - [ ] subscription.paused
  - [ ] subscription.canceled
  - [ ] subscription.resumed
  - [ ] subscription.updated
  - [ ] transaction.completed

## Testing Phase 1: Extension Checkout

### Extension Setup

- [ ] Extension built (`pnpm build` in packages/extension)
- [ ] Extension loaded in Chrome
- [ ] User authenticated with Notion
- [ ] User ID stored in chrome.storage

### Checkout Flow

- [ ] Open Extension > Options > Billing
- [ ] See "Free" and "Pro" plans displayed
- [ ] Monthly/Yearly toggle works
- [ ] Prices update when toggling
- [ ] Click "Upgrade to Pro" button
- [ ] Paddle checkout opens in new window/overlay
- [ ] Checkout shows correct price
- [ ] Customer email can be entered

### Payment

- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter CVC: `100`
- [ ] Enter future expiry date
- [ ] Enter email address
- [ ] Complete checkout
- [ ] Success page shown
- [ ] Redirected back to extension

### Webhook Verification

- [ ] Check ngrok terminal for webhook POST request
- [ ] Check server logs for webhook events:
  - [ ] `PADDLE_WEBHOOK RECEIVED`
  - [ ] `PADDLE_WEBHOOK SUBSCRIPTION_CREATED`
- [ ] Check database for updated user:
  ```sql
  SELECT user_id, plan, subscription_status, paddle_subscription_id
  FROM "User"
  WHERE user_id = 'your-test-user-id';
  ```
- [ ] Verify `plan = 'pro'`
- [ ] Verify `subscription_status = 'active'` or `'trialing'`
- [ ] Verify `paddle_subscription_id` is populated

### Extension Updates

- [ ] Refresh extension options page
- [ ] See "Manage Plan" button (instead of "Upgrade")
- [ ] Pro features unlocked (if implemented)

## Testing Phase 2: Website Checkout

### Website Setup

- [ ] Website running (`pnpm dev` in packages/website)
- [ ] Navigate to pricing section

### Checkout Flow

- [ ] Monthly/Yearly toggle works
- [ ] Prices update correctly
- [ ] Click "Upgrade to Pro" button
- [ ] Paddle checkout opens
- [ ] Complete checkout with test card
- [ ] Success URL redirect works

## Testing Phase 3: Subscription Management

### Paddle Dashboard

- [ ] Open Paddle Dashboard > Customers
- [ ] Find test customer
- [ ] View subscription details
- [ ] Verify correct plan and pricing

### Customer Portal (if implemented)

- [ ] Click "Manage Plan" in extension
- [ ] Customer portal opens
- [ ] Can view subscription
- [ ] Can update payment method
- [ ] Can cancel subscription

### Subscription Cancellation

- [ ] Cancel subscription in Paddle Dashboard
- [ ] Wait for webhook
- [ ] Check server logs for `subscription.canceled`
- [ ] Verify database updated:
  ```sql
  SELECT plan, subscription_status
  FROM "User"
  WHERE paddle_subscription_id = 'sub_xxxxx';
  ```
- [ ] Verify `plan = 'free'`
- [ ] Verify `subscription_status = 'canceled'`
- [ ] Extension shows downgrade (if implemented)

## Test- [ ] Prices update ces

### Failed Payment Simulation

- [ ] Use- [ ] Ping test card in Paddle
- [ ] Webhook `subscription.past_due` received
- [ ] Database updated wi

## subscription_status = 'past_du

### Paddle Dashboarns Pro access (grace period)

### Webhook Sign- [ e Verification

- [ ] Send invalid we- [ ] View subignature)
- [ ] Server rejects with 400 err

### Cu] Check logs for "Invalid signat- [ ] Click "ManagCustom Data

- [ ] S- [ ] Customer portal opens
- [a.userId`
- [ ] Server rejects with - [ ] Can upda] Check logs for "Missing userId"

## Testing

###e 5: Paddle Dashboard

### Events & Logs

- [ ] Open Paddle Dashboard > Developer tools > Events & logs
- [ ] See all webhook d- [ ] Verify database upsponse codes (all 200)
- [ ] View payload for each event

### Webhook Simulator

- [ ] Use Paddle's webhook simulator
  ```

  ```
- [ ] Verify `plan = 'free'ated` event
- [ ] Verify server receives and pro- sses correctly

## Troubleshooting

### Checko

## on't Open

- Check browser console for errors
- ###ify Paddle.js loaded successfully
- Verify client token is correct
- Verify price IDs exist in Pad- e

### Webhooks Not Received

- Ensure ngrok i## suning
- Verify webhook URL in Paddle matches ngrok URL
- Check ngrok web interface (http://localhost:4040)
- Verify webhook secret matches

### Database Not Updated

- Check server logs for errors
- Verify Prisma connection
- Verify userId in custom_data matches database
- Check webhook payload structure

### Signature Verification Failed

- Verify webhook secret matches exactly
- Check raw body is passed to unmarshal
- Ensure no body parsing middleware interferes

## Success Criteria

✅ All tests passed when:

- Checkout opens successfully
- Payment completes without errors
- Webhooks received and processed
- Database updated correctly
- User plan changes reflected
- Cancellation flow works
- No errors in logs

## Next Steps After Testing

Once all tests pass:

1. Document any issues encountered
2. Create user-facing documentation
3. Plan production deployment
4. Set up monitoring and alerts
5. Create support documentation

---

**Testing Complete?** Move to production setup! 🚀
