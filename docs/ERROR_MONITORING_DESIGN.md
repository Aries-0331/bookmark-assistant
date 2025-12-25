# Error Monitoring Implementation Design

**Created:** December 24, 2025
**Status:** Design Review
**Priority:** P0 (Critical for Launch)
**Estimated Effort:** 1-2 days

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Requirements](#requirements)
4. [Technology Selection](#technology-selection)
5. [Architecture Design](#architecture-design)
6. [Implementation Plan](#implementation-plan)
7. [Configuration & Security](#configuration--security)
8. [Testing Strategy](#testing-strategy)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Privacy & Compliance](#privacy--compliance)
11. [Cost Analysis](#cost-analysis)
12. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problem Statement

Bookmark Assistant currently lacks production-grade error monitoring, making it impossible to:

- **Detect** production errors in real-time
- **Diagnose** issues users experience
- **Track** error trends and patterns
- **Prioritize** bug fixes based on impact
- **Respond** quickly to critical failures

### Proposed Solution

Implement **Sentry** as the centralized error monitoring platform for:

- ✅ **Chrome Extension** (background scripts, content scripts, UI)
- ✅ **Backend API** (Express server on Vercel)
- ✅ **Website** (Next.js landing page)

### Key Benefits

| Benefit                    | Impact                                    |
| -------------------------- | ----------------------------------------- |
| **Real-time Alerts**       | Detect critical errors within seconds     |
| **Stack Traces**           | Debug issues 10x faster with full context |
| **Release Tracking**       | Correlate errors with deployments         |
| **Performance Monitoring** | Identify slow operations                  |
| **User Context**           | Understand affected user segments         |
| **Privacy Controls**       | GDPR/CCPA compliant data scrubbing        |

### Success Criteria

- ✅ 100% of unhandled errors captured
- ✅ < 60 seconds alert latency for critical errors
- ✅ Zero PII (Personally Identifiable Information) leaked
- ✅ < 5ms average overhead per operation
- ✅ 30-day error retention for analysis

---

## Current State Analysis

### Existing Error Handling

#### Extension (`packages/extension/src/background/index.ts`)

```typescript
// Basic console logging
try {
  // ... sync logic
} catch (err) {
  console.error('❌ Server-side bookmark sync failed:', err);
  // No centralized tracking
}
```

**Issues:**

- ❌ Errors only visible in local console (not accessible in production)
- ❌ No aggregation or trend analysis
- ❌ No alerting mechanism
- ❌ Limited context about user state

#### Server (`packages/server/src/middleware/auth.ts`)

```typescript
export const errorHandler = (error: Error, req: Request, res: Response) => {
  console.error('🚨 Server Error:', error);

  auditLog('server_error', req.user?.userId || 'unknown', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // Returns 500 response
};
```

**Issues:**

- ❌ `auditLog()` appears to be console-only (not persisted)
- ❌ No structured error tracking
- ❌ Stack traces not searchable
- ❌ No error grouping or deduplication

### Gap Analysis

| Capability           | Current      | Required        | Gap             |
| -------------------- | ------------ | --------------- | --------------- |
| **Error Capture**    | Console only | Centralized     | 🔴 Critical     |
| **Real-time Alerts** | None         | Email/Slack     | 🔴 Critical     |
| **Stack Traces**     | Lost in logs | Persisted       | 🔴 Critical     |
| **User Context**     | Limited      | Rich metadata   | 🟡 Important    |
| **Release Tracking** | None         | Per-version     | 🟡 Important    |
| **Performance Data** | None         | Slow operations | 🟢 Nice-to-have |

---

## Requirements

### Functional Requirements

#### FR-1: Error Capture

- **FR-1.1** Capture all unhandled exceptions (extension + server)
- **FR-1.2** Capture handled errors with severity levels (error, warning, info)
- **FR-1.3** Capture promise rejections
- **FR-1.4** Capture console errors (optional, configurable)

#### FR-2: Context & Metadata

- **FR-2.1** Include stack traces with source maps
- **FR-2.2** Tag errors by environment (production, development)
- **FR-2.3** Tag errors by version/release
- **FR-2.4** Include user ID (anonymized)
- **FR-2.5** Include browser/OS information
- **FR-2.6** Include breadcrumbs (user actions leading to error)

#### FR-3: Alerting

- **FR-3.1** Real-time alerts for critical errors (P0)
- **FR-3.2** Daily digest for warnings (P1)
- **FR-3.3** Configurable alert rules (threshold, frequency)
- **FR-3.4** Multiple notification channels (email, Slack)

#### FR-4: Privacy & Security

- **FR-4.1** Scrub sensitive data (tokens, passwords, emails)
- **FR-4.2** PII redaction (URLs with user data)
- **FR-4.3** No notion tokens or API keys in error data
- **FR-4.4** Configurable data retention (30 days default)

#### FR-5: Performance

- **FR-5.1** < 5ms overhead per operation
- **FR-5.2** Async error reporting (non-blocking)
- **FR-5.3** Rate limiting (max 10 errors/sec per user)
- **FR-5.4** Sampling for high-volume errors

### Non-Functional Requirements

#### NFR-1: Reliability

- **NFR-1.1** 99.9% uptime for error reporting
- **NFR-1.2** Graceful degradation if Sentry is down
- **NFR-1.3** Local fallback logging

#### NFR-2: Scalability

- **NFR-2.1** Support 50,000+ users
- **NFR-2.2** Handle 10,000+ errors/day

#### NFR-3: Cost

- **NFR-3.1** Stay within free tier initially (5k errors/month)
- **NFR-3.2** Budget: $26/month for Team plan (50k errors/month)

---

## Technology Selection

### Options Comparison

| Tool                    | Pros                                                                                  | Cons                                    | Cost                         | Score      |
| ----------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------- | ---------- |
| **Sentry**              | ✅ Best-in-class for JS/TS<br>✅ Chrome ext support<br>✅ Source maps<br>✅ Free tier | ⚠️ Expensive at scale                   | Free: 5k/mo<br>Team: $26/mo  | ⭐⭐⭐⭐⭐ |
| **LogRocket**           | ✅ Session replay<br>✅ Frontend focus                                                | ❌ Expensive<br>❌ Weak backend support | $99/mo                       | ⭐⭐⭐     |
| **Rollbar**             | ✅ Good JS support<br>✅ Affordable                                                   | ⚠️ Basic Chrome ext support             | Free: 5k/mo<br>Pro: $12/mo   | ⭐⭐⭐⭐   |
| **Bugsnag**             | ✅ Good error grouping<br>✅ Mobile support                                           | ⚠️ Less popular                         | Free: 7.5k/mo<br>Pro: $59/mo | ⭐⭐⭐⭐   |
| **New Relic**           | ✅ Full observability                                                                 | ❌ Overkill<br>❌ Complex setup         | $0-99/mo                     | ⭐⭐⭐     |
| **Custom (CloudWatch)** | ✅ Full control                                                                       | ❌ High effort<br>❌ No UI              | AWS costs                    | ⭐⭐       |

### ✅ **Recommended: Sentry**

**Rationale:**

1. **Industry Standard** - Used by Airbnb, Microsoft, Uber
2. **Chrome Extension Support** - Official SDK for browser extensions
3. **Source Maps** - Automatic deobfuscation of minified code
4. **Release Tracking** - Correlate errors with deployments
5. **Free Tier** - 5,000 errors/month (sufficient for launch)
6. **Privacy Controls** - GDPR-compliant data scrubbing
7. **Vercel Integration** - Native support for Vercel deployments

**Sentry Features We'll Use:**

- Error tracking (core)
- Performance monitoring (optional, later)
- Release health (track error rates per version)
- Alerts & notifications
- Issue assignment & workflow

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Sentry Cloud                             │
│  - Error Aggregation                                        │
│  - Alerting Engine                                          │
│  - Dashboard & Analytics                                    │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ HTTPS (async, batched)
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        │                  │                  │
┌───────▼─────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│   Extension     │ │   Server    │ │    Website      │
│  (Manifest V3)  │ │  (Express)  │ │   (Next.js)     │
├─────────────────┤ ├─────────────┤ ├─────────────────┤
│ Background SW   │ │ Middleware  │ │ Error Boundary  │
│ Content Scripts │ │ Route Error │ │ React Errors    │
│ Popup/Options   │ │ Handlers    │ │                 │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

### Integration Points

#### 1. Chrome Extension

**Components to Instrument:**

```
packages/extension/src/
├── background/
│   ├── index.ts          → Global error handler
│   ├── sync.ts           → Sync error tracking
│   ├── oauth.ts          → OAuth error tracking
│   └── server-api.ts     → API error tracking
├── content/
│   └── description-extractor.ts → Content script errors
├── popup/
│   └── App.tsx           → UI errors (React Error Boundary)
└── options/
    └── App.tsx           → UI errors (React Error Boundary)
```

**Error Types to Capture:**

- Service worker crashes
- API call failures
- OAuth flow failures
- Sync errors (rate limits, network issues)
- Content script injection failures
- Storage quota errors

#### 2. Backend Server

**Components to Instrument:**

```
packages/server/src/
├── index.ts              → Global error handler
├── middleware/
│   └── auth.ts           → Replace errorHandler with Sentry
├── routes/
│   ├── oauth.ts          → OAuth errors
│   ├── bookmarks.ts      → Sync errors
│   └── user.ts           → User operation errors
└── services/
    ├── notion.ts         → Notion API errors
    ├── description-generator.ts → Description extraction errors
    └── cache.ts          → Cache errors
```

**Error Types to Capture:**

- Unhandled exceptions
- Promise rejections
- Notion API errors (rate limits, validation)
- Database errors (Prisma)
- Authentication failures
- Webhook processing errors

#### 3. Website (Lower Priority)

```
packages/website/
└── app/
    ├── layout.tsx        → Global error boundary
    └── page.tsx          → Landing page errors
```

---

## Implementation Plan

### Phase 1: Core Setup (Day 1, Morning - 3 hours)

#### Task 1.1: Sentry Project Setup

- [ ] Create Sentry account (free tier)
- [ ] Create 3 projects:
  - `bookmark-assistant-extension`
  - `bookmark-assistant-server`
  - `bookmark-assistant-website`
- [ ] Configure project settings (data scrubbing, retention)
- [ ] Generate DSN keys for each project

#### Task 1.2: Install Dependencies

```bash
# Root workspace
pnpm add -D @sentry/webpack-plugin

# Extension
cd packages/extension
pnpm add @sentry/browser

# Server
cd packages/server
pnpm add @sentry/node @sentry/profiling-node

# Website
cd packages/website
pnpm add @sentry/nextjs
```

#### Task 1.3: Environment Configuration

```bash
# .env.local (extension)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
VITE_APP_VERSION=0.1.0

# .env (server)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=bookmark-assistant-server@0.1.0

# .env (website)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### Phase 2: Extension Integration (Day 1, Afternoon - 3 hours)

#### Task 2.1: Background Service Worker

**File:** `packages/extension/src/background/sentry.ts` (NEW)

```typescript
import * as Sentry from '@sentry/browser';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development';
  const release = `bookmark-assistant-extension@${import.meta.env.VITE_APP_VERSION || '0.1.0'}`;

  // Don't initialize in development (optional)
  if (environment === 'development') {
    console.log('[Sentry] Skipped in development mode');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring (10% sample rate)
    tracesSampleRate: 0.1,

    // Error sampling (100% for now, reduce if needed)
    sampleRate: 1.0,

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Disable automatic instrumentation that doesn't work in service workers
        tracingOrigins: [],
      }),
      new Sentry.Replay({
        // Disable session replay in extensions (not useful)
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Privacy: scrub sensitive data
    beforeSend(event, hint) {
      // Remove tokens from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          /[?&](access_token|jwt)=[^&]+/gi,
          '$1=[REDACTED]'
        );
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Scrub localStorage/sessionStorage (may contain tokens)
      if (event.contexts?.['localStorage']) {
        delete event.contexts['localStorage'];
      }

      return event;
    },

    // Ignore known errors
    ignoreErrors: [
      // Chrome extension context invalidated (expected during updates)
      'Extension context invalidated',
      'Could not establish connection',
      // Network errors (not actionable)
      'Failed to fetch',
      'NetworkError',
      // ResizeObserver errors (benign)
      'ResizeObserver loop limit exceeded',
    ],
  });

  // Set user context (anonymized)
  chrome.storage.local.get(['notion_user_id'], (result) => {
    if (result.notion_user_id) {
      // Hash the user ID for privacy
      const hashedId = hashUserId(result.notion_user_id);
      Sentry.setUser({ id: hashedId });
    }
  });

  console.log(`[Sentry] Initialized (env: ${environment}, release: ${release})`);
}

// Simple hash for anonymizing user IDs
function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash)}`;
}

// Capture custom breadcrumb
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
}

// Capture error with context
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

// Capture message (for warnings/info)
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}
```

**Update:** `packages/extension/src/background/index.ts`

```typescript
// Add at the top (after imports)
import { initSentry, addBreadcrumb, captureError } from './sentry';

// Initialize Sentry
initSentry();

// Add breadcrumbs for debugging
chrome.storage.onChanged.addListener((changes) => {
  if (changes.sync_in_progress) {
    addBreadcrumb('Sync state changed', 'sync', {
      inProgress: changes.sync_in_progress.newValue,
    });
  }
});

// Replace console.error with Sentry capture
async function performBookmarkSync(): Promise<{ success: boolean; error?: string }> {
  try {
    // ... existing sync logic
  } catch (err) {
    console.error('❌ Server-side bookmark sync failed:', err);

    // NEW: Capture in Sentry
    captureError(err instanceof Error ? err : new Error(String(err)), {
      bookmarkCount: formatted?.length || 0,
      syncHash: currentHash,
    });

    // ... existing error handling
  }
}
```

#### Task 2.2: Content Scripts

**File:** `packages/extension/src/content/description-extractor.ts`

```typescript
// Add error handling
try {
  // ... existing extraction logic
} catch (error) {
  console.error('[DescriptionExtractor] Failed:', error);

  // Report to Sentry (if initialized)
  if (typeof chrome?.runtime?.sendMessage === 'function') {
    chrome.runtime.sendMessage({
      type: 'SENTRY_ERROR',
      payload: {
        error: error instanceof Error ? error.message : String(error),
        url: window.location.href,
      },
    });
  }
}
```

#### Task 2.3: React UI Error Boundaries

**File:** `packages/extension/src/components/ErrorBoundary.tsx` (NEW)

```typescript
import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/browser';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UI Error:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-red-600">
          <h2>Something went wrong</h2>
          <details className="mt-2 text-sm">
            <summary>Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap">{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Update:** Wrap App components

```tsx
// packages/extension/src/popup/App.tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function App() {
  return <ErrorBoundary>{/* existing app content */}</ErrorBoundary>;
}
```

### Phase 3: Server Integration (Day 1, Evening - 2 hours)

#### Task 3.1: Server Initialization

**File:** `packages/server/src/sentry.ts` (NEW)

```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { config } from './config';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || config.nodeEnv;
  const release = process.env.SENTRY_RELEASE || 'bookmark-assistant-server@1.0.0';

  // Don't initialize if DSN is not set
  if (!dsn) {
    console.log('[Sentry] Skipped (no DSN configured)');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring (10% sample rate)
    tracesSampleRate: 0.1,

    // Profiling (5% sample rate, lower due to overhead)
    profilesSampleRate: 0.05,

    integrations: [
      // Enable HTTP instrumentation
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express instrumentation
      new Sentry.Integrations.Express({ app: undefined }),
      // Enable profiling
      new ProfilingIntegration(),
    ],

    // Privacy: scrub sensitive data
    beforeSend(event, hint) {
      // Remove Authorization headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }

      // Scrub tokens from URLs
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          /[?&](access_token|jwt|token)=[^&]+/gi,
          '$1=[REDACTED]'
        );
      }

      // Scrub sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            const scrubbedData = { ...breadcrumb.data };
            ['password', 'token', 'access_token', 'jwt', 'secret'].forEach((key) => {
              if (key in scrubbedData) {
                scrubbedData[key] = '[REDACTED]';
              }
            });
            breadcrumb.data = scrubbedData;
          }
          return breadcrumb;
        });
      }

      return event;
    },

    // Ignore known errors
    ignoreErrors: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'],
  });

  console.log(`[Sentry] Initialized (env: ${environment}, release: ${release})`);
}
```

#### Task 3.2: Express Middleware

**Update:** `packages/server/src/index.ts`

```typescript
import * as Sentry from '@sentry/node';
import { initSentry } from './sentry';

