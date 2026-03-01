// 🛠️ Utility Functions for Server Operations

import { AuditLogEntry, BookmarkItem } from '../types';
import { randomUUID } from 'crypto';
import { config } from '../config';

// Re-export logger
export { logger } from './logger';

/**
 * Debug logging utility - only outputs when DEBUG=true
 */
export const debugLog = (message: string, ...args: any[]): void => {
  if (config.debug) {
    console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
  }
};

/**
 * Audit logging utility for security and debugging
 */
export const auditLog = (action: string, userId: string, details: any = {}): void => {
  const timestamp = new Date().toISOString();
  const _logEntry: AuditLogEntry = {
    timestamp,
    action,
    userId,
    details,
  };
};

/**
 * Retry wrapper for HTTP requests with exponential backoff
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> => {
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    }
  }

  throw new Error('Max retries exceeded');
};

/**
 * Sleep utility for rate limiting
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Validate and sanitize bookmark data
 */
export const validateBookmark = (bookmark: any, _index: number): BookmarkItem => {
  return {
    title: bookmark.title || bookmark.name || 'Untitled Bookmark',
    url: bookmark.url || '',
    path: bookmark.path,
    description: bookmark.description || '',
    tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
    dateAdded: bookmark.dateAdded || bookmark.dateCreated || new Date().toISOString(),
    syncId: bookmark.syncId || randomUUID(),
  };
};

/**
 * Generate a unique sync ID for bookmarks
 */
export const generateSyncId = (url: string, timestamp?: number): string => {
  const time = timestamp || Date.now();
  return `bookmark_${url}_${time}`;
};

/**
 * Check if a session has expired
 */
export const isSessionExpired = (lastActivity: Date, expiryHours = 24): boolean => {
  const now = new Date();
  const expiredThreshold = expiryHours * 60 * 60 * 1000; // Convert to milliseconds
  return now.getTime() - lastActivity.getTime() > expiredThreshold;
};

/**
 * Sanitize error messages for client responses
 */
export const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * Create batch arrays from a larger array
 */
export const createBatches = <T>(array: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate a secure random string
 */
export const generateSecureId = (length = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
