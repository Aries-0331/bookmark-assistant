import type { NotionSyncAdapter } from '@bookmark-sync/shared/notionSync/adapter';
import type { BookmarkPayload } from '@bookmark-sync/shared/types';
import { serverAPI } from '../lib/server-api';

export const proApi: NotionSyncAdapter = {
  async syncBookmarks(bookmarks: BookmarkPayload[]) {
    const res = await serverAPI.syncBookmarks(bookmarks as any);
    return { total: res.summary.total, success: res.summary.success, failed: res.summary.failed };
  },
};
