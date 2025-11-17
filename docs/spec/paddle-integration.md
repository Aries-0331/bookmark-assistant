# Paddle Billing Integration Specification

## Context
This is the commercial version of a Chrome extension called "Bookmark Assistant". The app uses:
- **Frontend**: Next.js 14 (App Router) + React 18
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL
- **Language**: TypeScript throughout
- **Payment**: Paddle Billing (NOT Paddle Classic)

## Goal
Implement full Paddle subscription handling for Pro users using modern Paddle Billing API.

---

## 1. Plans Overview

| Plan | Bookmarks Limit | AI Summaries | Support | Billing |
|------|----------------|--------------|---------|---------|
| **Free** | 100 | Basic | Community | Free forever |
| **Pro** | Unlimited | Advanced | Priority | Monthly/Yearly via Paddle |

- **Free plan**: No Paddle interaction, handled entirely in-app
- **Pro plan**: Managed through Paddle Billing subscriptions

---

## 2. Data Model (Prisma)

Update `packages/server/prisma/schema.prisma`:

```prisma
model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  plan                 String    @default("free")        // "free" | "pro"

  // Paddle integration fields
  paddleCustomerId     String?   @unique                 // Paddle customer ID (ctm_xxx)
  paddleSubscriptionId String?   @unique                 // Paddle subscription ID (sub_xxx)
  subscriptionStatus   String?                           // "trialing" | "active" | "past_due" | "paused" | "canceled"
  nextBilledAt         DateTime?                         // When next renewal occurs

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([paddleCustomerId])
  @@index([paddleSubscriptionId])
}
```

**Valid subscription statuses**: `trialing`, `active`, `past_due`, `paused`, `canceled`
(Note: No "expired" status in Paddle Billing)

---

## 3. Checkout Flow (Frontend-First Approach)

### ⚠️ Key Insight
**Paddle Billing uses a frontend-first checkout model** - there's NO backend "create session" endpoint like Stripe. You open checkout directly from the frontend using Paddle.js.

### Implementation

#### Step 1: Initialize Paddle.js (Frontend)
```typescript
// packages/website/app/layout.tsx or pricing page
import Script from 'next/script';

// In <head>
<Script src="https://cdn.paddle.com/paddle/v2/paddle.js" />
<Script id="paddle-init">
  {`
    Paddle.Environment.set("${process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT}");
    Paddle.Initialize({
      token: "${process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN}"
    });
  `}
</Script>
```

#### Step 2: Open Checkout (No Backend API Needed)
```typescript
// packages/website/components/PricingCard.tsx
const handleUpgrade = async () => {
  // Get authenticated user info from your auth system
  const user = await getCurrentUser();

  Paddle.Checkout.open({
    items: [{
      priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
      quantity: 1
    }],
    customer: {
      email: user.email  // Prefill email (separate from custom_data)
    },
    customData: {
      userId: user.id    // Your internal user ID for webhook matching
    },
    settings: {
      successUrl: `${window.location.origin}/success`,
      theme: 'light',
      locale: 'en'
    }
  });
};****
```

**Flow**:
1. User clicks "Upgrade to Pro" → `handleUpgrade()` executes
2. Paddle overlay opens (Paddle-hosted, secure)
3. User completes payment
4. Paddle redirects to `/success`
5. Webhook fires to provision access

---

## 4. Webhook Handling (Backend)

### Create `/packages/server/src/routes/webhooks.ts`

