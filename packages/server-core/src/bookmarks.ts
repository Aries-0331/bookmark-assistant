import type { LinkCaptureSource, LinkItem } from '@bookmark-assistant/contracts';

export interface DiffBookmarksStats {
  requestTotal: number;
  existingIndexSize: number;
  matchedBySyncId: number;
  matchedByUrl: number;
}

export interface DiffBookmarksOutcome {
  toCreate: LinkItem[];
  skippedExisting: number;
  stats: DiffBookmarksStats;
}

export interface ValidateBookmarkOptions {
  now?: () => Date;
  createSyncId?: () => string;
}

export function selectUnsyncedDescribedBookmarks(
  bookmarks: readonly LinkItem[],
  existingUrls: readonly string[],
  existingSyncIds: readonly string[]
): LinkItem[] {
  const existingUrlSet = new Set(existingUrls);
  const existingSyncIdSet = new Set(existingSyncIds);

  return bookmarks.filter((bookmark) => {
    if (!bookmark.description?.trim()) {
      return false;
    }

    return !(
      (bookmark.url && existingUrlSet.has(bookmark.url)) ||
      (bookmark.syncId && existingSyncIdSet.has(bookmark.syncId))
    );
  });
}

export function normalizeBookmarkForSyncPlanning(bookmark: LinkItem): LinkItem {
  const normalized: LinkItem = {
    title: bookmark.title,
    url: bookmark.url,
  };

  if (bookmark.path !== undefined) {
    normalized.path = bookmark.path;
  }
  if (bookmark.description !== undefined) {
    normalized.description = bookmark.description;
  }
  if (bookmark.tags !== undefined) {
    normalized.tags = [...bookmark.tags];
  }
  if (bookmark.dateAdded !== undefined) {
    normalized.dateAdded = bookmark.dateAdded;
  }
  if (bookmark.syncId !== undefined) {
    normalized.syncId = bookmark.syncId;
  }
  if (bookmark.type !== undefined) {
    normalized.type = bookmark.type;
  }
  if (bookmark.readState !== undefined) {
    normalized.readState = bookmark.readState;
  }
  if (bookmark.source !== undefined) {
    normalized.source = bookmark.source;
  }

  return normalized;
}

export function diffBookmarks(
  accepted: LinkItem[],
  existingUrls: readonly string[],
  existingSyncIds: readonly string[]
): DiffBookmarksOutcome {
  let duplicateCount = 0;
  let matchedBySyncId = 0;
  let matchedByUrl = 0;

  const toCreate: LinkItem[] = [];
  for (const item of accepted) {
    let isDuplicate = false;

    if (item.syncId && existingSyncIds.includes(item.syncId)) {
      isDuplicate = true;
      matchedBySyncId++;
    } else if (item.url && existingUrls.includes(item.url)) {
      isDuplicate = true;
      matchedByUrl++;
    }

    if (isDuplicate) {
      duplicateCount++;
    } else {
      toCreate.push(item);
    }
  }

  return {
    toCreate,
    skippedExisting: accepted.length - toCreate.length,
    stats: {
      requestTotal: accepted.length,
      existingIndexSize: duplicateCount,
      matchedBySyncId,
      matchedByUrl,
    },
  };
}

export function validateBookmarkInput(
  bookmark: unknown,
  options: ValidateBookmarkOptions = {}
): LinkItem {
  return validateLinkItemInput(bookmark, options);
}

export function validateLinkItemInput(
  item: unknown,
  options: ValidateBookmarkOptions = {}
): LinkItem {
  const input = isRecord(item) ? item : {};
  const now = options.now ?? (() => new Date());
  const createSyncId = options.createSyncId ?? (() => `bookmark-${Date.now()}`);
  const type = input.type === 'bookmark' || input.type === 'reading_list' ? input.type : undefined;
  const readState =
    input.readState === 'READ' || input.readState === 'UNREAD' ? input.readState : undefined;
  const source = toLinkCaptureSource(input.source);

  const validated: LinkItem = {
    title: stringOr(input.title, stringOr(input.name, 'Untitled Bookmark')),
    url: stringOr(input.url, ''),
    path: optionalString(input.path),
    description: stringOr(input.description, ''),
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    dateAdded: stringOr(input.dateAdded, stringOr(input.dateCreated, now().toISOString())),
    syncId: stringOr(input.syncId, createSyncId()),
  };

  if (type) {
    validated.type = type;
  }
  if (readState) {
    validated.readState = readState;
  }
  if (source) {
    validated.source = source;
  }

  return validated;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toLinkCaptureSource(value: unknown): LinkCaptureSource | undefined {
  switch (value) {
    case 'chrome_bookmark':
    case 'reading_list':
    case 'current_page':
    case 'context_menu':
    case 'import':
      return value;
    default:
      return undefined;
  }
}
