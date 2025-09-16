// 👤 User Profile and Template Management Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userStorage } from '../services/userStorage';
import { auditLog, sanitizeError } from '../utils';

const router = Router();

/**
 * User Profile & Status
 * Get current user information and status
 */
router.get('/profile', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = userStorage.getUser(userId);

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
    }

    userStorage.updateLastActivity(userId);

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
    const userData = userStorage.getUser(userId);
    const { templateDatabaseId } = req.body;

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User data not found',
      });
    }

    // Update template database ID if provided
    if (templateDatabaseId) {
      userStorage.setTemplateDatabase(userId, templateDatabaseId);
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
router.get('/session-stats', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Only allow this for specific admin users or in development
    const isAdmin =
      process.env.NODE_ENV === 'development' ||
      process.env.ADMIN_USER_IDS?.split(',').includes(userId);

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    const stats = userStorage.getSessionStats();

    auditLog('session_stats_access', userId, stats);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('session_stats_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Session stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch session statistics',
    });
  }
});

/**
 * Template Duplication Endpoint
 * Duplicate the bookmark template for the user
 */
router.post(
  '/template/duplicate',
  validateSession,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userData = userStorage.getUser(userId);

      if (!userData) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User data not found',
        });
      }

      // Duplicate the template page
      const duplicatedPage = await notionService.duplicateTemplate(userData.notionAccessToken);

      // Store the template database ID
      userStorage.setTemplateDatabase(userId, duplicatedPage.id);

      auditLog('template_duplicate_success', userId, {
        templateId: duplicatedPage.id,
        title: '📚 Chrome Bookmarks DB',
      });

      res.json({
        success: true,
        databaseId: duplicatedPage.id,
        title: '📚 Chrome Bookmarks DB',
        url: duplicatedPage.url,
        message: 'Template duplicated successfully',
      });
    } catch (error) {
      const errorMessage = sanitizeError(error);
      auditLog('template_duplicate_error', req.user?.userId || 'unknown', {
        error: errorMessage,
      });

      console.error('Template duplication error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to duplicate template',
      });
    }
  }
);

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
      const userData = userStorage.getUser(userId);

      if (!userData) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User data not found',
        });
      }

      const hasTemplate = !!userData.templateDatabaseId;

      userStorage.updateLastActivity(userId);

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

    // Remove user data from storage
    const deleted = userStorage.deleteUser(userId);

    auditLog('user_logout', userId, {
      sessionDeleted: deleted,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('logout_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout',
    });
  }
});

export default router;
