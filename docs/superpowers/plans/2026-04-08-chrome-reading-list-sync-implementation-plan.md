# Chrome Reading List Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync Chrome's reading list to Notion alongside bookmarks, with "Type" single-select and "Read State" status properties.

**Architecture:** Extend existing bookmark sync flow to also read Chrome's `chrome.readingList` API (Chrome 120+), combine items into single payload, and add Type + Read State property mapping on server.

**Tech Stack:** Chrome Extension MV3, TypeScript, Express server, Notion API 2025-09-03

---

## File Structure

```
packages/extension/src/
├── utils/
│   └── reading-list.ts          # NEW — Chrome reading list collection
├── background/
│   ├── index.ts                # MODIFY — call getReadingListItems(), combine with bookmarks
│   └── sync.test.ts            # MODIFY — add reading list sync tests

packages/server/src/
├── types/index.ts               # MODIFY — add type, readState to BookmarkItem
└── services/notion.ts          # MODIFY — add Type + Read State property matchers
```

---

## Task 1: Create Extension Reading List Utility

**Files:**
- Create: `packages/extension/src/utils/reading-list.ts`
- Test: `packages/extension/src/utils/reading-list.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/extension/src/utils/reading-list.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReadingListItems } from './reading-list';

describe('getReadingListItems', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return empty array when chrome.readingList is unavailable', async () => {
    // @ts-ignore - testing browser API absence
    delete globalThis.chrome?.readingList;

    const result = await getReadingListItems();
    expect(result).toEqual([]);
  });

  it('should return reading list items with correct shape', async () => {
    const mockItems = [
      {
        title: 'Test Article',
        url: 'https://example.com/article',
        dateAdded: { toString: () => '2024-01-15T10:00:00.000Z' },
        readState: { state: 'UNREAD' },
      },
    ];

    // @ts-ignore
    globalThis.chrome ??= {};
    // @ts-ignore
    globalThis.chrome.readingList = {
      getContents: vi.fn().mockResolvedValue(mockItems),
    };

    const result = await getReadingListItems();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Test Article',
      url: 'https://example.com/article',
      readState: 'UNREAD',
      type: 'reading_list',
    });
    expect(result[0].syncId).toBeDefined();
  });

  it('should map READ state correctly', async () => {
    const mockItems = [
      {
        title: 'Read Article',
        url: 'https://example.com/read',
        dateAdded: { toString: () => '2024-01-15T10:00:00.000Z' },
        readState: { state: 'READ' },
      },
    ];

    // @ts-ignore
    globalThis.chrome ??= {};
    // @ts-ignore
    globalThis.chrome.readingList = {
      getContents: vi.fn().mockResolvedValue(mockItems),
    };

    const result = await getReadingListItems();
    expect(result[0].readState).toBe('READ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/extension/src/utils/reading-list.test.ts -v`
Expected: FAIL — "getReadingListItems is not defined" or import error

- [ ] **Step 3: Write minimal implementation**

```typescript
// packages/extension/src/utils/reading-list.ts

export interface ReadingListItem {
  title: string;
  url: string;
  dateAdded?: string;
  readState?: 'UNREAD' | 'READ';
  syncId: string;
  type: 'reading_list';
}

/**
 * Collect all items from Chrome's reading list API.
 * Returns empty array if API is unavailable (Chrome < 120).
 */
export async function getReadingListItems(): Promise<ReadingListItem[]> {
  if (!chrome.readingList) {
    console.warn('[ReadingList] chrome.readingList not available (Chrome 120+ required)');
    return [];
  }

  const items = await chrome.readingList.query({});

  return items.map((item: any) => ({
    title: item.title || 'Untitled',
    url: item.url || '',
    dateAdded: item.dateAdded?.toString(),
    readState: item.readState?.state,
    syncId:
      globalThis.crypto && 'randomUUID' in globalThis.crypto
        ? (globalThis.crypto as any).randomUUID()
        : `reading-list-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'reading_list' as const,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- packages/extension/src/utils/reading-list.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/extension/src/utils/reading-list.ts packages/extension/src/utils/reading-list.test.ts
git commit -m "feat(extension): add getReadingListItems utility for Chrome reading list API"
```

---

## Task 2: Modify Extension Background Sync to Include Reading List

**Files:**
- Modify: `packages/extension/src/background/index.ts:236-423` (performBookmarkSync function)

- [ ] **Step 1: Write the failing test**

```typescript
// Add to packages/extension/src/background/sync.test.ts