```typescript
import { Router } from 'express';
import { Paddle } from '@paddle/paddle-node-sdk';
import { prisma } from '../config';

const router = Router();
const paddle = new Paddle(process.env.PADDLE_API_KEY!);

// IMPORTANT: Must use raw body for signature verification
router.post('/paddle', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['paddle-signature'] as string;
  const rawBody = req.body.toString('utf8');

  // Verify webhook signature (CRITICAL for security)
  let event;
  try {
    event = paddle.webhooks.unmarshal(
      rawBody,
      signature,
      process.env.PADDLE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Invalid webhook signature:', err);
    return res.status(400).send('Invalid signature');
  }

  console.log(`Received webhook: ${event.event_type}`, event.event_id);

  try {
    switch (event.event_type) {
      case 'transaction.completed':
        // Payment confirmed - transaction is ready
        // subscription.created will follow for recurring items
        console.log('Transaction completed:', event.data.id);
        break;

      case 'subscription.created':
        // New subscription created (may be in trial or active)
        await prisma.user.update({
          where: { id: event.data.custom_data?.userId },
          data: {
            paddleCustomerId: event.data.customer_id,
            paddleSubscriptionId: event.data.id,
            subscriptionStatus: event.data.status, // "trialing" or "active"
            plan: 'pro',
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null
          }
        });
        break;

      case 'subscription.trialing':
        // Subscription started in trial
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'trialing',
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null
          }
        });
        break;

      case 'subscription.activated':
        // Trial ended, now active (or immediate activation)
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'active',
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null
          }
        });
        break;

      case 'subscription.past_due':
        // Payment failed - implement grace period logic
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'past_due'
            // Consider: keep plan = "pro" during grace period
          }
        });
        break;

      case 'subscription.paused':
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'paused',
            plan: 'free' // Downgrade when paused
          }
        });
        break;

      case 'subscription.canceled':
        // Check if canceled immediately or scheduled for end of period
        const isCanceledNow = event.data.status === 'canceled';
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'canceled',
            plan: isCanceledNow ? 'free' : 'pro', // Keep pro until period ends
            nextBilledAt: null
          }
        });
        break;

      case 'subscription.updated':
        // Handle plan changes, billing updates, etc.
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: event.data.status,
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null
          }
        });
        break;

      default:
        console.log(`Unhandled event type: ${event.event_type}`);
    }

    // MUST respond with 200 within 10 seconds
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal error');
  }
});

export default router;
```

### Register webhook route
```typescript
// packages/server/src/routes/index.ts
import webhookRouter from './webhooks';

app.use('/api/webhooks', webhookRouter);
```

---

## 5. Environment Variables

### Backend (`.env`)
```bash
# Paddle API (server-side only)
PADDLE_API_KEY=live_xxx                    # Get from Paddle Dashboard > Developer tools > API keys
PADDLE_ENVIRONMENT=production              # or 'sandbox'
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxx       # Get from notification destination settings
```

### Frontend (`.env.local` for Next.js)
```bash
# Paddle Client (public, safe to expose)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=live_xxx   # Get from Paddle Dashboard > Developer tools > Authentication
NEXT_PUBLIC_PADDLE_ENVIRONMENT=production  # or 'sandbox'

# Price IDs (get from Paddle Dashboard > Catalog)
NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxx
NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID=pri_xxx
```

---

## 6. TypeScript Types

Create `packages/shared/types/paddle.ts`:

```typescript
export type PaddleEnvironment = 'sandbox' | 'production';

export type PaddleSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled';

export interface PaddleCustomData {
  userId: string;  // Internal user ID for webhook matching
}

export interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  notification_id: string;
  data: {
    id: string;
    status: PaddleSubscriptionStatus;
    customer_id: string;
    subscription_id?: string;
    transaction_id?: string;
    custom_data?: PaddleCustomData;
    next_billed_at?: string;
    canceled_at?: string;
    paused_at?: string;
    // ... extend as needed
  };
}

export type PaddleEventType =
  | 'transaction.completed'
  | 'subscription.created'
  | 'subscription.trialing'
  | 'subscription.activated'
  | 'subscription.updated'
  | 'subscription.past_due'
  | 'subscription.paused'
  | 'subscription.canceled';
```

---

## 7. Frontend Components

### Pricing Page
```typescript
// packages/website/app/pricing/page.tsx
'use client';

declare global {
  interface Window {
    Paddle: any;
  }
}

export default function PricingPage() {
  const handleMonthlyUpgrade = () => {
    window.Paddle.Checkout.open({
      items: [{
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
        quantity: 1
      }],
      settings: {
        successUrl: `${window.location.origin}/success`
      }
    });
  };

  return (
    <div>
      <PricingCard plan="free" />
      <PricingCard plan="pro" onUpgrade={handleMonthlyUpgrade} />
    </div>
  );
}
```

### Settings Page (Show Subscription Status)
```typescript
// packages/website/app/settings/page.tsx
import { getCurrentUser } from '@/lib/auth';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h2>Current Plan: {user.plan.toUpperCase()}</h2>
      {user.subscriptionStatus && (
        <p>Status: {user.subscriptionStatus}</p>
      )}
      {user.nextBilledAt && (
        <p>Next billing: {user.nextBilledAt.toLocaleDateString()}</p>
      )}
    </div>
  );
}
```

---

## 8. Paddle Dashboard Setup

### Step 1: Create Products & Prices
1. Go to **Paddle Dashboard > Catalog > Products**
2. Create product: "Bookmark Assistant Pro"
3. Add prices:
   - Monthly: $9.99/month (recurring)
   - Yearly: $99/year (recurring)
4. Copy price IDs (format: `pri_xxx`)

