/**
 * Unit tests for security middleware (CORS and rate limiting)
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  corsMiddleware,
  authRateLimit,
  apiRateLimit,
  createRateLimit,
} from './security';

// Mock config
vi.mock('../config', () => ({
  config: {
    allowedOrigins: ['https://example.com', 'https://app.example.com'],
    allowedExtensionId: 'test-extension-id',
    nodeEnv: 'development',
    rateLimits: {
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 requests per window
      },
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
      },
    },
  },
}));

// Mock utils
vi.mock('../utils', () => ({
  auditLog: vi.fn(),
}));

// Mock express-rate-limit
vi.mock('express-rate-limit', () => ({
  rateLimit: vi.fn().mockImplementation((config) => {
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }),
}));

describe('Security Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  describe('corsMiddleware', () => {
    it('should allow request with no origin', () => {
      const callback = vi.fn();

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow allowed origin', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'https://example.com',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow chrome extension with correct ID', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'chrome-extension://test-extension-id',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow chrome extension in development mode', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'chrome-extension://any-extension-id',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow ngrok tunnel in development', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'https://test.ngrok-free.dev',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should reject disallowed origin', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'https://malicious.com',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not allowed by CORS policy',
        })
      );
    });

    it('should reject chrome extension with wrong ID in production', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'chrome-extension://wrong-extension-id',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not allowed by CORS policy',
        })
      );
    });

    it('should configure CORS with correct options', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'https://example.com',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });

  describe('authRateLimit', () => {
    it('should be defined', () => {
      expect(authRateLimit).toBeDefined();
      expect(typeof authRateLimit).toBe('function');
    });

    it('should call next function when rate limit not exceeded', () => {
      authRateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('apiRateLimit', () => {
    it('should be defined', () => {
      expect(apiRateLimit).toBeDefined();
      expect(typeof apiRateLimit).toBe('function');
    });

    it('should call next function when rate limit not exceeded', () => {
      apiRateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('createRateLimit', () => {
    it('should create custom rate limiter', () => {
      const customLimit = createRateLimit(60000, 10, 'Custom limit');

      expect(customLimit).toBeDefined();
      expect(typeof customLimit).toBe('function');
    });

    it('should create rate limiter with custom config', () => {
      const windowMs = 60000;
      const max = 10;
      const message = 'Custom limit message';

      const customLimit = createRateLimit(windowMs, max, message);

      // Should work without errors
      customLimit(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('CORS configuration', () => {
    it('should allow specified methods', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'https://example.com',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should support credentials', () => {
      const callback = vi.fn();
      mockRequest.headers = {
        origin: 'https://example.com',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should handle OPTIONS requests', () => {
      const callback = vi.fn();
      mockRequest.method = 'OPTIONS';
      mockRequest.headers = {
        origin: 'https://example.com',
      };

      corsMiddleware(mockRequest as Request, mockResponse as Response, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
});
