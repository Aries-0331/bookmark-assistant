export type {
  DiffBookmarksOutcome,
  DiffBookmarksStats,
  ValidateBookmarkOptions,
} from './bookmarks';
export type { DescriptionSource, HtmlDescriptionResult } from './descriptions';
export type {
  BuildBookmarkPropertiesOptions,
  ExtractNotionPageFolderAndTagsOptions,
  ExtractNotionPageFolderAndTagsResult,
  ExtractNotionPageLinkKeysResult,
  NotionPageLike,
  NotionPagePropertiesLike,
  NotionPagePropertyValueLike,
  NotionPropertySchema,
  NotionRichTextFragmentLike,
  NotionSchemaProperty,
} from './notion-properties';
export type { NotionDatabaseLike, NotionDataSourceLike } from './notion-database';
export type { PersistenceErrorLike } from './persistence';
export type { BookmarkSyncResultWithRetryState } from './sync-results';

export {
  diffBookmarks,
  normalizeBookmarkForSyncPlanning,
  selectUnsyncedDescribedBookmarks,
  validateBookmarkInput,
  validateLinkItemInput,
} from './bookmarks';
export {
  extractContentFromStructuredElements,
  extractDescriptionFromHtml,
  isValidDescription,
  looksLikeDescription,
  sanitizeDescription,
} from './descriptions';
export {
  buildBookmarkPropertiesFromNotionSchema,
  extractNotionPageFolderAndTags,
  extractNotionPageLinkKeys,
  isReadOnlyNotionPropertyType,
} from './notion-properties';
export { getPrimaryNotionDataSourceId, hasNotionDataSourceId } from './notion-database';
export { isRetryablePersistenceError } from './persistence';
export {
  isRetryableSyncError,
  mergeRetryResults,
  selectRetryableSyncFailures,
} from './sync-results';
export {
  buildGoogleS2FaviconUrl,
  isFetchableHttpUrl,
  isValidUrl,
  normalizeUrlForSync,
} from './urls';
export type { BuildGoogleS2FaviconUrlOptions } from './urls';