### Step 2: Create Client-Side Token
1. Go to **Developer tools > Authentication**
2. Click "Generate client-side token"
3. Copy token (format: `live_xxx` or `test_xxx` for sandbox)

### Step 3: Create API Key
1. Go to **Developer tools > API keys**
2. Click "Create API key"
3. Give write permissions for: Subscriptions, Transactions, Customers
4. Copy API key (format: `live_xxx`)

### Step 4: Set Up Webhook Endpoint
1. Go to **Developer tools > Notifications**
2. Click "Create notification destination"
3. Set URL: `https://yourdomain.com/api/webhooks/paddle`
4. Subscribe to events:
   - `transaction.completed`
   - `subscription.created`
   - `subscription.trialing`
   - `subscription.activated`
   - `subscription.updated`
   - `subscription.past_due`
   - `subscription.paused`
   - `subscription.canceled`
5. Copy webhook secret (format: `pdl_ntfset_xxx`)

### Step 5: Set Default Payment Link
1. Go to **Checkout > Checkout settings**
2. Set "Default payment link" domain
3. Submit for approval (required for production)

---

## 9. Error Handling

### Frontend
```typescript
const handleUpgrade = () => {
  try {
    window.Paddle.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      settings: {
        successUrl: `${window.location.origin}/success`
      }
    });
  } catch (error) {
    console.error('Failed to open checkout:', error);
    toast.error('Unable to start checkout. Please try again.');
  }
};
```

### Backend Webhook
```typescript
// Already included in webhook handler above
// - Signature verification (returns 400 if invalid)
// - Try-catch around event processing (returns 500 on error)
// - Logging for all events
```

---

## 10. Testing Strategy

### Sandbox Testing
1. Create Paddle sandbox account: https://sandbox-login.paddle.com/signup
2. Use sandbox credentials in `.env`
3. Test card: `4242 4242 4242 4242`, any future expiry, CVV: `100`
4. Use Paddle's webhook simulator: **Developer tools > Notifications > Simulate**

### Production Checklist
- [ ] Switch to live API key & client token
- [ ] Update `PADDLE_ENVIRONMENT` to `production`
- [ ] Webhook endpoint SSL-secured (HTTPS)
- [ ] Default payment link domain approved
- [ ] Test complete flow: signup → payment → webhook → provisioning
- [ ] Monitor webhook delivery in Paddle Dashboard

---

## 11. Deliverables

| File | Purpose |
|------|---------|
| `packages/server/src/routes/webhooks.ts` | Paddle webhook handler |
| `packages/server/prisma/schema.prisma` | Updated User model |
| `packages/shared/types/paddle.ts` | TypeScript types |
| `packages/website/app/pricing/page.tsx` | Pricing UI with Paddle.js |
| `packages/website/app/settings/page.tsx` | Subscription status display |
| `packages/website/app/success/page.tsx` | Post-checkout success page |

---

## 12. Key Differences from Stripe

| Aspect | Stripe | Paddle Billing |
|--------|--------|---------------|
| Checkout creation | Backend API creates session | Frontend-only with Paddle.js |
| Merchant of record | You | Paddle (handles tax, compliance) |
| Customer object | Always created via API | Auto-created by checkout |
| Subscription status | More granular | Simplified lifecycle |
| Webhook events | 100+ events | Focused on billing lifecycle |

---

## 13. Future Enhancements

- [ ] Implement trial periods (7-day free trial)
- [ ] Add discount/coupon support
- [ ] Implement plan switching (monthly ↔ yearly)
- [ ] Add customer portal integration for self-service
- [ ] Implement usage-based billing for bookmark syncs
- [ ] Add dunning/retry logic for failed payments
- [ ] Support for multiple currencies

---

## Notes

- **DO NOT** use Paddle Classic endpoints - they're deprecated
- **DO** use `@paddle/paddle-node-sdk` (official Node.js SDK)
- **DO** verify webhook signatures - critical for security
- **DO** respond to webhooks within 10 seconds (Paddle timeout)
- **DO** use idempotency - webhooks may be sent multiple times
- **DO** store `custom_data.userId` to match webhooks to internal users
- **DO NOT** nest objects deeply in `custom_data` (display issues in dashboard)

---

## Support Resources

- [Paddle Billing Docs](https://developer.paddle.com/)
- [Node.js SDK Reference](https://github.com/PaddleHQ/paddle-node-sdk)
- [Webhook Events Reference](https://developer.paddle.com/webhooks/overview)
- [Paddle Support](https://www.paddle.com/support)
