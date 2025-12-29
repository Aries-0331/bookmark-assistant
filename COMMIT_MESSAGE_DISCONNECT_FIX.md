# Commit Message

```
fix: resolve sync failure after disconnect/reconnect flow

Critical bug fix: Sync now works correctly after disconnecting and reconnecting to Notion.

## Problem
- User disconnects from Notion
- User reconnects with new template page
- Sync fails with "Database Not Configured" error

## Root Cause
- logout() cleared ALL local storage including oauth_template_database_id
- Server had no way to recover from missing notionDatabaseId
- Zustand store retained stale state after logout

## Solution (Multi-layered)

### Extension Changes:
1. Selective logout cleanup (packages/extension/src/background/server-api.ts)
   - Only remove authentication/session keys
   - Preserve: oauth_template_database_id, description cache, pricing cache
   - Maintains ~30 lines of selective cleanup vs 1 line clear()

2. Cache schema update (packages/extension/src/utils/cache.ts)
   - Add oauth_template_database_id to ChromeLocalCache interface
   - Add to CACHE_KEYS constants for type safety

3. Zustand store reset (packages/extension/src/options/components/ConnectionSection.tsx)
   - Reset store state on disconnect to prevent stale UI
   - Immediately reflects disconnected status

### Server Changes:
4. Database recovery logic (packages/server/src/routes/bookmarks.ts)
   - Attempt automatic recovery if notionDatabaseId is missing
   - Use duplicatedTemplateId to resolve database
   - Update user record with recovered database
   - Provide actionable error messages if recovery fails

## Tests
- ✅ 6/6 new tests passing (server-api-logout.test.ts)
- ✅ Verifies oauth_template_database_id preservation
- ✅ Verifies selective cleanup behavior
- ✅ Tests full disconnect→reconnect flow

## Additional Benefits
- ✅ Description cache preserved (performance)
- ✅ Auto-sync settings preserved (UX)
- ✅ Better error messages (support)
- ✅ Automatic recovery (reliability)

## Files Changed
- packages/extension/src/background/server-api.ts (+32 lines)
- packages/extension/src/options/components/ConnectionSection.tsx (+14 lines)
- packages/extension/src/utils/cache.ts (+2 lines)
- packages/server/src/routes/bookmarks.ts (+47 lines)
- packages/extension/src/background/server-api-logout.test.ts (new file)

Fixes critical user-blocking issue before Chrome Web Store launch.
```

## Short Version (for quick commits):

```
fix: resolve sync failure after disconnect/reconnect

- Selective logout: preserve oauth_template_database_id & caches
- Server: auto-recover database ID from template on sync
- Extension: reset Zustand store on disconnect
- Add comprehensive tests (6/6 passing)

Fixes critical bug where sync fails after reconnection. Multi-layered
approach ensures reliability and maintains performance (cache preservation).
```

## One-liner (if needed):

```
fix: selective logout cleanup + server recovery for disconnect/reconnect bug
```

