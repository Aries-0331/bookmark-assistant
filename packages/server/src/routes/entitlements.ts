// 🏷️ Entitlements Routes - Determine plan and allowed features

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { config } from '../config';

const router: import('express').Router = Router();

type Feature = 'oauth' | 'server-sync' | 'auto-sync' | 'ai-tagger' | 'ai-summarizer';

const IS_PRO_FEATURE: Record<string, Feature[]> = {
  free: ['oauth', 'server-sync'],
  pro: ['oauth', 'server-sync', 'auto-sync', 'ai-tagger', 'ai-summarizer'],
};

// GET /entitlements
// Returns the user's plan and feature flags. For now, plan is driven by server edition.
router.get('/', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Simple server-wide edition gate for MVP; can be extended to per-user plans later
    const isPro = config.isPro;
    const features = isPro ? IS_PRO_FEATURE['pro'] : IS_PRO_FEATURE['free'];

    res.json({ success: true, isPro, features });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to load entitlements' });
  }
});

export default router;
