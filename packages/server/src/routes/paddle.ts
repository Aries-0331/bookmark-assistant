// 🎫 Paddle Webhook Handler

import { Router, Request, Response } from 'express';
import { Paddle, type Environment } from '@paddle/paddle-node-sdk';
import { config } from '../config';
import { prisma } from '../services/userPrisma';
import { auditLog } from '../utils';
import type { PaddleWebhookEvent, PaddleCustomData } from '../types/paddle';

const router = Router();

// Initialize Paddle client
// Paddle SDK expects specific Environment type
const paddleEnv: Environment = (
  config.paddle.environment === 'production' ? 'production' : 'sandbox'
) as Environment;

const paddle = new Paddle(config.paddle.apiKey, {
  environment: paddleEnv,
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
    const rawBody = JSON.stringify(req.body);

    if (!signature) {
      auditLog('PADDLE_WEBHOOK', 'FAILED', { error: 'Missing signature' });
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    let event: PaddleWebhookEvent;
    try {
      const eventData = paddle.webhooks.unmarshal(rawBody, config.paddle.webhookSecret, signature);
      event = eventData as unknown as PaddleWebhookEvent;
    } catch (err) {
      auditLog('PADDLE_WEBHOOK', 'FAILED', { error: 'Invalid signature', err });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    auditLog('PADDLE_WEBHOOK', 'RECEIVED', {
      eventType: event.event_type,
      eventId: event.event_id,
    });

    // Extract custom data (contains our user ID)
    const customData = event.data.custom_data as PaddleCustomData | undefined;

    // Handle different webhook events
    switch (event.event_type) {
      case 'subscription.created': {
        if (!customData?.userId) {
          auditLog('PADDLE_WEBHOOK', 'ERROR', { error: 'Missing userId in custom_data' });
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
