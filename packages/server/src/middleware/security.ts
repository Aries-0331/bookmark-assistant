// 🔒 CORS and Rate Limiting Middleware

import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { auditLog } from '../utils';

/**
 * CORS configuration
 * Only allows requests from authorized origins
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (config.allowedOrigins.includes(origin as any)) {
      return callback(null, true);
    }

    console.warn(`🚫 Blocked CORS request from: ${origin}`);
    auditLog('cors_blocked', 'unknown', { origin });

    return callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,
  optionsSuccessStatus: 200, // Support legacy browsers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Extension-ID', 'X-Requested-With'],
});

/**
 * Rate limiting for authentication endpoints
 * More restrictive to prevent brute force attacks
 */
export const authRateLimit = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil(config.rateLimits.auth.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLog('auth_rate_limit_exceeded', 'unknown', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: Math.ceil(config.rateLimits.auth.windowMs / 1000),
    });
  },
});

/**
 * Rate limiting for API endpoints
 * More generous for regular API usage
 */
export const apiRateLimit = rateLimit({
  windowMs: config.rateLimits.api.windowMs,
  max: config.rateLimits.api.max,
  message: {
    error: 'Too Many Requests',
    message: 'Too many API requests, please try again later.',
    retryAfter: Math.ceil(config.rateLimits.api.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLog('api_rate_limit_exceeded', req.user?.userId || 'unknown', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.path,
    });

    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many API requests, please try again later.',
      retryAfter: Math.ceil(config.rateLimits.api.windowMs / 1000),
    });
  },
});

/**
 * Create custom rate limiter with specific configuration
 */
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too Many Requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
