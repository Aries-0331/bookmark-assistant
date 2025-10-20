export interface BookmarkPayload {
  title: string;
  url: string;
  description?: string;
  path?: string;
  dateAdded?: string;
  syncId?: string;
}

export interface NotionDatabaseSummary {
  id: string;
  title: string;
}
