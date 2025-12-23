/**
 * Unit tests for PaddlePricing service
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaddlePricing } from './paddlePricing';

describe('PaddlePricing', () => {
  let paddlePricing: PaddlePricing;

  beforeEach(() => {
    vi.clearAllMocks();
    paddlePricing = new PaddlePricing();
  });

  describe('constructor', () => {
    it('should initialize with pricing config', () => {
      expect(paddlePricing).toBeInstanceOf(PaddlePricing);
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for active user', async () => {
      const mockSubscription = {
        status: 'active',
        plan_id: 'pro_plan',
        update_url: 'https://checkout.paddle.com/update',
        cancel_url: 'https://checkout.paddle.com/cancel',
      };

      // Mock the fetch call to Paddle API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: mockSubscription }),
      });

      const result = await paddlePricing.getSubscription('user-123', 'customer-123');

      expect(result).toEqual(mockSubscription);
      expect(result.status).toBe('active');
    });

    it('should return null for non-existent subscription', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: null }),
      });

      const result = await paddlePricing.getSubscription('user-123', 'customer-123');

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await paddlePricing.getSubscription('user-123', 'invalid');

      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await paddlePricing.getSubscription('user-123', 'customer-123');

      expect(result).toBeNull();
    });
  });

  describe('checkEntitlement', () => {
    it('should grant access for active pro subscription', () => {
      const subscription = {
        status: 'active',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkEntitlement(subscription, 'auto_sync');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny access for inactive subscription', () => {
      const subscription = {
        status: 'canceled',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkEntitlement(subscription, 'auto_sync');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Subscription inactive');
    });

    it('should deny access for free tier feature', () => {
      const subscription = null;

      const result = paddlePricing.checkEntitlement(subscription, 'manual_sync');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny access for pro tier without subscription', () => {
      const subscription = null;

      const result = paddlePricing.checkEntitlement(subscription, 'auto_sync');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Pro subscription required');
    });

    it('should handle paused subscription', () => {
      const subscription = {
        status: 'paused',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkEntitlement(subscription, 'auto_sync');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Subscription paused');
    });

    it('should handle past_due subscription', () => {
      const subscription = {
        status: 'past_due',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkEntitlement(subscription, 'auto_sync');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Payment past due');
    });

    it('should grant access for unlimited features to pro users', () => {
      const subscription = {
        status: 'active',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkEntitlement(subscription, 'unlimited_syncs');

      expect(result.allowed).toBe(true);
    });

    it('should deny unlimited features for free users', () => {
      const subscription = null;

      const result = paddlePricing.checkEntitlement(subscription, 'unlimited_syncs');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Pro subscription required');
    });
  });

  describe('checkSyncLimit', () => {
    it('should allow unlimited syncs for pro users', () => {
      const subscription = {
        status: 'active',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkSyncLimit(subscription, 500);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeUndefined();
      expect(result.remaining).toBeUndefined();
    });

    it('should enforce 50 bookmark limit for free users', () => {
      const subscription = null;

      const result = paddlePricing.checkSyncLimit(subscription, 50);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(0);
    });

    it('should deny sync if free user exceeds limit', () => {
      const subscription = null;

      const result = paddlePricing.checkSyncLimit(subscription, 51);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(-1);
      expect(result.reason).toBe('Free tier limit exceeded (50 bookmarks)');
    });

    it('should calculate remaining bookmarks for free users', () => {
      const subscription = null;

      const result = paddlePricing.checkSyncLimit(subscription, 25);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(25);
    });
  });

  describe('checkSyncInterval', () => {
    it('should allow 6-hour interval for pro users', () => {
      const subscription = {
        status: 'active',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkSyncInterval(subscription, 6);

      expect(result.allowed).toBe(true);
      expect(result.minInterval).toBe(6);
    });

    it('should enforce 24-hour interval for free users', () => {
      const subscription = null;

      const result = paddlePricing.checkSyncInterval(subscription, 24);

      expect(result.allowed).toBe(true);
      expect(result.minInterval).toBe(24);
    });

    it('should deny sync if free user has shorter interval', () => {
      const subscription = null;

      const result = paddlePricing.checkSyncInterval(subscription, 12);

      expect(result.allowed).toBe(false);
      expect(result.minInterval).toBe(24);
      expect(result.reason).toBe('Free tier minimum interval is 24 hours');
    });

    it('should allow any interval for pro users', () => {
      const subscription = {
        status: 'active',
        plan_id: 'pro_plan',
      };

      const result = paddlePricing.checkSyncInterval(subscription, 1);

      expect(result.allowed).toBe(true);
      expect(result.minInterval).toBe(1);
    });
  });

  describe('getPlanFeatures', () => {
    it('should return free tier features', () => {
      const subscription = null;

      const features = paddlePricing.getPlanFeatures(subscription);

      expect(features.tier).toBe('free');
      expect(features.syncLimit).toBe(50);
      expect(features.minIntervalHours).toBe(24);
      expect(features.autoSync).toBe(false);
      expect(features.prioritySupport).toBe(false);
      expect(features.unlimitedBookmarks).toBe(false);
    });

    it('should return pro tier features', () => {
      const subscription = {
        status: 'active',
        plan_id: 'pro_plan',
      };

      const features = paddlePricing.getPlanFeatures(subscription);

      expect(features.tier).toBe('pro');
      expect(features.syncLimit).toBeUndefined();
      expect(features.minIntervalHours).toBe(6);
      expect(features.autoSync).toBe(true);
      expect(features.prioritySupport).toBe(true);
      expect(features.unlimitedBookmarks).toBe(true);
    });

    it('should handle canceled subscription', () => {
      const subscription = {
        status: 'canceled',
        plan_id: 'pro_plan',
      };

      const features = paddlePricing.getPlanFeatures(subscription);

      expect(features.tier).toBe('free');
      expect(features.syncLimit).toBe(50);
      expect(features.autoSync).toBe(false);
    });

    it('should handle paused subscription', () => {
      const subscription = {
        status: 'paused',
        plan_id: 'pro_plan',
      };

      const features = paddlePricing.getPlanFeatures(subscription);

      expect(features.tier).toBe('free');
    });
  });

  describe('calculateNextBillingDate', () => {
    it('should calculate next billing date for active subscription', () => {
      const subscription = {
        status: 'active',
        next_bill_date: '2025-01-23',
      };

      const result = paddlePricing.calculateNextBillingDate(subscription);

      expect(result).toBe('2025-01-23');
    });

    it('should return null for inactive subscription', () => {
      const subscription = {
        status: 'canceled',
      };

      const result = paddlePricing.calculateNextBillingDate(subscription);

      expect(result).toBeNull();
    });

    it('should return null for past_due subscription', () => {
      const subscription = {
        status: 'past_due',
      };

      const result = paddlePricing.calculateNextBillingDate(subscription);

      expect(result).toBeNull();
    });
  });

  describe('isSubscriptionActive', () => {
    it('should return true for active status', () => {
      const subscription = { status: 'active' };

      const result = paddlePricing.isSubscriptionActive(subscription);

      expect(result).toBe(true);
    });

    it('should return false for canceled status', () => {
      const subscription = { status: 'canceled' };

      const result = paddlePricing.isSubscriptionActive(subscription);

      expect(result).toBe(false);
    });

    it('should return false for paused status', () => {
      const subscription = { status: 'paused' };

      const result = paddlePricing.isSubscriptionActive(subscription);

      expect(result).toBe(false);
    });

    it('should return false for past_due status', () => {
      const subscription = { status: 'past_due' };

      const result = paddlePricing.isSubscriptionActive(subscription);

      expect(result).toBe(false);
    });

    it('should return false for null subscription', () => {
      const result = paddlePricing.isSubscriptionActive(null);

      expect(result).toBe(false);
    });
  });

  describe('validateWebhook', () => {
    it('should validate paddle webhook signature', () => {
      const body = JSON.stringify({
        alert_name: 'subscription_created',
        subscription_id: 'sub_123',
      });

      const signature = 'valid-signature';

      const result = paddlePricing.validateWebhook(body, signature);

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const body = JSON.stringify({
        alert_name: 'subscription_created',
      });

      const invalidSignature = 'invalid-signature';

      const result = paddlePricing.validateWebhook(body, invalidSignature);

      expect(result).toBe(false);
    });
  });

  describe('handleWebhook', () => {
    it('should handle subscription_created event', async () => {
      const event = {
        alert_name: 'subscription_created',
        subscription_id: 'sub_123',
        status: 'active',
        user_id: 'user-123',
      };

      const result = await paddlePricing.handleWebhook(event);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('subscription_created');
    });

    it('should handle subscription_updated event', async () => {
      const event = {
        alert_name: 'subscription_updated',
        subscription_id: 'sub_123',
        status: 'active',
        user_id: 'user-123',
      };

      const result = await paddlePricing.handleWebhook(event);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('subscription_updated');
    });

    it('should handle subscription_canceled event', async () => {
      const event = {
        alert_name: 'subscription_canceled',
        subscription_id: 'sub_123',
        status: 'canceled',
        user_id: 'user-123',
      };

      const result = await paddlePricing.handleWebhook(event);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('subscription_canceled');
    });

    it('should handle subscription_payment_succeeded event', async () => {
      const event = {
        alert_name: 'subscription_payment_succeeded',
        subscription_id: 'sub_123',
        amount: '4.99',
        currency: 'USD',
      };

      const result = await paddlePricing.handleWebhook(event);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('payment_succeeded');
    });

    it('should handle subscription_payment_failed event', async () => {
      const event = {
        alert_name: 'subscription_payment_failed',
        subscription_id: 'sub_123',
        amount: '4.99',
        currency: 'USD',
      };

      const result = await paddlePricing.handleWebhook(event);

      expect(result.processed).toBe(true);
      expect(result.action).toBe('payment_failed');
    });

    it('should ignore unknown events', async () => {
      const event = {
        alert_name: 'unknown_event',
        subscription_id: 'sub_123',
      };

      const result = await paddlePricing.handleWebhook(event);

      expect(result.processed).toBe(false);
    });
  });

  describe('getPricingInfo', () => {
    it('should return pricing information', () => {
      const pricing = paddlePricing.getPricingInfo();

      expect(pricing.free).toBeDefined();
      expect(pricing.pro).toBeDefined();
      expect(pricing.free.tier).toBe('free');
      expect(pricing.pro.tier).toBe('pro');
    });

    it('should include feature comparison', () => {
      const pricing = paddlePricing.getPricingInfo();

      expect(pricing.comparison).toBeDefined();
      expect(pricing.comparison.syncLimit).toBeDefined();
      expect(pricing.comparison.autoSync).toBeDefined();
      expect(pricing.comparison.minInterval).toBeDefined();
    });
  });
});
