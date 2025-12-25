# Simple Error Monitoring for Indie Launch

> **Pragmatic error monitoring strategy for bootstrapped indie developers**

**Created:** December 24, 2025  
**Status:** Recommended for MVP Launch  
**Priority:** P0 (Critical but Simplified)  
**Estimated Effort:** 2-3 hours (vs. 1-2 days for Sentry)

---

## Philosophy: Start Simple, Scale Later

As an indie developer launching your first product, you should optimize for:

1. ✅ **Speed to market** - Ship fast, iterate based on real feedback
2. ✅ **Cost efficiency** - Minimize recurring costs until revenue is proven
3. ✅ **Pragmatism** - Good enough > Perfect

**This document provides a FREE, simple error monitoring solution that you can implement in 2-3 hours.**

---

## What You Get (For Free)

### Server-Side (Already Working!)

- ✅ All errors logged to Vercel (free, searchable)
- ✅ Full stack traces
- ✅ Request context (URL, method, user)
- ✅ 90-day retention

### Extension-Side (30 min setup)

- ✅ Errors sent to your server
- ✅ Stored in Vercel logs
- ✅ Basic context (user agent, error details)
- ✅ Searchable in Vercel dashboard

### What You DON'T Get (vs. Sentry)

- ❌ Real-time alerts (you check logs manually)
- ❌ Error grouping (manual analysis)
- ❌ Source maps (minified stack traces)
- ❌ Fancy dashboard
- ❌ Performance monitoring

**Is this okay?** YES for launch! You can add Sentry later if needed.

---

## Implementation

### Step 1: Server Error Endpoint (15 min)

**File:** `packages/server/src/routes/errors.ts` (NEW)

```typescript
import express, { Request, Response } from 'express';
import { verifyJWT } from '../middleware/auth';

const router = express.Router();

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
  userAgent: string;
  version?: string;
}

/**
 * POST /api/errors
 * Collect errors from extension
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const report: ErrorReport = req.body;

    // Validate payload
    if (!report.message || !report.timestamp) {
      return res.status(400).json({ error: 'Invalid error report' });
    }

    // Log to Vercel (free, searchable)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 [EXTENSION ERROR]');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Message:', report.message);
    console.error('Time:', report.timestamp);
    console.error('Version:', report.version || 'unknown');
    console.error('User Agent:', report.userAgent);
    
    if (report.context) {
      console.error('Context:', JSON.stringify(report.context, null, 2));
    }
    
    if (report.stack) {
      console.error('Stack Trace:');
      console.error(report.stack);
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to process error report:', error);
    res.status(500).json({ error: 'Failed to process error report' });
  }
});

export default router;
```

**Mount route:** `packages/server/src/routes/index.ts`

```typescript
import errorRouter from './errors';

// Add this line
router.use('/errors', errorRouter);
```

---

### Step 2: Extension Error Reporter (15 min)

**File:** `packages/extension/src/utils/error-reporter.ts` (NEW)

```typescript
import { config } from '../background/config';

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
  userAgent: string;
  version: string;
}

/**
 * Report error to server
 * Falls back gracefully if server is unreachable
 */
export async function reportError(
  error: Error,
  context?: Record<string, any>
): Promise<void> {
  try {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: sanitizeContext(context),
      userAgent: navigator.userAgent,
      version: chrome.runtime.getManifest().version,
    };

    // Store locally for user to view (optional)
    await storeLocalErrorReport(report);

    // Send to server (async, non-blocking)
    await sendToServer(report);
  } catch (err) {
    // Fail silently - don't break the app
    console.warn('[ErrorReporter] Failed to report error:', err);
  }
}

/**
 * Remove sensitive data from context
 */
function sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
  if (!context) return undefined;

  const sanitized = { ...context };

  // Remove sensitive keys
  const sensitiveKeys = ['token', 'access_token', 'jwt', 'password', 'secret'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Store error locally for debugging
 */
async function storeLocalErrorReport(report: ErrorReport): Promise<void> {
  try {
    const { error_reports = [] } = await chrome.storage.local.get('error_reports');
    
    // Keep last 50 errors
    const reports = [...error_reports, report].slice(-50);
    
    await chrome.storage.local.set({ error_reports: reports });
  } catch (err) {
    console.warn('[ErrorReporter] Failed to store error locally:', err);
  }
}

/**
 * Send error to server
 */
async function sendToServer(report: ErrorReport): Promise<void> {
  const serverUrl = config.serverUrl;

  try {
    const response = await fetch(`${serverUrl}/api/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
      // Timeout after 5 seconds
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('[ErrorReporter] Server returned error:', response.status);
    }
  } catch (err) {
    // Network error or timeout - fail silently
    console.warn('[ErrorReporter] Failed to send error to server:', err);
  }
}

