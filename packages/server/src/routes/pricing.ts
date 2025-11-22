import { Router } from 'express';
import { paddlePricingService } from '../services';

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
    });
  }
});

export default router;
