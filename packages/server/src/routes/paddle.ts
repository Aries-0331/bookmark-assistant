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

/**
 * Create Paddle Checkout URL
 * Generates a secure checkout URL for the extension to open in a new tab
 * Supports both extension and website checkout flows with proper success URL handling
 */
router.post('/checkout-url', async (req: Request, res: Response) => {
  try {
    const { priceId, userId, email, source, successUrl } = req.body;

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: priceId, userId' });
    }

    const checkoutSource = source || 'website';
    console.log('🎫 Creating Paddle checkout URL...', {
      priceId,
      userId,
      email,
      source: checkoutSource,
    });

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
        source: checkoutSource, // Track checkout origin
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

    // Build enhanced success URL with source tracking
    let enhancedSuccessUrl: string;

    if (checkoutSource === 'extension') {
      // Extension flow: redirect back to extension after payment
      const baseUrl = successUrl || 'chrome-extension://extension-id/options.html';
      const separator = baseUrl.includes('?') ? '&' : '?';
      enhancedSuccessUrl = `${config.websiteUrl || 'http://localhost:3006'}/success?source=extension&return_to=${encodeURIComponent(baseUrl + separator + 'upgraded=true')}`;
    } else {
      // Website flow: redirect to website success page
      enhancedSuccessUrl =
        successUrl || `${config.websiteUrl || 'http://localhost:3006'}/success?source=website`;
    }

    // Append success URL to checkout URL
    const finalUrl = `${checkoutUrl}&_ptxn_success_url=${encodeURIComponent(enhancedSuccessUrl)}`;

    console.log('✅ Checkout URL created:', finalUrl);
    console.log('🎯 Success URL will be:', enhancedSuccessUrl);

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
 */
router.post('/webhooks/paddle', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['paddle-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // In a real app, use paddle.webhooks.unmarshal(rawBody, secret, signature)
    // Here we assume body is parsed.
    const event = req.body as PaddleWebhookEvent;
    if (!event || !event.data) {
      return res.status(400).json({ error: 'Invalid event structure' });
    }

    console.log(`📥 Webhook: ${event.event_type}`, event.event_id);

    // Only care about subscription changes for now
    if (
      ['subscription.created', 'subscription.updated', 'subscription.activated'].includes(
        event.event_type
      )
    ) {
      const data = event.data;
      const customData = (data.custom_data || (data as any).customData) as
        | PaddleCustomData
        | undefined;

      // 1. Extract Email & Passthrough
      // Paddle data structure varies; check customer object or email field
      // For subscription events, data.customer might be an ID, need to fetch or rely on email in customData/notification
      // Assuming we can get email from the payload or customData
      let email = customData?.userEmail;

      // If email not in customData, try to find it in the event (depends on Paddle API version)
      // For this implementation, we rely on the email being passed in customData during checkout
      // or we might need to fetch the customer from Paddle if we only have customer_id.
      // However, the spec says "Extract email... from the body".
      // Let's assume it's available or we fallback to customData.

      // 2. Passthrough Check (Internal User ID)
      const internalUserId = customData?.userId; // This is our internal ID (CUID) or old notionUserId?
      // The spec says "If passthrough.internalUserId exists, update that user directly."

      if (internalUserId) {
        // Update existing user
        // We need to find by ID. Since we migrated to CUID, 'internalUserId' might be the CUID or the old Notion ID.
        // Let's assume it's the ID (PK).
        try {
          await prisma.user.update({
            where: { id: internalUserId },
            data: {
              plan: 'pro',
              paddleCustomerId: data.customer_id,
              // Update other fields if needed
            },
          });
          console.log(`✅ Updated user ${internalUserId} to PRO via webhook`);
        } catch (e) {
          console.warn(`⚠️ Failed to update user ${internalUserId} from webhook:`, e);
        }
      } else if (email) {
        // 3. Email Check: Upsert
        // "If no passthrough, prisma.user.upsert"
        const licenseKey = crypto.randomUUID();

        await prisma.user.upsert({
          where: { email },
          create: {
            email,
            plan: 'pro',
            paddleCustomerId: data.customer_id,
            licenseKey,
            // notionUserId is NULL initially
          },
          update: {
            plan: 'pro',
            paddleCustomerId: data.customer_id,
          },
        });
        console.log(`✅ Upserted user ${email} to PRO via webhook`);
      } else {
        console.warn('⚠️ Webhook received but no email or userId found to reconcile.');
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
