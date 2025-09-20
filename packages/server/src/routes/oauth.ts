// 🔐 OAuth Routes for Notion Integration

import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, OAuthExchangeRequest, UserData } from '../types';
import { validateExtension, validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userStorage } from '../services/userStorage';
import { config } from '../config';
import { auditLog, sanitizeError } from '../utils';

const router = Router();

/**
 * OAuth Token Exchange Endpoint
 * Exchanges authorization code for access/refresh tokens
 */
router.post('/exchange', validateExtension, async (req, res: Response) => {
  try {
    const {
      code,
      extensionUserId,
      templateDatabaseId,
      redirectUri,
    }: OAuthExchangeRequest & { redirectUri?: string } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required',
      });
    }

    // Use the redirect URI from the request, or fall back to default
    const actualRedirectUri =
      redirectUri || `chrome-extension://${config.allowedExtensionId}/oauth-callback.html`;

    // Exchange code for tokens with Notion
    const tokenData = await notionService.exchangeOAuthCode(code, actualRedirectUri);

    const userId = extensionUserId || `user_${Date.now()}`;

    // Store user data securely on server
    const userData: UserData = {
      userId,
      notionAccessToken: tokenData.access_token,
      notionRefreshToken: tokenData.refresh_token,
      templateDatabaseId,
      databases: [],
      lastActivity: new Date(),
    };

    userStorage.setUser(userId, userData);

    // Create JWT session token
    const sessionToken = jwt.sign({ userId, timestamp: Date.now() }, config.jwtSecret, {
      expiresIn: '24h',
    });

    auditLog('oauth_exchange_success', userId, {
      hasRefreshToken: !!tokenData.refresh_token,
      templateDatabaseId,
    });

    res.json({
      success: true,
      sessionToken,
      userId,
      templateDatabaseId: templateDatabaseId || null,
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
    const userData = userStorage.getUser(userId);

    if (!userData || !userData.notionRefreshToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User session not found or no refresh token available',
      });
    }

    // Refresh the access token
    const newTokenData = await notionService.refreshAccessToken(userData.notionRefreshToken);

    // Update stored tokens
    userStorage.updateTokens(userId, newTokenData.access_token, newTokenData.refresh_token);

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
    const userData = userStorage.getUser(userId);

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User session not found',
      });
    }

    userStorage.updateLastActivity(userId);

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