it('should include reading list items in sync when available', async () => {
  const mockReadingListItems = [
    {
      title: 'Reading List Article',
      url: 'https://example.com/rl-article',
      dateAdded: '2024-01-15T10:00:00.000Z',
      readState: { state: 'UNREAD' },
    },
  ];

  // Setup chrome.readingList mock
  // @ts-ignore
  globalThis.chrome ??= {};
  // @ts-ignore
  globalThis.chrome.readingList = {
    getContents: vi.fn().mockResolvedValue(mockReadingListItems),
  };

  // Mock bookmarks tree
  // @ts-ignore
  globalThis.chrome.bookmarks ??= {};
  // @ts-ignore
  globalThis.chrome.bookmarks.getTree = vi.fn().mockResolvedValue([
    {
      children: [
        { title: 'Folder', children: [] },
      ],
    },
  ]);

  // ... rest of test verifying reading list items are included in syncBookmarks call
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- packages/extension/src/background/sync.test.ts -v`
Expected: FAIL — reading list items not yet included

- [ ] **Step 3: Modify performBookmarkSync to collect reading list items**

In `packages/extension/src/background/index.ts`, after line 298 (`console.log('[Sync] Flattened ${formatted.length} bookmarks');`), add:

```typescript
    // Collect reading list items
    let readingListItems: any[] = [];
    try {
      const { getReadingListItems } = await import('../utils/reading-list');
      readingListItems = await getReadingListItems();
      if (readingListItems.length > 0) {
        console.log(`[Sync] Found ${readingListItems.length} reading list items`);
      }
    } catch (err) {
      console.warn('[Sync] Failed to get reading list items:', err);
    }

    // Add type='bookmark' to regular bookmarks and combine
    const bookmarksWithType = formatted.map((bm: any) => ({
      ...bm,
      type: 'bookmark',
    }));

    // Combine bookmarks and reading list items for unified sync
    const allItems = [...bookmarksWithType, ...readingListItems];
    console.log(`[Sync] Total items to sync: ${allItems.length} (${formatted.length} bookmarks, ${readingListItems.length} reading list)`);
```

- [ ] **Step 4: Update fingerprint computation to include reading list items**

After line 289 where `minimalForHash.push({ url, title, path: currentPath })`, add reading list items:

```typescript
    // ... existing bookmark code ...

    // Add reading list items to fingerprint computation
    for (const item of readingListItems) {
      minimalForHash.push({
        url: item.url,
        title: item.title,
        path: 'Reading List',  // Reading list has no folder hierarchy
      });
    }
```

- [ ] **Step 5: Update serverAPI.syncBookmarks call to use allItems**

Line 370: Change `await serverAPI.syncBookmarks(formatted);` to:
```typescript
    await serverAPI.syncBookmarks(allItems);
```

- [ ] **Step 6: Update log statement**

Line 357: Change sync log to reflect combined count:
```typescript
    console.log(`[Sync] Preparing to sync ${allItems.length} items (${formatted.length} bookmarks, ${readingListItems.length} reading list) to server`);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test -- packages/extension/src/background/sync.test.ts -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/extension/src/background/index.ts
git commit -m "feat(extension): include reading list items in bookmark sync"
```

---

## Task 3: Update Server BookmarkItem Type

**Files:**
- Modify: `packages/server/src/types/index.ts:30-38`

- [ ] **Step 1: Update BookmarkItem interface**

```typescript
// packages/server/src/types/index.ts line 30-38
export interface BookmarkItem {
  title: string;
  url: string;
  path?: string;
  description?: string;
  tags?: string[];
  dateAdded?: string;
  syncId?: string;
  type?: 'bookmark' | 'reading_list';   // NEW: optional for backward compat
  readState?: 'UNREAD' | 'READ';        // NEW
}
```

- [ ] **Step 2: Verify build passes**

Run: `pnpm -F server exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/types/index.ts
git commit -m "feat(server): add type and readState fields to BookmarkItem"
```

---

## Task 4: Add Type and Read State to Notion Property Mapping

**Files:**
- Modify: `packages/server/src/services/notion.ts:20-72`

- [ ] **Step 1: Add property matchers to PROPERTY_MAPPING_CONFIG**

Add these two entries after the existing `syncId` matcher (after line 71):

```typescript
  {
    bookmarkField: 'type',
    type: 'single_select',
    patterns: [/type/i],
    required: false,
    builder: (value: any) => ({
      single_select: value === 'reading_list' ? { name: 'Reading List' } : { name: 'Bookmark' },
    }),
  },
  {
    bookmarkField: 'readState',
    type: 'status',
    patterns: [/read.*state/i, /status/i],
    required: false,
    builder: (value: any) => ({
      status: value === 'READ' ? { name: 'Read' } : { name: 'Unread' },
    }),
  },
```

- [ ] **Step 2: Verify server builds**

Run: `pnpm -F server exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/services/notion.ts
git commit -m "feat(server): add Type and Read State property mapping for Notion sync"
```

---

## Task 5: Run Full Test Suite

- [ ] **Step 1: Run extension tests**

Run: `pnpm test -- packages/extension/src/utils/reading-list.test.ts packages/extension/src/background/sync.test.ts -v`
Expected: All PASS

- [ ] **Step 2: Run server tests**

Run: `pnpm -F server test`
Expected: All PASS

- [ ] **Step 3: Run full build**

Run: `pnpm build`
Expected: Build succeeds

---

## Notion Database Setup (Manual — for users)

Users need to add two properties to their Notion database:

1. **Type** (single-select)
   - Options: "Bookmark", "Reading List"

2. **Read State** (status)
   - Options: "Unread", "Read"

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create `reading-list.ts` utility with `getReadingListItems()` |
| 2 | Modify `performBookmarkSync()` to collect and include reading list items |
| 3 | Add `type` and `readState` fields to server `BookmarkItem` type |
| 4 | Add Type + Read State property matchers in Notion service |
| 5 | Run full test suite and build |
