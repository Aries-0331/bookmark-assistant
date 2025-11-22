// 🎫 Paddle Webhook Handler

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import crypto from 'crypto';
import { Paddle, type Environment } from '@paddle/paddle-node-sdk';
import { config } from '../config';
import { prisma } from '../services/userPrisma';
import { auditLog } from '../utils';
import type { PaddleWebhookEvent, PaddleCustomData } from '../types/paddle';
import { validateSession } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router: ExpressRouter = Router();

// Initialize Paddle client
// Paddle SDK expects specific Environment type
const paddleEnv: Environment = (
  config.paddle.environment === 'production' ? 'production' : 'sandbox'
) as Environment;

const paddle = new Paddle(config.paddle.apiKey, {
  environment: paddleEnv,
});

router.post('/checkout-url', async (req: Request, res: Response) => {
  try {
    const { pricing, userId, email } = req.body;

    if (!pricing || !userId) {
      return res.status(400).json({ error: 'Missing required fields: pricing, userId' });
    }

    console.log('🎫 Creating Paddle checkout URL (extension only)...', {
      pricing,
      userId,
      email,
      source: 'extension',
    });

    const priceId =
      pricing === 'monthly' ? config.paddle.priceIds.proMonthly : config.paddle.priceIds.proYearly;

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
        source: 'extension',
      },
      ...(email && {
        customerEmail: email,
      }),
    });

    // Get the checkout URL from the transaction (hosted checkout page)
    const checkoutUrl = (transaction as any).url || transaction.checkout?.url;

    if (!checkoutUrl) {
      throw new Error('Paddle did not return a checkout URL');
    }

    console.log('✅ Checkout URL created:', checkoutUrl);

    // Directly return Paddle hosted checkout URL to the extension
    return res.json({ checkoutUrl });
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
 */
router.post('/webhooks/paddle', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['paddle-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    const event = req.body as PaddleWebhookEvent;
    if (!event || !event.data) {
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    console.log(`📥 Webhook: ${event.event_type}`, event.event_id);

    // Only care about subscription changes for now
    if (
      [
        'subscription.created',
        'subscription.updated',
        'subscription.activated',
        'subscription.canceled',
        'subscription.past_due',
        'subscription.paused',
      ].includes(event.event_type)
    ) {
      const data = event.data;
      const customData = data.custom_data as PaddleCustomData | undefined;

      // Determine plan status based on subscription status
      // Paddle statuses: 'active', 'canceled', 'past_due', 'paused', 'trialing'
      const isActive = data.status ? ['active', 'trialing'].includes(data.status) : false;
      const newPlan = isActive ? 'pro' : 'free';

      console.log(`🔄 Processing subscription update: ${data.status} -> ${newPlan}`);

      // DEBUG: Log detailed context to debug matching issues
      console.log('🔍 Webhook Context:', {
        customerId: data.customer_id,
        customData,
        hasInternalUserId: !!customData?.userId,
        hasEmail: !!customData?.userEmail,
      });

      const email = customData?.userEmail;

      // Internal user id from customData (always CUID in new design)
      const internalUserId = customData?.userId;

      if (internalUserId) {
        try {
          // Ensure paddleCustomerId uniqueness: if another user holds this id, clear it there first
          const existingWithCustomer = await prisma.user.findFirst({
            where: {
              paddleCustomerId: data.customer_id,
              NOT: { id: internalUserId },
            },
            select: { id: true },
          });

          if (existingWithCustomer) {
            await prisma.user.update({
              where: { id: existingWithCustomer.id },
              data: { paddleCustomerId: null },
            });
          }

          await prisma.user.update({
            where: { id: internalUserId },
            data: {
              plan: newPlan,
              paddleCustomerId: data.customer_id,
            },
          });
          console.log(`✅ Updated user ${internalUserId} to ${newPlan} via webhook (by userId)`);
        } catch (e) {
          console.warn(`⚠️ Failed to update user ${internalUserId} from webhook:`, e);
        }
      } else {
        // Fallback: Try to find user by Paddle Customer ID
        // This is crucial for updates/cancellations where custom_data might be missing
        console.log(`🔍 Attempting fallback lookup by Paddle Customer ID: ${data.customer_id}`);

        const userByPaddleId = await prisma.user.findFirst({
          where: { paddleCustomerId: data.customer_id },
        });

        if (userByPaddleId) {
          console.log(`✅ Found user via Customer ID: ${userByPaddleId.id}`);
          try {
            await prisma.user.update({
              where: { id: userByPaddleId.id },
              data: {
                plan: newPlan,
              },
            });
            console.log(
              `✅ Updated user ${userByPaddleId.id} to ${newPlan} via webhook (by paddleCustomerId)`
            );
          } catch (e) {
            console.warn(`⚠️ Failed to update user ${userByPaddleId.id} from webhook:`, e);
          }
        } else if (email) {
          // 3. Email Check: Upsert
          // "If no passthrough, prisma.user.upsert"
          const licenseKey = crypto.randomUUID();

          await prisma.user.upsert({
            where: { email },
            create: {
              email,
              plan: newPlan,
              paddleCustomerId: data.customer_id,
              licenseKey,
              // notionUserId is NULL initially
            },
            update: {
              plan: newPlan,
              paddleCustomerId: data.customer_id,
            },
          });
          console.log(`✅ Upserted user ${email} to ${newPlan} via webhook (by email)`);
        } else {
          console.warn(
            '⚠️ Webhook received but no email, userId, or known customerId found to reconcile.',
            {
              customerId: data.customer_id,
              customData,
            }
          );
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Paddle webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create Billing Portal Session
 * Generates a self-service portal link for the user to manage their subscription
 */
router.post(
  '/portal-session',
  validateSession,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Get user's Paddle Customer ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paddleCustomerId: true, email: true },
      });

      if (!user?.paddleCustomerId) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found',
          message: 'Could not find a linked Paddle customer ID.',
        });
      }

      // Create a portal session
      // Note: Ensure "Customer Portal" is enabled in Paddle Dashboard > Checkout > Customer Portal
      try {
        const portalSession = await paddle.customerPortalSessions.create(user.paddleCustomerId, [
          user.paddleCustomerId,
        ]);

        if (!portalSession?.urls?.general) {
          throw new Error('No portal URL returned from Paddle');
        }

        auditLog('portal_session_created', userId, { customerId: user.paddleCustomerId });

        res.json({
          success: true,
          url: portalSession.urls.general,
        });
      } catch (paddleError: any) {
        console.error('Paddle Portal Error:', paddleError);
        // Fallback: If portal creation fails (e.g. not enabled), return a helpful error
        // or a generic link if available.
        return res.status(500).json({
          success: false,
          error: 'Portal unavailable',
          message: 'Could not generate portal link. Please contact support.',
        });
      }
    } catch (error) {
      console.error('Portal Session Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to generate management link',
      });
    }
  }
);

export default router;