/**
 * Report a message (warning or info)
 */
export async function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): Promise<void> {
  // For MVP, only log locally
  if (level === 'error') {
    await reportError(new Error(message), context);
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context);
  }
}
```

---

### Step 3: Use Error Reporter (10 min)

**Update:** `packages/extension/src/background/index.ts`

```typescript
import { reportError } from '../utils/error-reporter';

// Replace existing error handling
async function performBookmarkSync(): Promise<{ success: boolean; error?: string }> {
  try {
    // ... existing sync logic
  } catch (err) {
    console.error('❌ Server-side bookmark sync failed:', err);
    
    // NEW: Report to server
    const error = err instanceof Error ? err : new Error(String(err));
    await reportError(error, {
      operation: 'sync',
      bookmarkCount: formatted?.length || 0,
      syncHash: currentHash,
    });
    
    // ... existing error handling
    await setState({
      last_sync_error: error.message,
    });
    
    return { success: false, error: error.message };
  }
}

// Add global error handler
if (typeof self !== 'undefined') {
  self.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error);
    reportError(event.error || new Error(event.message), {
      type: 'unhandled',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  self.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason);
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    reportError(error, {
      type: 'unhandled_promise',
    });
  });
}
```

**Update OAuth errors:**

```typescript
[Messages.NOTION_OAUTH]: async () => {
  try {
    await chrome.storage.local.set({ is_connecting: true });
    const code = await launchNotionOAuth();
    const result = await exchangeCodeForToken(code);
    await chrome.storage.local.set({ is_connecting: false });
    return result;
  } catch (error) {
    await chrome.storage.local.set({ is_connecting: false });
    
    // NEW: Report OAuth errors
    await reportError(error instanceof Error ? error : new Error(String(error)), {
      operation: 'oauth',
      stage: 'exchange_token',
    });
    
    throw error;
  }
},
```

---

### Step 4: Add Error Viewer (Optional, 30 min)

Let users see their own errors (helps with bug reports):

**File:** `packages/extension/src/options/ErrorLog.tsx` (NEW)

```tsx
import React, { useEffect, useState } from 'react';

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
  userAgent: string;
  version: string;
}

