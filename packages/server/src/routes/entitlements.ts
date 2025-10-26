// 🏷️ Entitlements Routes - Determine plan and allowed features

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { config } from '../config';

const router: import('express').Router = Router();

type Plan = 'free' | 'pro';
type Feature = 'oauth' | 'server-sync' | 'auto-sync' | 'ai-tagger';

const FEATURES_BY_PLAN: Record<Plan, Feature[]> = {
  // Free tier supports OAuth connection and on-demand server-side sync (no background auto-sync)
  free: ['oauth', 'server-sync'],
  // Pro unlocks background auto-sync, server-driven sync, and AI features
  pro: ['oauth', 'server-sync', 'auto-sync', 'ai-tagger'],
};

// GET /entitlements
// Returns the user's plan and feature flags. For now, plan is driven by server edition.
router.get('/', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Simple server-wide edition gate for MVP; can be extended to per-user plans later
    const plan: Plan = config.edition === 'pro' ? 'pro' : 'free';
    const features = FEATURES_BY_PLAN[plan];

    res.json({ success: true, plan, features });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load entitlements' });
  }
});

export default router;
