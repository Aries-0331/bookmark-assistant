// 🔐 OAuth Routes for Notion Integration

import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, OAuthExchangeRequest, UserData } from '../types';
import { validateExtension, validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError } from '../utils';

const router = Router();

/**
 * OAuth Token Exchange Endpoint
 * Exchanges authorization code for access/refresh tokens
 */
router.post('/exchange', validateExtension, async (req, res: Response) => {
  try {
    const { code, extensionUserId, redirectUri }: OAuthExchangeRequest & { redirectUri?: string } =
      req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required',
      });
    }

    if (!redirectUri) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'redirectUri is required',
      });
    }
    // Exchange code for tokens with Notion
    const tokenData = await notionService.exchangeOAuthCode(code, redirectUri);
    console.log('Received token data from Notion:', tokenData);
    const userId = extensionUserId || `user_${Date.now()}`;

    // Store user data securely on server
    const userData: UserData = {
      userId,
      notionAccessToken: tokenData.access_token,
      notionRefreshToken: tokenData.refresh_token,
      databases: [],
      lastActivity: new Date(),
    };

    // Persist in DB
    try {
      await userPrisma.upsert(userData);
    } catch (e) {
      console.warn('Prisma upsert failed:', e);
    }

    // Create JWT session token
    const sessionToken = jwt.sign({ userId, timestamp: Date.now() }, config.jwtSecret, {
      expiresIn: '24h',
    });

    // Resolve and persist template -> database mapping if available
    const dupId = (tokenData as any).duplicated_template_id as string | undefined;
    if (dupId) {
      try {
        const resolved = await notionService.resolveDatabaseFromTemplate(
          dupId,
          tokenData.access_token
        );
        try {
          await userPrisma.setResolvedDatabase(userId, resolved.databaseId, resolved.dataSourceId);
        } catch {}
      } catch (e) {
        console.warn('Failed to resolve database from duplicated_template_id:', e);
      }
    }

    auditLog('oauth_exchange_success', userId, {
      hasRefreshToken: !!tokenData.refresh_token,
    });

    // Fetch latest user data (may include resolved template info)
    const latest = await userPrisma.find(userId);
    res.json({
      success: true,
      sessionToken,
      userId,
      templateDatabaseId: latest?.templateDatabaseId || null,
      message: 'OAuth exchange successful',
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('oauth_exchange_error', req.body.extensionUserId || 'unknown', {
      error: errorMessage,
    });

    console.error('OAuth exchange error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process OAuth exchange',
    });
  }
});

/**
 * Token Refresh Endpoint
 * Refreshes expired access tokens using refresh token
 */
router.post('/refresh', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await userPrisma.find(userId);

    if (!userData || !userData.notionRefreshToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User session not found or no refresh token available',
      });
    }

    // Refresh the access token
    const newTokenData = await notionService.refreshAccessToken(userData.notionRefreshToken);

    // Update stored tokens
    try {
      await userPrisma.updateTokens(userId, newTokenData.access_token, newTokenData.refresh_token);
    } catch {}

    auditLog('token_refresh_success', userId);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('token_refresh_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token',
    });
  }
});

/**
 * OAuth Status Endpoint
 * Check if user has valid OAuth connection
 */
router.get('/status', validateSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userData = await userPrisma.find(userId);

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User session not found',
      });
    }

    // lastActivity is updated by DB writes elsewhere; no-op here

    res.json({
      success: true,
      hasValidToken: !!userData.notionAccessToken,
      hasRefreshToken: !!userData.notionRefreshToken,
      lastActivity: userData.lastActivity,
      templateDatabaseId: userData.templateDatabaseId,
    });
  } catch (error) {
    const errorMessage = sanitizeError(error);
    auditLog('oauth_status_error', req.user?.userId || 'unknown', {
      error: errorMessage,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check OAuth status',
    });
  }
});

export default router;
