import type { BookmarkPayload } from '@bookmark-sync/shared/types';
import { serverAPI } from '../lib/server-api';

// Business-only API: always use server (OAuth) backend
export const api = {
	async syncBookmarks(bookmarks: BookmarkPayload[]) {
		const res = await serverAPI.syncBookmarks(bookmarks as any);
		return { total: res.summary.total, success: res.summary.success, failed: res.summary.failed };
	},
};
