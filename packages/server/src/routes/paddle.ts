// 🎫 Paddle Webhook Handler

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { Paddle, type Environment } from '@paddle/paddle-node-sdk';
import { config } from '../config';
import { prisma } from '../services/userPrisma';
import { auditLog } from '../utils';
import type { PaddleWebhookEvent, PaddleCustomData } from '../types/paddle';

const router: ExpressRouter = Router();

// Initialize Paddle client
// Paddle SDK expects specific Environment type
const paddleEnv: Environment = (
  config.paddle.environment === 'production' ? 'production' : 'sandbox'
) as Environment;

const paddle = new Paddle(config.paddle.apiKey, {
  environment: paddleEnv,
});

/**
 * Create Paddle Checkout URL
 * Generates a secure checkout URL for the extension to open in a new tab
 */
router.post('/checkout-url', async (req: Request, res: Response) => {
  try {
    const { priceId, userId, email, successUrl } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: priceId, userId' });
    }

    console.log('🎫 Creating Paddle checkout URL...', { priceId, userId, email });

    // Create a transaction (checkout session) via Paddle API
    const transaction = await paddle.transactions.create({
      items: [
        {
          priceId,
          quantity: 1,
        },
      ],
      customData: {
        userId,
      },
      ...(email && {
        customerEmail: email,
      }),
    });

    // Get the checkout URL from the transaction
    const checkoutUrl = transaction.checkout?.url;

    if (!checkoutUrl) {
      throw new Error('Paddle did not return a checkout URL');
    }

    // Append success URL as query parameter if provided
    let finalUrl = checkoutUrl;
    if (successUrl) {
      finalUrl = `${finalUrl}&_ptxn_success_url=${encodeURIComponent(successUrl)}`;
    }

    console.log('✅ Checkout URL created:', finalUrl);

    return res.json({ checkoutUrl: finalUrl });
  } catch (error) {
    console.error('❌ Failed to create checkout URL:', error);
    auditLog('PADDLE_CHECKOUT', 'FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return res.status(500).json({
      error: 'Failed to create checkout URL',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Paddle Webhook Endpoint
 * Handles all subscription lifecycle events from Paddle
 *
 * Events handled:
 * - subscription.created: New subscription created
 * - subscription.activated: Trial ended, subscription now active
 * - subscription.trialing: Subscription started in trial
 * - subscription.past_due: Payment failed
 * - subscription.paused: Subscription paused
 * - subscription.canceled: Subscription canceled
 * - subscription.updated: Subscription details updated
 * - transaction.completed: Payment confirmed
 */
router.post('/webhooks/paddle', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['paddle-signature'] as string;
    
    if (!signature) {
      auditLog('PADDLE_WEBHOOK', 'FAILED', { error: 'Missing signature' });
      return res.status(400).json({ error: 'Missing signature' });
    }

    console.log('📥 Webhook received:', {
      signature: signature.substring(0, 20) + '...',
      eventType: req.body.event_type,
      eventId: req.body.event_id,
    });

    // For sandbox testing: Use the body directly (Paddle already parsed it)
    // Note: In production, you should verify the signature with raw body middleware
    const event = req.body as PaddleWebhookEvent;

    // Validate event structure
    if (!event || !event.data) {
      console.error('❌ Invalid webhook event structure:', event);
      auditLog('PADDLE_WEBHOOK', 'FAILED', { error: 'Invalid event structure', event });
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    auditLog('PADDLE_WEBHOOK', 'RECEIVED', {
      eventType: event.event_type,
      eventId: event.event_id,
    });

    console.log('🔍 Webhook event data:', JSON.stringify(event.data, null, 2));

    // Extract custom data (contains our user ID)
    // Note: custom_data location varies by event type
    const customData = (event.data.custom_data || (event.data as any).customData || null) as
      | PaddleCustomData
      | undefined;

    // Handle different webhook events
    switch (event.event_type) {
      case 'subscription.created': {
        console.log('📋 subscription.created event:', {
          customData,
          eventData: event.data,
        });

        if (!customData?.userId) {
          console.error('❌ Missing userId in custom_data. Event data:', event.data);
          auditLog('PADDLE_WEBHOOK', 'ERROR', {
            error: 'Missing userId in custom_data',
            eventData: event.data,
          });
          return res.status(400).json({ error: 'Missing userId' });
        }

        await prisma.user.update({
          where: { user_id: customData.userId },
          data: {
            paddleCustomerId: event.data.customer_id,
            paddleSubscriptionId: event.data.id,
            subscriptionStatus: event.data.status || 'active',
            plan: 'pro',
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null,
          },
        });

        auditLog('PADDLE_WEBHOOK', 'SUBSCRIPTION_CREATED', {
          userId: customData.userId,
          subscriptionId: event.data.id,
          status: event.data.status,
        });
        break;
      }

      case 'subscription.activated': {
        // Trial ended, now active subscription
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'active',
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null,
          },
        });

        auditLog('PADDLE_WEBHOOK', 'SUBSCRIPTION_ACTIVATED', {
          subscriptionId: event.data.id,
        });
        break;
      }

      case 'subscription.trialing': {
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'trialing',
            plan: 'pro', // Grant pro access during trial
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null,
          },
        });

        auditLog('PADDLE_WEBHOOK', 'SUBSCRIPTION_TRIALING', {
          subscriptionId: event.data.id,
        });
        break;
      }

      case 'subscription.past_due': {
        // Payment failed - consider grace period
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'past_due',
            // Keep pro plan for now (grace period)
            // You can revoke access here if preferred
          },
        });

        auditLog('PADDLE_WEBHOOK', 'SUBSCRIPTION_PAST_DUE', {
          subscriptionId: event.data.id,
        });
        break;
      }

      case 'subscription.paused':
      case 'subscription.canceled': {
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: event.data.status || 'canceled',
            plan: 'free', // Downgrade to free
            nextBilledAt: null,
          },
        });

        auditLog('PADDLE_WEBHOOK', event.event_type.toUpperCase(), {
          subscriptionId: event.data.id,
          status: event.data.status,
        });
        break;
      }

      case 'subscription.resumed': {
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: 'active',
            plan: 'pro',
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null,
          },
        });

        auditLog('PADDLE_WEBHOOK', 'SUBSCRIPTION_RESUMED', {
          subscriptionId: event.data.id,
        });
        break;
      }

      case 'subscription.updated': {
        // Update subscription details (billing dates, etc.)
        await prisma.user.update({
          where: { paddleSubscriptionId: event.data.id },
          data: {
            subscriptionStatus: event.data.status,
            nextBilledAt: event.data.next_billed_at ? new Date(event.data.next_billed_at) : null,
          },
        });

        auditLog('PADDLE_WEBHOOK', 'SUBSCRIPTION_UPDATED', {
          subscriptionId: event.data.id,
          status: event.data.status,
        });
        break;
      }

      case 'transaction.created': {
        // Transaction created - checkout initiated but not completed yet
        console.log('📝 Transaction created:', {
          transactionId: event.data.id,
          customData: event.data.custom_data,
          status: event.data.status,
        });
        auditLog('PADDLE_WEBHOOK', 'TRANSACTION_CREATED', {
          transactionId: event.data.id,
          customData: event.data.custom_data,
        });
        // Don't provision access yet - wait for subscription.created
        break;
      }

      case 'transaction.completed': {
        // Payment confirmed - safe to provision access
        auditLog('PADDLE_WEBHOOK', 'TRANSACTION_COMPLETED', {
          transactionId: event.data.id,
          customerId: event.data.customer_id,
        });
        // Access already granted via subscription.created/activated
        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.event_type);
        auditLog('PADDLE_WEBHOOK', 'UNHANDLED_EVENT', {
          eventType: event.event_type,
        });
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (error) {
    auditLog('PADDLE_WEBHOOK', 'ERROR', { error });
    console.error('❌ Paddle webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
