// 📝 Type Definitions for Bookmark Notion Sync Server

import { Request } from 'express';
import type {
  ApiResponse as ContractApiResponse,
  BookmarkSyncOptions as ContractBookmarkSyncOptions,
  BookmarkSyncRequest as ContractBookmarkSyncRequest,
  BookmarkSyncResponse as ContractBookmarkSyncResponse,
  BookmarkSyncResult as ContractBookmarkSyncResult,
  BookmarkSyncSummary as ContractBookmarkSyncSummary,
  LinkItem,
  NotionPageProperties as ContractNotionPageProperties,
} from '@bookmark-assistant/contracts';

export interface UserData {
  id?: string; // Internal ID (CUID)
  userId: string; // Notion User ID (Legacy name, maps to notionUserId)
  email?: string; // Required for new schema
  notionAccessToken: string;
  notionRefreshToken?: string;
  databases?: any[];
  templateDatabaseId?: string;
  notionDatabaseId?: string;
  notionDataSourceId?: string;
  notionWorkspaceId?: string;
  botId?: string;
  duplicatedTemplateId?: string;
  lastActivity: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export type BookmarkItem = LinkItem;

export interface OAuthExchangeRequest {
  code: string;
  extensionUserId?: string;
  templateDatabaseId?: string;
  redirectUri?: string;
}

export type BookmarkSyncOptions = ContractBookmarkSyncOptions;

export type BookmarkSyncRequest = ContractBookmarkSyncRequest;
export type BookmarkSyncResult = ContractBookmarkSyncResult;
export type BookmarkSyncSummary = ContractBookmarkSyncSummary;
export type BookmarkSyncResponse = ContractBookmarkSyncResponse;

export interface DatabaseQueryRequest {
  // Prefer dataSourceId with 2025-09-03
  dataSourceId?: string;
  // Back-compat
  databaseId?: string;
  filter?: any;
  sorts?: any[];
}

export type ApiResponse<T = any> = ContractApiResponse<T>;

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId: string;
  details?: Record<string, any>;
}

export type NotionPageProperties = ContractNotionPageProperties;

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}
