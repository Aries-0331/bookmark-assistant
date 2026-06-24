export type {
  BookmarkTreeNodeLike,
  FormatBookmarkOptions,
  FormatSavedLinkInput,
  FormatSavedLinkOptions,
  SyncFingerprintItem,
} from './links.js';

export {
  buildBookmarkPath,
  flattenBookmarks,
  formatBookmarkForSync,
  formatSavedLinkForSync,
  toSyncFingerprintItems,
  withBookmarkType,
} from './links.js';