export function ErrorLog() {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = async () => {
    const { error_reports = [] } = await chrome.storage.local.get('error_reports');
    setErrors(error_reports.reverse()); // Most recent first
  };

  const clearErrors = async () => {
    await chrome.storage.local.set({ error_reports: [] });
    setErrors([]);
  };

  if (errors.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-700">✅ No errors recorded (good news!)</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Error Log ({errors.length})</h3>
        <button
          onClick={clearErrors}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2">
        {errors.map((error, idx) => (
          <div key={idx} className="border border-red-200 rounded bg-red-50 p-3">
            <div
              className="flex justify-between items-start cursor-pointer"
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <div className="flex-1">
                <p className="font-medium text-red-800">{error.message}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(error.timestamp).toLocaleString()}
                </p>
              </div>
              <span className="text-gray-500">{expanded === idx ? '▼' : '▶'}</span>
            </div>

            {expanded === idx && (
              <div className="mt-3 space-y-2 text-sm">
                {error.context && (
                  <div>
                    <p className="font-semibold">Context:</p>
                    <pre className="bg-white p-2 rounded overflow-x-auto text-xs">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                )}
                {error.stack && (
                  <div>
                    <p className="font-semibold">Stack Trace:</p>
                    <pre className="bg-white p-2 rounded overflow-x-auto text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
                <p className="text-xs text-gray-600">
                  Version: {error.version} | {error.userAgent}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 mt-4">
        💡 <strong>Tip:</strong> If you're reporting a bug, take a screenshot of the error
        details above.
      </p>
    </div>
  );
}
```

**Add to Options page:**

```tsx
// packages/extension/src/options/App.tsx
import { ErrorLog } from './ErrorLog';

// Add a new tab/section
<ErrorLog />
```

---

## How to Use

### Viewing Errors

**Option 1: Vercel Dashboard (Recommended)**

```bash
# View real-time logs
vercel logs --follow

# Search for errors
vercel logs | grep "EXTENSION ERROR"

# Export for analysis
vercel logs > errors.log
```

**Option 2: Vercel Web UI**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Logs" tab
4. Search for `EXTENSION ERROR`
5. Filter by time range

### When User Reports a Bug

1. Ask them to go to extension Options → Error Log
2. Take a screenshot of the error
3. Or ask them to export: `chrome.storage.local.get('error_reports')`

---

## Cost Analysis

| Item | Cost |
|------|------|
| **Vercel logs** | Free (90-day retention) |
| **Server API** | Free (included in Vercel) |
| **Storage** | Free (chrome.storage) |
| **Your time** | 2-3 hours setup |
| **Monthly recurring** | **$0** |

**Total:** FREE 🎉

---

## Limitations & When to Upgrade

### This is Good Enough If:

- ✅ You have < 1,000 users
- ✅ You check logs daily/weekly
- ✅ Errors are rare (< 10/day)
- ✅ You can tolerate some manual analysis

### Upgrade to Sentry When:

- ❌ You have > 1,000 active users
- ❌ You're getting flooded with errors
- ❌ You need real-time alerts
- ❌ You have revenue to justify $26/month
- ❌ Errors are hard to reproduce (need better context)

**Migration is easy:**

```typescript
// Replace
await reportError(error, context);

// With
Sentry.captureException(error, { extra: context });
```

---

## Testing

### Manual Test

1. **Trigger a test error:**

```typescript
// Add temporarily to test
reportError(new Error('Test error from extension'), {
  test: true,
  bookmarkCount: 123,
});
```

2. **Check Vercel logs:**

```bash
vercel logs --follow
```

3. **Verify error appears** with full details

4. **Check extension Options** → Error Log

### Automated Test

```typescript
// tests/unit/error-reporter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { reportError } from '../src/utils/error-reporter';

describe('Error Reporter', () => {
  it('should sanitize sensitive data', async () => {
    const error = new Error('Test error');
    const context = {
      token: 'secret123',
      bookmarkCount: 100,
    };

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await reportError(error, context);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('[REDACTED]'),
      })
    );
  });
});
```

---

## Privacy Considerations

✅ **What we collect:**

- Error messages (sanitized)
- Stack traces (no user data)
- Browser version
- Extension version
- Error context (sanitized)

✅ **What we DON'T collect:**

- User tokens (scrubbed)
- Personal information
- Bookmark content
- Notion workspace data

✅ **Privacy policy addition:**

> We collect error reports to improve our service. Error reports include error messages, browser version, and extension version. We do not collect personal information or bookmark content. Error data is retained for 90 days.

---

## Monitoring Strategy

### Daily (5 min)

- Check Vercel dashboard for red errors
- Look for patterns (same error repeated)

### Weekly (15 min)

- Export logs: `vercel logs > week.log`
- Search for frequent errors: `grep -c "EXTENSION ERROR" week.log`
- Prioritize top 3 most frequent errors

### Monthly (30 min)

- Review error trends
- Decide if you need to upgrade to Sentry
- Clean up fixed errors from backlog

---

## Next Steps

### Before Launch

- [ ] Implement error reporter (2 hours)
- [ ] Test error reporting end-to-end
- [ ] Add error log viewer to options page
- [ ] Update privacy policy
- [ ] Document for yourself how to check logs

### After Launch

- [ ] Check logs daily for first week
- [ ] Respond to user-reported errors within 24h
- [ ] Track most common errors
- [ ] Decide if Sentry is needed (Month 2-3)

---

## FAQ

**Q: Won't I miss critical errors?**  
A: Check logs daily for the first 2 weeks. Set a calendar reminder.

**Q: What if Vercel logs are hard to search?**  
A: The `🚨 [EXTENSION ERROR]` prefix makes them easy to find. You can also pipe to grep.

**Q: What about performance monitoring?**  
A: Not needed for MVP. Add later if users complain about slowness.

**Q: Is this production-ready?**  
A: Yes for indie launch! Big companies need Sentry, but you can start simple.

---

## Conclusion

**For your first indie product launch:**

✅ **Use this simple approach** - Save money and time  
✅ **Ship faster** - Get to market sooner  
✅ **Iterate based on real data** - See if errors are actually a problem  
✅ **Upgrade later** - Add Sentry when revenue justifies it  

**You can always add Sentry later. You can't get back the 2 days you spent integrating it before launch.** 🚀

---

**Document Status:** ✅ Recommended for Indie Launch  
**Alternative:** See [ERROR_MONITORING_DESIGN.md](./ERROR_MONITORING_DESIGN.md) for full Sentry implementation  
**Upgrade Path:** Switch to Sentry when you have revenue + high error volume


