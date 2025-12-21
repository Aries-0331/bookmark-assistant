// 🔐 OAuth Routes for Notion Integration

import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, OAuthExchangeRequest } from '../types';
import { validateExtension, validateSession } from '../middleware/auth';
import { notionService } from '../services/notion';
import { userPrisma, prisma } from '../services/userPrisma';
import { config } from '../config';
import { auditLog, sanitizeError } from '../utils';

const router: import('express').Router = Router();

/**
 * OAuth Token Exchange Endpoint
 * Exchanges authorization code for access/refresh tokens
 */
router.post('/exchange', validateExtension, async (req, res: Response) => {
  try {
    const { code, redirectUri }: OAuthExchangeRequest & { redirectUri?: string } = req.body;

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

    // Extract Notion User Info
    const notionUser = tokenData.owner?.user;
    const notionUserId = notionUser?.id;
    const notionEmail = notionUser?.person?.email || notionUser?.email;

    if (!notionUserId) {
      throw new Error('Failed to get Notion User ID from token exchange');
    }

    console.log(`🔐 OAuth Exchange for Notion User: ${notionUserId} (${notionEmail})`);

    let user: any; // Prisma User model

    // 2. Step 1: Try Login via Notion ID
    const existingUser = await prisma.user.findUnique({
      where: { notionUserId },
    });

    if (existingUser) {
      console.log(`✅ Found existing user by Notion ID: ${existingUser.id}`);
      // Update tokens and activity
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          notionAccessToken: tokenData.access_token,
          notionRefreshToken: tokenData.refresh_token || existingUser.notionRefreshToken,
          notionWorkspaceId: tokenData.workspace_id,
          lastActivity: new Date(),
        },
      });
    } else {
      // 3. Step 2: Try Reconciliation via Email (if Step 1 failed)
      if (notionEmail) {
        const paidUser = await prisma.user.findUnique({
          where: { email: notionEmail },
        });

        if (paidUser) {
          console.log(
            `🔗 Found existing paid user by email: ${paidUser.id}. Linking Notion account...`
          );
          // MERGE: Link Notion account to existing paid user
          user = await prisma.user.update({
            where: { id: paidUser.id },
            data: {
              notionUserId: notionUserId,
              notionAccessToken: tokenData.access_token,
              notionRefreshToken: tokenData.refresh_token,
              notionWorkspaceId: tokenData.workspace_id,
              lastActivity: new Date(),
            },
          });
        } else {
          console.log(`Mw New user creation for ${notionEmail}`);
          // CREATE NEW
          user = await prisma.user.create({
            data: {
              email: notionEmail,
              notionUserId: notionUserId,
              notionAccessToken: tokenData.access_token,
              notionRefreshToken: tokenData.refresh_token,
              notionWorkspaceId: tokenData.workspace_id,
              plan: 'free',
            },
          });
        }
      } else {
        console.warn('⚠️ No email provided by Notion. Cannot reconcile or create user.');
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email is required from Notion to create an account.',
        });
      }
    }

    // Create JWT session token using the internal ID (CUID)
    const sessionToken = jwt.sign({ userId: user.id, timestamp: Date.now() }, config.jwtSecret, {
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
        // Update user with resolved DB
        await prisma.user.update({
          where: { id: user.id },
          data: {
            templateDatabaseId: dupId,
            duplicatedTemplateId: dupId, // Sync to both fields for compatibility
            notionDatabaseId: resolved.databaseId,
            notionDataSourceId: resolved.dataSourceId || null,
          },
        });
      } catch (e) {
        console.warn('Failed to resolve database from duplicated_template_id:', e);
      }
    }

    auditLog('oauth_exchange_success', user.id, {
      hasRefreshToken: !!tokenData.refresh_token,
      plan: user.plan,
    });

    // Fetch latest user data
    const latest = await prisma.user.findUnique({ where: { id: user.id } });

    res.json({
      success: true,
      sessionToken,
      userId: user.id, // Return internal ID
      userEmail: latest?.email || null,
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
