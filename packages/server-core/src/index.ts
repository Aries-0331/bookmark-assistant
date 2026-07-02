export type {
  DiffBookmarksOutcome,
  DiffBookmarksStats,
  ValidateBookmarkOptions,
} from './bookmarks';
export type { DescriptionSource, HtmlDescriptionResult } from './descriptions';

export {
  diffBookmarks,
  normalizeBookmarkForSyncPlanning,
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
export { isFetchableHttpUrl, isValidUrl, normalizeUrlForSync } from './urls';
