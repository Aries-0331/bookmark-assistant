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
export { isFetchableHttpUrl, isValidUrl, normalizeUrlForSync } from './urls';
