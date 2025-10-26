// 🏷️ Entitlements Routes - Determine plan and allowed features

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { config } from '../config';

const router: import('express').Router = Router();

// GET /entitlements
// Returns the user's plan and feature flags. For now, plan is driven by server edition.
router.get('/', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Simple server-wide edition gate for MVP; can be extended to per-user plans later
    const plan = config.edition === 'pro' ? 'pro' : 'free';
    const features =
      plan === 'pro' ? ['server-sync', 'oauth', 'auto-sync', 'ai-tagger'] : ['manual-token'];

    res.json({ success: true, plan, features });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load entitlements' });
  }
});

export default router;
