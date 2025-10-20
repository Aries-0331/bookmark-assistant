import type { BookmarkPayload, NotionDatabaseSummary } from '../types/index';

export interface NotionSyncAdapter {
  syncBookmarks(bookmarks: BookmarkPayload[]): Promise<{
    total: number;
    success: number;
    failed: number;
  }>;
  listDatabases?(): Promise<NotionDatabaseSummary[]>;
}