// Initialize Sentry FIRST (before importing routes)
initSentry();

const app = express();

// Sentry request handler MUST be first
app.use(Sentry.Handlers.requestHandler());

// Sentry tracing handler (for performance monitoring)
app.use(Sentry.Handlers.tracingHandler());

// ... existing middleware (helmet, cors, etc.)

// Mount routes
app.use('/api', routes);

// Sentry error handler MUST be before other error handlers
app.use(
  Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Report all errors with status >= 500
      return error.status === undefined || error.status >= 500;
    },
  })
);

// Custom error handler (after Sentry)
app.use(errorHandler);
app.use('*', notFoundHandler);
```

#### Task 3.3: Manual Error Capturing

**Update:** `packages/server/src/services/notion.ts`

```typescript
import * as Sentry from '@sentry/node';

async function queryDatabase(databaseId: string) {
  try {
    // ... existing logic
  } catch (error) {
    console.error('Notion API error:', error);

    // Capture in Sentry with context
    Sentry.captureException(error, {
      tags: {
        service: 'notion',
        operation: 'queryDatabase',
      },
      extra: {
        databaseId: databaseId.slice(0, 8) + '***', // Partial ID for privacy
      },
    });

    throw error;
  }
}
```

### Phase 4: Source Maps & Build Integration (Day 2, Morning - 2 hours)

#### Task 4.1: Extension Source Maps

**Update:** `packages/extension/vite.config.ts`

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
  plugins: [
    // ... existing plugins

    // Upload source maps to Sentry
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: 'bookmark-assistant-extension',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: `bookmark-assistant-extension@${process.env.npm_package_version}`,
      },
      sourcemaps: {
        assets: './dist/**',
        ignore: ['node_modules'],
      },
    }),
  ],
});
```

