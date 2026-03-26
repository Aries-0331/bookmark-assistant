# Sync Parallelization + Quick Save Feature Design

**Date:** 2026-03-26
**Status:** Approved

---

## Overview

Two improvements to Bookmark Assistant:

1. **Sync Parallelization** - Sync bookmarks to Notion in batches as descriptions are generated, rather than waiting for all descriptions to complete
2. **Quick Save Current Page** - Allow users to save the current browser tab to Notion with one click from popup or right-click menu

---

## Part 1: Sync Parallelization

### Problem

Currently, the sync flow is:
1. Generate descriptions for ALL bookmarks (batch by batch)
2. Only after ALL descriptions are complete, sync to Notion

This means users wait 5-10 minutes before seeing ANY bookmark appear in Notion when syncing many bookmarks.

### Solution

Change to batch parallelization: after each batch of descriptions is generated, immediately sync that batch to Notion.

```
Current:
for (batch of descriptionBatches) {
  await generateDescriptions(batch)  // Wait for batch
}
await syncToNotion(allBookmarks)     // All done才开始

New:
for (batch of descriptionBatches) {
  await generateDescriptions(batch)   // Wait for batch
  await syncBatchToNotion(batch)      // Immediately sync this batch
}
```

### Implementation

**File:** `packages/server/src/routes/bookmarks.ts`

**Changes:**
- After `await descriptionExtractor.processBatch(batch)` completes for a batch
- Immediately call `await processBookmarkDiffs(batch, ...)` to sync that batch to Notion
- Continue to next batch

**Key consideration:** If a batch fails to sync, we continue with remaining batches. Failed items should be logged and potentially retried.

### Risk Assessment

- **Risk:** Low
- **Reason:** Only调整执行顺序，不改变接口或数据流
- **Testing:** Verify bookmarks appear in Notion incrementally during sync

---

## Part 2: Quick Save Current Page

### Feature Summary

Users can save the current browser tab to Notion instantly without navigating to a bookmarked page.

### User Interactions

#### Popup Button
- Add "Save Current Page" button in popup UI (next to or below sync button)
- If not connected to Notion: show inline message "请先连接 Notion" instead of button
- If connected: button saves current tab and shows success/failure toast

#### Right-Click Menu
- Chrome context menu item: "Save to Notion"
- If not connected: show disabled state or tooltip
- If connected: invoke same save logic

### Data Flow

```
User clicks "Save Current Page" / "Save to Notion"
    ↓
background script: chrome.tabs.getCurrent()
    ↓
Extract URL + title from current tab
    ↓
POST /api/bookmarks/sync { bookmarks: [{ url, title }] }
    ↓
Server processes single bookmark (generates description, syncs to Notion)
    ↓
Return success/failure
    ↓
Show toast notification to user
```

### Implementation Details

**Extension Side:**

1. **Popup UI** (`packages/extension/src/popup/`)
   - Add "Save Current Page" button component
   - Show "请先连接 Notion" message when `isConnected` is false
   - On click: call `saveCurrentPage()` function

2. **Background Script** (`packages/extension/src/background/`)
   - Add `saveCurrentPage()` function
   - Add context menu registration (`chrome.contextMenus`)
   - Handle `onClicked` event to get current tab and invoke save

3. **Server API** (`packages/server/src/routes/bookmarks.ts`)
   - `/api/bookmarks/sync` already supports single bookmark
   - Ensure it works with `bookmarks: [{ url, title }]` (single item)

**Server response for save:**
```json
{
  "success": true,
  "synced": 1,
  "failed": 0
}
```

**Error handling:**
- Not connected: return 401, extension shows inline message
- Network error: return 500, extension shows error toast

### UI States

| State | Popup | Context Menu |
|-------|-------|--------------|
| Not connected | Show message "请先连接 Notion" | Disabled / tooltip |
| Connected, idle | Show "Save Current Page" button | Show "Save to Notion" |
| Saving | Show loading spinner | - |
| Success | Show success toast | Show notification |
| Failed | Show error toast | Show notification |

### Files to Modify

| File | Change |
|------|--------|
| `packages/extension/src/popup/` | Add SaveCurrentPageButton component |
| `packages/extension/src/background/` | Add saveCurrentPage(), contextMenus setup |
| `packages/server/src/routes/bookmarks.ts` | Ensure single bookmark sync works |

---

## Part 3: Testing Strategy

### Sync Parallelization Tests

1. **Unit Test:** Verify batch sync order
   - Mock description extractor to return in order
   - Verify Notion sync called in correct sequence

2. **Integration Test:** Partial failure handling
   - First batch succeeds, second fails
   - Verify first batch items exist in Notion

### Quick Save Tests

1. **Unit Test:** saveCurrentPage function
   - Mock chrome.tabs.getCurrent
   - Verify correct payload sent to server

2. **Unit Test:** Popup button rendering
   - Verify button shows when connected
   - Verify message shows when not connected

3. **Integration Test:** End-to-end save
   - Click button -> verify Notion page created

---

## Out of Scope

- Save with editing (Option B/C from design discussion)
- Selecting save location (Feature 3)
- AI description generation with user API key (Feature 4)

---

## Success Criteria

1. When syncing 100 bookmarks, first batch appears in Notion within 30 seconds
2. User can save current page with one click from popup
3. User can save current page from right-click context menu
4. Appropriate feedback when not connected to Notion
