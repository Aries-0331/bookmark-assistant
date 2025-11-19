import { Router } from 'express';
import { paddlePricingService } from '../services';
import { config } from '../config';

const router: import('express').Router = Router();

/**
 * GET /api/pricing
 * Public endpoint to get current pricing and limits
 * Used by extension to avoid hardcoding prices
 */
router.get('/', async (req, res) => {
  try {
    // Fetch current pricing from Paddle (with caching)
    const pricing = await paddlePricingService.getPricing();

    res.json({
      success: true,
      pricing: {
        monthly: pricing.monthly,
        yearlyDiscount: pricing.yearlyDiscount,
      },
      limits: {
        free: {
          dailyLimit: config.limits.free.dailyLimit,
          minIntervalHours: config.limits.free.minIntervalHours,
        },
        pro: {
          dailyLimit: config.limits.pro.dailyLimit,
          minIntervalHours: config.limits.pro.minIntervalHours,
        },
      },
    });
  } catch (error) {
    console.error('❌ Failed to fetch pricing:', error);
    // Fallback to config defaults if Paddle fails
    res.json({
      success: true,
      pricing: {
        monthly: 5, // Fallback
        yearlyDiscount: 0.3, // Fallback
      },
      limits: {
        free: {
          dailyLimit: config.limits.free.dailyLimit,
          minIntervalHours: config.limits.free.minIntervalHours,
        },
        pro: {
          dailyLimit: config.limits.pro.dailyLimit,
          minIntervalHours: config.limits.pro.minIntervalHours,
        },
      },
    });
  }
});

export default router;