#### Task 4.2: Server Source Maps

**Update:** `packages/server/tsconfig.json`

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true
  }
}
```

**Update:** `packages/server/package.json`

```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "sentry:sourcemaps": "sentry-cli sourcemaps upload --release=$npm_package_version ./dist"
  }
}
```

### Phase 5: Testing & Validation (Day 2, Afternoon - 2 hours)

#### Task 5.1: Unit Tests

**File:** `packages/extension/src/background/sentry.test.ts` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/browser';
import { initSentry, captureError, addBreadcrumb } from './sentry';

vi.mock('@sentry/browser');

describe('Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize Sentry with correct config', () => {
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: expect.any(String),
        environment: expect.any(String),
      })
    );
  });

  it('should scrub sensitive data from events', () => {
    const beforeSendFn = (Sentry.init as any).mock.calls[0][0].beforeSend;
    const event = {
      request: {
        url: 'https://api.example.com?access_token=secret123',
        headers: { Authorization: 'Bearer token' },
      },
    };

    const scrubbed = beforeSendFn(event);
    expect(scrubbed.request.url).toContain('[REDACTED]');
    expect(scrubbed.request.headers.Authorization).toBeUndefined();
  });

  it('should capture errors with context', () => {
    const error = new Error('Test error');
    captureError(error, { bookmarkCount: 100 });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        contexts: expect.objectContaining({
          custom: { bookmarkCount: 100 },
        }),
      })
    );
  });
});
```

