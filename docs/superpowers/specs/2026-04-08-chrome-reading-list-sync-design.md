# Chrome Reading List to Notion Sync — Design

## Overview

Sync Chrome's reading list to the same Notion database as bookmarks, with a "Type" single-select to distinguish item kinds and a "Read State" status to track read/unread progress.

## Goals

1. Read Chrome's reading list via `chrome.readingList` API (Chrome 120+)
2. Sync reading list items alongside bookmarks in a single operation
3. Add "Type" single-select property ("Bookmark" vs "Reading List")
4. Add "Read State" status property ("Unread" vs "Read") for reading list items
5. One-way sync only (Chrome → Notion; changes in Chrome don't update existing Notion records)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION                             │
├─────────────────────────────────────────────────────────────────────┤
│ 1. chrome.bookmarks.getTree()        → type: "bookmark"              │
│ 2. chrome.readingList.query({})      → type: "reading_list"         │
│ 3. Combined into single bookmarks[] array with type field            │
│ 4. SHA-256 fingerprint (includes reading list items)                │
│ 5. POST /api/bookmarks/sync          → unified sync request          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            SERVER API                                │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/bookmarks/sync                                            │
│   • Same processing pipeline for both types                          │
│   • Sets "Type" single-select = "Bookmark" or "Reading List"         │
│   • Sets "Read State" status = "Unread" or "Read"                   │
│   • Path set to empty string for reading list items                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Extension — `BookmarkItem` Interface

```typescript
interface BookmarkItem {
  title: string;
  url: string;
  path?: string;                  // bookmark folder path; empty for reading list
  description?: string;
  tags?: string[];
  dateAdded?: string;
  syncId?: string;
  type: 'bookmark' | 'reading_list';  // item type
  readState?: 'UNREAD' | 'READ';      // from chrome.readingList
}
```

### Server — Types Update

```typescript
// packages/server/src/types/index.ts
interface BookmarkItem {
  title: string;
  url: string;
  path?: string;
  description?: string;
  tags?: string[];
  dateAdded?: string;
  syncId?: string;
  type?: 'bookmark' | 'reading_list';  // NEW: optional for backward compat
  readState?: 'UNREAD' | 'READ';        // NEW
}
```

### Notion Properties

| Property     | Type          | Source                                  |
|-------------|---------------|------------------------------------------|
| Name        | title         | `title`                                  |
| URL         | url           | `url`                                    |
| Tags        | multi_select  | `tags`                                   |
| Description | rich_text     | `description`                            |
| Path        | rich_text     | `path` (empty string for reading list)   |
| Date Added  | date          | `dateAdded`                              |
| Sync ID     | rich_text     | `syncId`                                 |
| Type        | single_select | `"Bookmark"` or `"Reading List"`        |
| Read State  | status        | `"Unread"` or `"Read"` (reading_list only) |

---

## Sync Flow

### Extension Changes

**1. New utility: `packages/extension/src/utils/reading-list.ts`**

```typescript
export async function getReadingListItems(): Promise<Omit<BookmarkItem, 'path' | 'description' | 'tags'>[]> {
  if (!chrome.readingList) {
    console.warn('chrome.readingList not available (Chrome 120+ required)');
    return [];
  }

  const items = await chrome.readingList.query({});
  return items.map(item => ({
    title: item.title,
    url: item.url,
    dateAdded: item.dateAdded?.toString(),
    readState: item.readState?.state,  // "UNREAD" or "READ"
    syncId: generateUuid(),
    type: 'reading_list' as const,
  }));
}
```

**2. Modified: `packages/extension/src/background/index.ts` — `performBookmarkSync()`**

```
1. Get bookmark tree → flattenBookmarks() → assign type="bookmark"
2. Get reading list → getReadingListItems() → assign type="reading_list"
3. Combine into single array
4. Generate fingerprint (includes reading list items for change detection)
5. If changed → serverAPI.syncBookmarks(combinedItems)
```

**3. Server API: no changes needed** — same `syncBookmarks()` accepts mixed item types

### Server Changes

**1. Property mapping config — `packages/server/src/services/notion.ts`**

```typescript
// Add to PROPERTY_MAPPING_CONFIG:
{
  bookmarkField: 'type',
  type: 'single_select',
  patterns: [/type/i],
  builder: (v) => ({
    single_select: v === 'reading_list' ? { name: 'Reading List' } : { name: 'Bookmark' }
  })
},
{
  bookmarkField: 'readState',
  type: 'status',
  patterns: [/read.*state/i, /status/i],
  builder: (v) => ({
    status: v === 'READ' ? { name: 'Read' } : { name: 'Unread' }
  })
}
```

**2. Backward compatibility**: Items without `type` field default to `"Bookmark"` (server sets Type = "Bookmark")

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Reading list empty | Skip, sync only bookmarks |
| `chrome.readingList` API unavailable (Chrome < 120) | Log warning, skip reading list entirely, continue with bookmarks |
| All reading list items already synced | Server returns empty diff, no Notion writes |
| Mixed array (bookmarks + reading list) | Same sync flow, server handles both types |
| Existing bookmark pages | Backward compat: Type = "Bookmark" set on next sync |

### Chrome API Availability Check

```typescript
// In getReadingListItems() — always check before calling
if (!chrome.readingList) {
  console.warn('chrome.readingList not available');
  return [];
}
```

---

## Files to Modify

| Package | File | Change |
|---------|------|--------|
| extension | `src/utils/reading-list.ts` | NEW — reading list collection utility |
| extension | `src/types.ts` | Add `type` and `readState` to `BookmarkItem` |
| extension | `src/background/index.ts` | Call reading list API, combine with bookmarks |
| server | `src/types/index.ts` | Add `type` and `readState` to `BookmarkItem` |
| server | `src/services/notion.ts` | Add Type + Read State to property mapping config |

---

## Notion Database Setup

Users need to add two new properties to their Notion database:

1. **Type** (single-select)
   - Options: "Bookmark", "Reading List"

2. **Read State** (status)
   - Options: "Unread", "Read"
   - Note: Status property in Notion allows grouping (Not Started, In Progress, Complete) but for simplicity we use just two states

---

## Testing Considerations

1. **Unit tests** for `getReadingListItems()` with mocked `chrome.readingList`
2. **Unit tests** for property mapping with mixed item types
3. **Integration test** with mock Notion API verifying Type + Read State are set correctly
4. **Manual test** on Chrome 120+ with actual reading list items
