export type {
  DiffBookmarksOutcome,
  DiffBookmarksStats,
  ValidateBookmarkOptions,
} from './bookmarks';
export type { DescriptionSource, HtmlDescriptionResult } from './descriptions';
export type {
  BuildBookmarkPropertiesOptions,
  NotionPropertySchema,
  NotionSchemaProperty,
} from './notion-properties';
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
  isReadOnlyNotionPropertyType,
} from './notion-properties';
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
