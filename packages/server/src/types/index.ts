// 📝 Type Definitions for Bookmark Notion Sync Server

import { Request } from 'express';

export interface UserData {
  userId: string;
  notionAccessToken: string;
  notionRefreshToken?: string;
  databases?: any[];
  templateDatabaseId?: string;
  lastActivity: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export interface BookmarkItem {
  title: string;
  url: string;
  folder?: string;
  tags?: string[];
  dateAdded?: string;
  syncId?: string;
}

export interface OAuthExchangeRequest {
  code: string;
  extensionUserId?: string;
  templateDatabaseId?: string;
}

export interface BookmarkSyncOptions {
  batchSize?: number;
  duplicateHandling?: 'update' | 'skip' | 'create_new';
}

export interface BookmarkSyncRequest {
  databaseId: string;
  bookmarks: BookmarkItem[];
  options?: BookmarkSyncOptions;
}

export interface DatabaseQueryRequest {
  databaseId: string;
  filter?: any;
  sorts?: any[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId: string;
  details?: Record<string, any>;
}

export interface NotionPageProperties {
  Title: {
    title: { text: { content: string } }[];
  };
  URL: {
    url: string;
  };
  Folder: {
    rich_text: { text: { content: string } }[];
  };
  Tags: {
    multi_select: { name: string }[];
  };
  'Date Added': {
    date: { start: string };
  };
  'Sync ID': {
    rich_text: { text: { content: string } }[];
  };
}

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