#### Task 5.2: Integration Testing

**Test plan:**

1. Trigger a sync error → Verify captured in Sentry
2. Trigger OAuth error → Verify captured with correct tags
3. Trigger UI error → Verify Error Boundary works
4. Verify PII scrubbing (tokens, emails)
5. Verify release tagging

---

## Configuration & Security

### Environment Variables

**Extension (`.env.local`):**

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
VITE_APP_VERSION=0.1.0

# Optional: disable in dev
VITE_SENTRY_ENABLED=true
```

**Server (`.env`):**

```bash
# Sentry Configuration
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=bookmark-assistant-server@1.0.0

# Source map upload (CI only)
SENTRY_ORG=your-org-name
SENTRY_PROJECT=bookmark-assistant-server
SENTRY_AUTH_TOKEN=sntrys_xxx (CI secret)
```

### Security Best Practices

1. **Never commit DSN keys** - Use `.env.local` (gitignored)
2. **Rotate auth tokens** - Regenerate Sentry auth tokens quarterly
3. **Use separate projects** - Extension/Server/Website have different DSNs
4. **Scrub PII** - Always use `beforeSend` to remove sensitive data
5. **Limit retention** - Set to 30 days (GDPR compliance)

---

## Testing Strategy

### Manual Testing Checklist

- [ ] **Extension Background**
  - [ ] Trigger sync error → Check Sentry dashboard
  - [ ] Trigger OAuth error → Verify captured with context
  - [ ] Verify breadcrumbs (sync state changes)
  - [ ] Verify user ID anonymization

- [ ] **Extension UI**
  - [ ] Trigger React error → Verify Error Boundary
  - [ ] Verify fallback UI shows
  - [ ] Verify error details in Sentry

- [ ] **Server API**
  - [ ] Trigger 500 error → Verify captured
  - [ ] Trigger Notion API error → Verify tagged correctly
  - [ ] Verify request context (URL, method, user)
  - [ ] Verify stack trace with source maps

- [ ] **Privacy**
  - [ ] Verify tokens scrubbed from URLs
  - [ ] Verify Authorization header removed
  - [ ] Verify notion_user_id is hashed
  - [ ] Verify no PII in breadcrumbs

### Automated Tests

**Add to test suite:**

```bash
pnpm test # Should include Sentry integration tests
```

---

## Monitoring & Alerts

### Alert Rules Configuration

#### Critical Errors (P0) - Immediate Notification

| Alert                   | Condition             | Notification  |
| ----------------------- | --------------------- | ------------- |
| **OAuth Failure Spike** | > 10 errors in 5 min  | Email + Slack |
| **Server 5xx Errors**   | > 5 errors in 5 min   | Email + Slack |
| **Extension Crash**     | > 3 crashes in 10 min | Email         |
| **Sync Failure Rate**   | > 50% in 15 min       | Slack         |

#### Important Errors (P1) - Daily Digest

| Metric                  | Threshold          | Notification |
| ----------------------- | ------------------ | ------------ |
| **Daily Error Count**   | > 100 errors/day   | Email digest |
| **New Error Type**      | First occurrence   | Slack        |
| **Error Rate Increase** | +50% vs. 7-day avg | Email        |

### Dashboard Setup

**Key Metrics to Track:**

1. **Error Rate** - Errors per 1000 users
2. **Error Trends** - 7-day / 30-day comparison
3. **Top Errors** - Most frequent issues
4. **Affected Users** - Unique users experiencing errors
5. **Release Health** - Error rate per version

**Recommended Views:**

- **Overview Dashboard** - High-level metrics
- **Extension Errors** - Chrome extension specific
- **Server Errors** - API/backend errors
- **OAuth Flow** - Authentication issues
- **Sync Errors** - Bookmark sync failures

---

## Privacy & Compliance

### GDPR/CCPA Compliance

#### Data Collection

- ✅ **Minimal data** - Only error messages, stack traces, anonymized user ID
- ✅ **No PII** - Emails, passwords, tokens are scrubbed
- ✅ **Anonymized IDs** - User IDs are hashed before sending
- ✅ **Retention policy** - 30 days (configurable)

#### User Rights

- ✅ **Right to access** - Users can request their error data
- ✅ **Right to deletion** - Errors can be deleted on request
- ✅ **Right to opt-out** - Add opt-out mechanism (future)

#### Privacy Policy Update

**Add to privacy policy:**

> **Error Monitoring:** We use Sentry to monitor errors and improve our service. When an error occurs, we collect:
>
> - Error messages and stack traces
> - Anonymized user identifier (hashed)
> - Browser/OS version
> - Timestamp and affected feature
>
> We **do not** collect:
>
> - Personal information (emails, names)
> - Authentication tokens
> - Notion workspace data
> - Bookmark content
>
> Error data is retained for 30 days and is used solely for debugging and service improvement.

### Sentry Project Settings

**Configure in Sentry dashboard:**

1. **Data Scrubbing** (Settings → Security & Privacy)
   - ✅ Enable default scrubbing rules
   - ✅ Add custom rules:
     - `password`
     - `access_token`
     - `jwt`
     - `secret`
     - `notion_token`

2. **IP Address Anonymization**
   - ✅ Enable "Prevent Storing of IP Addresses"

3. **Data Retention**
   - Set to **30 days**

4. **Rate Limiting**
   - Enable per-key rate limits (10 errors/sec)

---

## Cost Analysis

### Sentry Pricing Tiers

| Tier                 | Errors/Month | Cost/Month | Storage | Support   |
| -------------------- | ------------ | ---------- | ------- | --------- |
| **Developer (Free)** | 5,000        | $0         | 30 days | Community |
| **Team**             | 50,000       | $26        | 90 days | Email     |
| **Business**         | 100,000      | $80        | 90 days | Priority  |

### Projected Costs

#### Launch Phase (Month 1-3)

- **Users:** 500-2,000
- **Errors:** ~2,000-5,000/month
- **Cost:** **$0** (free tier sufficient)

#### Growth Phase (Month 4-6)

- **Users:** 2,000-5,000
- **Errors:** ~5,000-15,000/month
- **Cost:** **$26/month** (Team plan)

#### Scale Phase (Month 7-12)

- **Users:** 5,000-10,000
- **Errors:** ~15,000-40,000/month
- **Cost:** **$26/month** (Team plan)

### Cost Optimization Strategies

1. **Error Sampling** - Sample 50% of low-priority errors
2. **Deduplication** - Sentry auto-groups similar errors
3. **Ignore Lists** - Ignore non-actionable errors (network timeouts)
4. **Rate Limiting** - Limit errors per user (prevents spam)

**Estimated Annual Cost:** $312 (assuming Team plan from Month 4)

---

## Success Metrics

### Quantitative Metrics

| Metric                             | Target       | Measurement             |
| ---------------------------------- | ------------ | ----------------------- |
| **Error Capture Rate**             | > 95%        | Sentry vs. console logs |
| **Alert Latency**                  | < 60 seconds | Time to email/Slack     |
| **False Positive Rate**            | < 5%         | Ignored errors / total  |
| **MTTR (Mean Time to Resolution)** | < 24 hours   | Critical errors only    |
| **Performance Overhead**           | < 5ms        | Average per operation   |

### Qualitative Metrics

- ✅ **Confidence** - Team feels confident about production health
- ✅ **Visibility** - Can diagnose user-reported issues quickly
- ✅ **Proactivity** - Detect issues before users report them
- ✅ **Prioritization** - Focus on high-impact bugs first

### Success Criteria (Week 1)

- [ ] 100% of unhandled errors are captured
- [ ] Zero false alerts (tune alert rules)
- [ ] < 5 minutes to diagnose user-reported issues
- [ ] No PII leaked in error reports (manual audit)

---

## Rollout Plan

### Pre-Launch (Week -1)

- [ ] Set up Sentry projects
- [ ] Configure privacy settings
- [ ] Set up alert rules
- [ ] Train team on Sentry dashboard
- [ ] Document incident response process

### Soft Launch (Week 0)

- [ ] Deploy to 10% of users (canary release)
- [ ] Monitor error rates for 3 days
- [ ] Tune alert rules (reduce noise)
- [ ] Verify PII scrubbing works
- [ ] Fix any critical issues

### Full Launch (Week 1)

- [ ] Deploy to 100% of users
- [ ] Monitor dashboard daily
- [ ] Respond to critical errors within 1 hour
- [ ] Weekly error review meeting

### Post-Launch (Ongoing)

- [ ] Monthly error trend analysis
- [ ] Quarterly alert rule review
- [ ] Biannual privacy audit
- [ ] Yearly Sentry plan review (cost optimization)

---

## Risks & Mitigation

| Risk                   | Impact    | Likelihood | Mitigation                                   |
| ---------------------- | --------- | ---------- | -------------------------------------------- |
| **PII Leak**           | 🔴 High   | 🟡 Medium  | Thorough beforeSend scrubbing + manual audit |
| **Cost Overrun**       | 🟡 Medium | 🟡 Medium  | Set up billing alerts + sampling             |
| **Performance Impact** | 🟢 Low    | 🟢 Low     | Async reporting + rate limiting              |
| **Sentry Downtime**    | 🟡 Medium | 🟢 Low     | Graceful degradation + local logging         |
| **Alert Fatigue**      | 🟡 Medium | 🟡 Medium  | Tune alert rules + daily digests             |

---

## Appendix

### A. Useful Sentry CLI Commands

```bash
# Upload source maps
sentry-cli sourcemaps upload --release=1.0.0 ./dist

