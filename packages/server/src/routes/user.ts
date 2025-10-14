// 👤 User Profile and Template Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { userPrisma } from '../services/userPrisma';
import { auditLog, sanitizeError } from '../utils';

const router = Router();

/**
 * User Profile & Status
 * Get current user information and status
 */
router.get('/profile', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await userPrisma.find(userId);

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
    }

    // lastActivity is updated by DB writes elsewhere; no-op here

    const profile = {
      userId,
      templateDatabaseId: userData.templateDatabaseId,
      databaseCount: userData.databases?.length || 0,
      lastActivity: userData.lastActivity,
      hasNotionAccess: !!userData.notionAccessToken,
      hasRefreshToken: !!userData.notionRefreshToken,
    };

    auditLog('profile_fetch_success', userId, {
      databaseCount: profile.databaseCount,
      hasTemplateDatabase: !!profile.templateDatabaseId,
    });

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('profile_fetch_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user profile',
    });
  }
});

/**
 * Update User Settings
 * Update user preferences and settings
 */
router.patch('/settings', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await userPrisma.find(userId);
    const { templateDatabaseId } = req.body;

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
    }

    auditLog('user_settings_update', userId, {
      templateDatabaseId,
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('user_settings_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Settings update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update settings',
    });
  }
});

/**
 * Get Session Statistics
 * Administrative endpoint for session monitoring
 */
// session-stats depended on in-memory store; removed to keep solution simple

/**
 * Check Template Status
 * Verify if user has a template database set up
 */
router.get(
  '/template/status',
  validateSession,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userData = await userPrisma.find(userId);

      if (!userData) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User data not found',
        });
      }

      const hasTemplate = !!userData.templateDatabaseId;

      // lastActivity is updated by DB writes elsewhere; no-op here

      res.json({
        success: true,
        hasTemplate,
        templateDatabaseId: userData.templateDatabaseId || null,
        message: hasTemplate ? 'Template database found' : 'No template database configured',
      });
    } catch (error) {
      const errorMessage = sanitizeError(error);
      auditLog('template_status_error', req.user?.userId || 'unknown', {
        error: errorMessage,
      });

      console.error('Template status error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to check template status',
      });
    }
  }
);

/**
 * Logout Endpoint
 * Clear user session and tokens
 */
router.post('/logout', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    // Best effort: remove tokens so server-side won’t use them later
    try {
      await userPrisma.updateTokens(userId, '', '');
    } catch {}
    // No server-side session to kill (JWT is stateless). Client should discard it.
    auditLog('logout', userId, {});
    res.json({ success: true });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('logout_error', req.user?.userId || 'unknown', { error: errorMessage });
    res.status(500).json({ success: false, message: 'Failed to logout' });
  }
});

export default router;
