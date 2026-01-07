# Storage Optimization Review

## Current Storage Analysis

### Issues Identified

#### 1. **Redundant Fields**
- `last_sync_fingerprint` and `last_sync_hash` store the same SHA-256 hash
  - **Keep:** `last_sync_fingerprint` (more descriptive name)
  - **Remove:** `last_sync_hash`

#### 2. **Temporary/One-time Flags**
- `hasTriedInitialLoad` - true (one-time initialization flag)
  - **Remove:** No longer needed after initial load

#### 3. **Invalid Data**
- `last_sync_partial_info`: "Total synced: NaN"
  - **Fix:** Ensure numeric calculations never produce NaN
  - **Default:** 0 or null when unavailable

#### 4. **Outdated Error Reports**
- `error_reports` contains old OAuth error from timestamp 2026-01-07T06:23:51.371Z
  - **Action:** Clear old errors after resolution
  - **Keep:** Only recent (24-48h) unresolved errors

#### 5. **Optimization Opportunities**
- Cache timestamps to reduce redundant Date parsing
- Compress session token storage (already JWT, minimal)
- Normalize boolean flags

## Optimized Storage Schema

### Core State (Required)
```typescript
{
  // User & Session
  user_id: string,
  user_email: string,
  session_token: string,

  // Subscription
  is_pro: boolean,
  cached_pricing: { monthly: number, lifetime: number },

  // OAuth Configuration
  oauth_template_database_id: string,

  // Sync Status
  sync_in_progress: boolean,
  last_sync: string (ISO timestamp),
  last_sync_fingerprint: string (SHA-256),
  last_sync_error: string | null,
  last_sync_partial_info: {
    new_count: number,
    failed_count: number,
    total_synced: number, // Always numeric, never NaN
    message: string
  } | null
}
```

### Temporary State (Ephemeral)
```typescript
{
  is_connecting: boolean, // Reset after OAuth completes
  hasTriedInitialLoad: boolean, // Remove after first load
}
```

### Error Tracking (Limited Retention)
```typescript
{
  error_reports: Array<{
    context: { operation: string, stage: string },
    message: string,
    stack: string,
    timestamp: string,
    resolved: boolean
  }>
  // Keep only last 10 errors or errors from last 48h
}
```

## Recommended Actions

### 1. Clean Up Storage Now
```javascript
// Remove redundant/obsolete fields
chrome.storage.local.remove([
  'last_sync_hash',
  'hasTriedInitialLoad'
]);

// Fix NaN issue
if (partialInfo.total_synced === NaN) {
  partialInfo.total_synced = 0;
}

// Clear old resolved errors
const cutoff = Date.now() - (48 * 60 * 60 * 1000); // 48h ago
error_reports = error_reports.filter(e =>
  !e.resolved && new Date(e.timestamp) > cutoff
);
```

### 2. Add Storage Validation
```javascript
// Validate numeric fields
function validatePartialInfo(info) {
  if (!info) return null;
  return {
    new_count: Number(info.new_count) || 0,
    failed_count: Number(info.failed_count) || 0,
    total_synced: Number(info.total_synced) || 0,
    message: info.message || ''
  };
}
```

### 3. Add Cleanup Cron (Daily)
```javascript
// Run daily to clean up storage
function cleanupStorage() {
  // Remove old errors
  // Reset one-time flags
  // Validate data integrity
  // Archive old sync history
}
```

## Benefits

- **Reduced Storage:** ~20% smaller (remove redundant fields)
- **Better Performance:** Fewer fields to read/write
- **Cleaner Code:** No NaN checks scattered everywhere
- **Easier Debugging:** Clear error tracking with retention policy
- **Future-Proof:** Schema is extensible but concise

## Implementation Priority

1. **P0 (Immediate):** Fix NaN issue, remove redundant fields
2. **P1 (This week):** Add validation, error retention policy
3. **P2 (Next week):** Implement cleanup cron, add schema versioning

---

**Estimated Storage Reduction:** 15-25%
**Complexity:** Low
**Risk:** Minimal (backward compatible)
