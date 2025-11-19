// 🎫 Paddle Pricing Service - Fetch and cache pricing from Paddle API

import { Paddle, type Environment } from '@paddle/paddle-node-sdk';
import { config } from '../config';

interface PricingData {
  monthly: number;
  yearlyDiscount: number;
  lastFetched: number;
}

class PaddlePricingService {
  private paddle: Paddle | null = null;
  private cachedPricing: PricingData | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializePaddle();
  }

  private initializePaddle() {
    if (!config.paddle.apiKey) {
      console.warn('⚠️  Paddle API key not configured - using fallback pricing');
      return;
    }

    try {
      const paddleEnv: Environment = (
        config.paddle.environment === 'production' ? 'production' : 'sandbox'
      ) as Environment;

      this.paddle = new Paddle(config.paddle.apiKey, {
        environment: paddleEnv,
      });

      console.log(`✅ Paddle pricing service initialized (${paddleEnv})`);
    } catch (error) {
      console.error('❌ Failed to initialize Paddle for pricing:', error);
      this.paddle = null;
    }
  }

  /**
   * Get pricing data from Paddle API with caching
   * Falls back to config values if Paddle API is unavailable
   */
  async getPricing(): Promise<{ monthly: number; yearlyDiscount: number }> {
    // Return cached data if still valid
    if (this.cachedPricing && Date.now() - this.cachedPricing.lastFetched < this.CACHE_TTL) {
      return {
        monthly: this.cachedPricing.monthly,
        yearlyDiscount: this.cachedPricing.yearlyDiscount,
      };
    }

    // Try to fetch from Paddle
    if (this.paddle && config.paddle.priceIds.proMonthly) {
      try {
        const pricing = await this.fetchPricingFromPaddle();
        if (pricing) {
          this.cachedPricing = {
            ...pricing,
            lastFetched: Date.now(),
          };
          return pricing;
        }
      } catch (error) {
        console.error('❌ Failed to fetch pricing from Paddle:', error);
      }
    }

    // Fallback to config values
    return {
      monthly: config.pricing.monthlyFallback,
      yearlyDiscount: config.pricing.yearlyDiscountFallback,
    };
  }

  /**
   * Fetch pricing from Paddle API
   */
  private async fetchPricingFromPaddle(): Promise<{
    monthly: number;
    yearlyDiscount: number;
  } | null> {
    if (!this.paddle) return null;

    try {
      const monthlyPriceId = config.paddle.priceIds.proMonthly;
      const yearlyPriceId = config.paddle.priceIds.proYearly;

      if (!monthlyPriceId) {
        console.warn('⚠️  Monthly price ID not configured');
        return null;
      }

      // Fetch monthly price
      const monthlyPrice = await this.paddle.prices.get(monthlyPriceId);
      const monthlyAmount = Number(monthlyPrice.unitPrice?.amount || 0) / 100; // Convert cents to dollars

      if (!monthlyAmount) {
        console.warn('⚠️  Invalid monthly price from Paddle');
        return null;
      }

      // If no yearly price, use default discount
      if (!yearlyPriceId) {
        return {
          monthly: monthlyAmount,
          yearlyDiscount: config.pricing.yearlyDiscountFallback,
        };
      }

      // Fetch yearly price and calculate discount
      try {
        const yearlyPrice = await this.paddle.prices.get(yearlyPriceId);
        const yearlyAmount = Number(yearlyPrice.unitPrice?.amount || 0) / 100;

        if (yearlyAmount > 0) {
          // Calculate actual discount: (monthly * 12 - yearly) / (monthly * 12)
          const expectedAnnualCost = monthlyAmount * 12;
          const actualDiscount = (expectedAnnualCost - yearlyAmount) / expectedAnnualCost;

          return {
            monthly: monthlyAmount,
            yearlyDiscount: Math.max(0, Math.min(1, actualDiscount)), // Clamp between 0 and 1
          };
        }
      } catch (error) {
        console.warn('⚠️  Failed to fetch yearly price, using default discount:', error);
      }

      // Fallback to monthly with default discount
      return {
        monthly: monthlyAmount,
        yearlyDiscount: config.pricing.yearlyDiscountFallback,
      };
    } catch (error) {
      console.error('❌ Error fetching prices from Paddle:', error);
      return null;
    }
  }

  /**
   * Clear cache to force refresh on next getPricing() call
   */
  clearCache(): void {
    this.cachedPricing = null;
    console.log('🔄 Paddle pricing cache cleared');
  }
}

// Export singleton instance
export const paddlePricingService = new PaddlePricingService();