# Create a new release
sentry-cli releases new 1.0.0
sentry-cli releases set-commits 1.0.0 --auto
sentry-cli releases finalize 1.0.0

# Test Sentry connection
sentry-cli info
```

### B. Example Error Event

```json
{
  "event_id": "abc123",
  "timestamp": "2025-12-24T10:30:00Z",
  "level": "error",
  "message": "Server-side bookmark sync failed",
  "exception": {
    "type": "APIError",
    "value": "Rate limited: Retry after 3600s",
    "stacktrace": {
      /* ... */
    }
  },
  "user": {
    "id": "user_123456789"
  },
  "tags": {
    "environment": "production",
    "release": "bookmark-assistant-extension@0.1.0",
    "browser": "Chrome 120"
  },
  "contexts": {
    "custom": {
      "bookmarkCount": 523,
      "syncHash": "abc123"
    }
  },
  "breadcrumbs": [
    {
      "timestamp": "2025-12-24T10:29:50Z",
      "message": "Sync state changed",
      "category": "sync",
      "data": { "inProgress": true }
    }
  ]
}
```

### C. Incident Response Playbook

**When a critical error is detected:**

1. **Acknowledge** (within 5 min)
   - Assign to on-call engineer
   - Add comment in Sentry issue

2. **Assess** (within 15 min)
   - Check affected user count
   - Review stack trace and breadcrumbs
   - Determine severity (P0/P1/P2)

3. **Communicate** (if P0)
   - Notify team in Slack
   - Update status page if needed

4. **Resolve** (within SLA)
   - Deploy hotfix if needed
   - Mark issue as resolved in Sentry
   - Document root cause

5. **Post-mortem** (within 48 hours for P0)
   - Write incident report
   - Identify preventive measures
   - Update monitoring/alerts

---

## Next Steps

### Immediate Actions (Before Implementation)

1. ✅ **Review this document** with team
2. ✅ **Approve technology choice** (Sentry)
3. ✅ **Allocate time** (1-2 days)
4. ✅ **Set up Sentry account** (free tier)
5. ✅ **Prepare environment variables**

### Post-Implementation

1. ✅ **Validate error capture** (trigger test errors)
2. ✅ **Tune alert rules** (reduce false positives)
3. ✅ **Update documentation** (team handbook)
4. ✅ **Train team** (Sentry dashboard walkthrough)
5. ✅ **Update privacy policy**

---

**Document Status:** ✅ Ready for Review
**Next Review Date:** Post-implementation (after testing)
**Owner:** Technical Lead
**Reviewers:** Engineering Team, Product Team

---

_This design document is part of the Production Readiness initiative. See [PRODUCTION_READINESS_ANALYSIS.md](../PRODUCTION_READINESS_ANALYSIS.md) for full context._

