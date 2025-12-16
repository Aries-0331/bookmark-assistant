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
        lifetime: pricing.lifetime,
      },
    });
  } catch (error) {
    console.error('❌ Failed to fetch pricing:', error);
    // Fallback to config defaults if Paddle fails
    res.json({
      success: true,
      pricing: {
        monthly: 2.99, // Fallback
        lifetime: 29.99, // Fallback
      },
    });
  }
});

export default router;
