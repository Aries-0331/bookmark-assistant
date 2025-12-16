// 🎫 Paddle Pricing Service - Fetch and cache pricing from Paddle API

import { Paddle, type Environment } from '@paddle/paddle-node-sdk';
import { config } from '../config';

interface PricingData {
  monthly: number;
  lifetime: number;
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
  async getPricing(): Promise<{ monthly: number; lifetime: number }> {
    // Return cached data if still valid
    if (this.cachedPricing && Date.now() - this.cachedPricing.lastFetched < this.CACHE_TTL) {
      return {
        monthly: this.cachedPricing.monthly,
        lifetime: this.cachedPricing.lifetime,
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
      lifetime: config.pricing.lifetimeFallback,
    };
  }

  /**
   * Fetch pricing from Paddle API
   */
  private async fetchPricingFromPaddle(): Promise<{
    monthly: number;
    lifetime: number;
  } | null> {
    if (!this.paddle) return null;

    try {
      const monthlyPriceId = config.paddle.priceIds.proMonthly;
      const lifetimePriceId = config.paddle.priceIds.proLifetime; // Previously yearlyPriceId

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

      // If no lifetime price, use default
      if (!lifetimePriceId) {
        return {
          monthly: monthlyAmount,
          lifetime: config.pricing.lifetimeFallback,
        };
      }

      // Fetch lifetime price
      try {
        const lifetimePrice = await this.paddle.prices.get(lifetimePriceId);
        const lifetimeAmount = Number(lifetimePrice.unitPrice?.amount || 0) / 100;

        if (lifetimeAmount > 0) {
          return {
            monthly: monthlyAmount,
            lifetime: lifetimeAmount,
          };
        }
      } catch (error) {
        console.warn('⚠️  Failed to fetch lifetime price, using default:', error);
      }

      // Fallback to monthly with default lifetime price
      return {
        monthly: monthlyAmount,
        lifetime: config.pricing.lifetimeFallback,
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

  /**
   * Note: yearlyPriceId in config is now used for lifetime purchase
   */
}

// Export singleton instance
export const paddlePricingService = new PaddlePricingService();
