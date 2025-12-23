# Backend Description Generation Design

## Overview

Currently, descriptions are only generated when users visit pages (content script extracts meta tags). This design enables **server-side description generation** during bookmark sync, eliminating the need for users to visit each bookmark first.

## Architecture

### Current Flow (Client-Side Only)

```
User visits page → Content script extracts → Cache → Sync uses cache
```

### Proposed Flow (Hybrid: Client + Server)

```
Sync request → Server checks if description exists
  ├─ If exists: Use it
  └─ If missing: Fetch URL → Extract description → Use it
```

## Design Options

### Option 1: Synchronous Generation (Simple)

**Pros:**

- Simple implementation
- Descriptions available immediately
- No async complexity

**Cons:**

- Slower sync (waits for all fetches)
- Rate limiting issues
- Timeout risks

### Option 2: Asynchronous Generation (Recommended)

**Pros:**

- Fast sync (doesn't wait)
- Can batch/queue fetches
- Better error handling
- Can retry failed extractions

**Cons:**

- More complex
- Descriptions appear later
- Need background job system

### Option 3: Hybrid Approach (Best UX)

**Pros:**

- Fast sync for bookmarks with descriptions
- Generate missing descriptions in background
- Update Notion pages when ready
- Best of both worlds

**Cons:**

- Most complex
- Need update mechanism

## Recommended: Option 3 (Hybrid)

### Implementation Strategy

1. **During Sync:**
   - Use provided description if exists (from client cache)
   - If empty, create bookmark without description
   - Queue URL for background description generation

2. **Background Job:**
   - Process queued URLs
   - Fetch and extract descriptions
   - Update Notion pages with descriptions

3. **Caching:**
   - Cache extracted descriptions (Redis or DB)
   - Avoid re-fetching same URLs
   - TTL: 30 days

## Technical Implementation

### 1. Description Extraction Service

```typescript
// packages/server/src/services/description-extractor.ts

interface ExtractionResult {
  description: string;
  source: 'meta_description' | 'og_description' | 'title' | 'content' | 'empty';
  success: boolean;
  error?: string;
}

class DescriptionExtractor {
  async extractFromUrl(url: string): Promise<ExtractionResult> {
    // 1. Fetch HTML
    // 2. Parse meta tags
    // 3. Extract description
    // 4. Fallback strategies
  }
}
```

### 2. Extraction Priority

1. `<meta name="description">` content
2. `<meta property="og:description">` content
3. `<title>` tag (if reasonable length)
4. First `<p>` in `<main>` or `<article>`
5. Empty string (fallback)

### 3. Caching Strategy

- **Cache Key:** Normalized URL
- **Storage:** Database table or Redis
- **TTL:** 30 days
- **Invalidation:** Manual refresh option

### 4. Rate Limiting

- **Per-domain rate limit:** 1 request/second
- **Global rate limit:** 10 requests/second
- **Respect robots.txt:** Check before fetching
- **User-Agent:** Identify as bookmark sync service

### 5. Error Handling

- **Timeout:** 5 seconds per fetch
- **Retries:** 2 retries with exponential backoff
- **Fallback:** Empty string if all fail
- **Logging:** Track failures for monitoring

## Database Schema

```sql
CREATE TABLE description_cache (
  id SERIAL PRIMARY KEY,
  url_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA256 of normalized URL
  normalized_url TEXT NOT NULL,
  description TEXT,
  source VARCHAR(50), -- 'meta_description', 'og_description', etc.
  extracted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_url_hash ON description_cache(url_hash);
CREATE INDEX idx_expires_at ON description_cache(expires_at);
```

## API Changes

### Sync Endpoint Enhancement

```typescript
// Current
POST /api/bookmarks/sync
{
  bookmarks: [
    { title, url, description, ... }
  ]
}

// Enhanced (backward compatible)
POST /api/bookmarks/sync
{
  bookmarks: [
    { title, url, description, ... } // description optional
  ],
  options: {
    generateDescriptions: true, // default: true
    generateDescriptionsAsync: true // default: true
  }
}
```

### New Endpoint: Description Generation Status

```typescript
GET /api/bookmarks/descriptions/status
Response: {
  queued: number,
  processing: number,
  completed: number,
  failed: number
}
```

## Performance Considerations

### Batch Processing

- Process descriptions in batches of 10
- Parallel fetches with concurrency limit
- Queue system for large syncs

### Optimization

- Skip URLs that are likely to fail (file://, chrome://, etc.)
- Cache favicon URLs (already doing this)
- Prefer client-provided descriptions (faster, more accurate)

## Security Considerations

1. **URL Validation:** Validate URLs before fetching
2. **SSRF Protection:** Block internal IPs, localhost
3. **Size Limits:** Max HTML size (5MB)
4. **Timeout:** Prevent hanging requests
5. **Sanitization:** Sanitize extracted descriptions

## Monitoring

- Track extraction success rate
- Monitor cache hit rate
- Alert on high failure rates
- Track extraction time (p50, p95, p99)

## Migration Strategy

1. **Phase 1:** Add description extraction service (no integration)
2. **Phase 2:** Integrate into sync endpoint (optional, async)
3. **Phase 3:** Enable by default
4. **Phase 4:** Deprecate client-side only approach

## Dependencies

```json
{
  "cheerio": "^1.0.0-rc.12", // HTML parsing
  "node-fetch": "^3.3.2", // HTTP fetching
  "robots-parser": "^4.1.0" // robots.txt parsing
}
```

## Cost Analysis

- **Storage:** ~100 bytes per cached description
- **Network:** ~50KB per URL fetch (HTML)
- **Compute:** Minimal (parsing is fast)
- **Rate Limits:** Need to respect site limits

## Future Enhancements

1. **AI-Generated Descriptions:** Use LLM for pages without meta tags
2. **Image Extraction:** Extract og:image for thumbnails
3. **Content Summarization:** Generate summaries from page content
4. **Multi-language:** Detect and handle different languages
5. **Preview Cards:** Generate rich preview cards
