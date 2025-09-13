export interface BookmarkData {
	id: string;
	url: string;
	title: string;
	dateAdded: number;
	parentId?: string;
	index?: number;
}

export interface ProcessedBookmark extends BookmarkData {
	tags: string[];
	summary?: string;
	content?: string;
	extractedAt: string;
}

export interface BookmarkSyncStatus {
	bookmarkId: string;
	status: "pending" | "processing" | "success" | "failed";
	error?: string;
	syncedAt?: string;
	notionPageId?: string;
}

export interface SyncSettings {
	generateTags: boolean;
	generateSummary: boolean;
	extractContent: boolean;
	autoSync: boolean;
}

export type MessageType =
	| "NOTION_OAUTH"
	| "SYNC_BOOKMARK"
	| "GET_SYNC_STATUS"
	| "UPDATE_SETTINGS";

export interface ChromeMessage {
	type: MessageType;
	payload?:
		| BookmarkData
		| ProcessedBookmark
		| BookmarkSyncStatus
		| SyncSettings
		| undefined;
}

export interface ChromeMessageResponse {
	ok: boolean;
	data?:
		| BookmarkData
		| ProcessedBookmark
		| BookmarkSyncStatus
		| SyncSettings
		| undefined;
	error?: string;
}
