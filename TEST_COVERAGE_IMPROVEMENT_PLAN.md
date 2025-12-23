# Test Coverage Improvement Plan

## Executive Summary

**Current State:** 27% test coverage (2 test files)
**Target:** 60%+ test coverage
**Timeline:** 5 days
**Files to Test:** 60+ TypeScript files across 4 packages

This plan provides a systematic approach to increase test coverage from 27% to 60%+, focusing on critical business logic and high-risk components first.

---

## Current Coverage Analysis

### Package Breakdown

| Package | Source Files | Test Files | Coverage | Status |
|---------|--------------|------------|----------|--------|
| **Extension** | 34 | 2 (url-normalizer, description-extractor) | ~40% | 🟡 Partial |
| **Server** | 16 | 0 | 0% | 🔴 Critical |
| **Shared** | 2 | 0 | N/A | 🟢 Minimal |
| **Website** | 15+ | 0 | 0% | 🟡 Consider |
| **Total** | 67+ | 2 | **27%** | 🔴 |

### Test Files to Create (Priority Order)

#### P0 - Critical (Must Complete)
1. **Server Services** (16 files)
   - `notion.ts` - Notion API integration
   - `description-extractor.ts` - Description extraction
   - `userPrisma.ts` - User database operations
   - `paddlePricing.ts` - Payment processing

2. **Server Routes** (8 files)
   - `bookmarks.ts` - Bookmark sync logic
   - `oauth.ts` - OAuth flow
   - `user.ts` - User management
   - `notion.ts` - Notion operations

3. **Server Middleware** (2 files)
   - `auth.ts` - Authentication
   - `security.ts` - Security middleware

4. **Extension Background** (7 files)
   - `sync.ts` - Sync logic
   - `auto-sync.ts` - Auto-sync
   - `server-api.ts` - API communication
   - `content-extractor.ts` - Content extraction

#### P1 - Important (Should Complete)
5. **Extension Utils** (5 files)
   - `cache.ts` - Caching logic
   - `bookmark.ts` - Bookmark utilities
   - `message.ts` - Message handling

6. **Extension Components** (12 files)
   - Popup component
   - Options page components

#### P2 - Nice to Have (If Time Permits)
7. **Website Components** (10+ files)
   - Landing page sections
   - UI components

---

## Implementation Strategy

### Phase 1: Server Services Tests (Day 1-2)

#### 1.1 Test `description-extractor.ts`
**Priority:** P0
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('DescriptionExtractor', () => {
  describe('extractFromUrl', () => {
    // Test valid HTTP/HTTPS URLs
    // Test invalid URLs
    // Test timeout handling
    // Test non-HTML content
  });

  describe('extractDescription', () => {
    // Test meta description priority
    // Test og:description fallback
    // Test structured content extraction
    // Test title validation
    // Test invalid/empty descriptions
  });

  describe('isValidDescription', () => {
    // Test length validation
    // Test brand pattern rejection
    // Test all-caps rejection
    // Test single word rejection
  });

  describe('looksLikeDescription', () => {
    // Test brand pattern detection
    // Test navigation word detection
    // Test descriptive language detection
    // Test sentence detection
  });

  describe('normalizeUrl', () => {
    // Test trailing slash removal
    // Test query parameter sorting
    // Test fragment removal
    // Test edge cases
  });
});
```

**File:** `packages/server/src/services/description-extractor.test.ts`

#### 1.2 Test `notion.ts`
**Priority:** P0
**Complexity:** High
**Test Cases Needed:**

```typescript
describe('NotionService', () => {
  describe('findDatabase', () => {
    // Test database search
    // Test database validation
    // Test property detection
  });

  describe('createPages', () => {
    // Test batch page creation
    // Test property mapping
    // Test error handling
    // Test rate limiting
  });

  describe('updatePage', () => {
    // Test page updates
    // Test property updates
    // Test conflict handling
  });

  describe('buildProperties', () => {
    // Test property building logic
    // Test field mapping
    // Test type conversions
  });
});
```

**File:** `packages/server/src/services/notion.test.ts`

#### 1.3 Test `userPrisma.ts`
**Priority:** P0
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('UserPrisma', () => {
  describe('find', () => {
    // Test user lookup
    // Test non-existent user
    // Test database errors
  });

  describe('create', () => {
    // Test user creation
    // Test duplicate handling
    // Test validation
  });

  describe('update', () => {
    // Test user updates
    // Test partial updates
    // Test concurrency
  });
});
```

**File:** `packages/server/src/services/userPrisma.test.ts`

#### 1.4 Test `paddlePricing.ts`
**Priority:** P0
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('PaddlePricing', () => {
  describe('getSubscription', () => {
    // Test subscription lookup
    // Test status handling
    // Test plan detection
  });

  describe('checkEntitlement', () => {
    // Test free tier limits
    // Test pro tier access
    // Test feature gating
  });
});
```

**File:** `packages/server/src/services/paddlePricing.test.ts`

### Phase 2: Server Routes Tests (Day 2-3)

#### 2.1 Test `bookmarks.ts`
**Priority:** P0
**Complexity:** High
**Test Cases Needed:**

```typescript
describe('Bookmarks Routes', () => {
  describe('POST /sync', () => {
    // Test successful sync
    // Test duplicate detection
    // Test description generation
    // Test batch processing
    // Test rate limiting
    // Test error handling
    // Test validation
  });

  describe('diffBookmarks', () => {
    // Test syncId matching
    // Test URL matching
    // Test duplicate detection
    // Test edge cases
  });
});
```

**File:** `packages/server/src/routes/bookmarks.test.ts`

#### 2.2 Test `oauth.ts`
**Priority:** P0
**Complexity:** High
**Test Cases Needed:**

```typescript
describe('OAuth Routes', () => {
  describe('GET /authorize', () => {
    // Test redirect generation
    // Test state validation
    // Test CSRF protection
  });

  describe('POST /callback', () => {
    // Test code exchange
    // Test user creation
    // Test JWT generation
    // Test error handling
  });

  describe('POST /logout', () => {
    // Test token invalidation
    // Test session cleanup
  });
});
```

**File:** `packages/server/src/routes/oauth.test.ts`

#### 2.3 Test Other Routes
- `user.ts` - User management routes
- `notion.ts` - Notion operation routes
- `paddle.ts` - Payment webhook routes

### Phase 3: Server Middleware Tests (Day 3)

#### 3.1 Test `auth.ts`
**Priority:** P0
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Auth Middleware', () => {
  describe('validateSession', () => {
    // Test valid JWT
    // Test invalid JWT
    // Test expired token
    // Test missing token
  });

  describe('extractUser', () => {
    // Test user extraction
    // Test token parsing
  });
});
```

**File:** `packages/server/src/middleware/auth.test.ts`

#### 3.2 Test `security.ts`
**Priority:** P0
**Complexity:** Low
**Test Cases Needed:**

```typescript
describe('Security Middleware', () => {
  describe('rateLimiter', () => {
    // Test rate limit enforcement
    // Test IP tracking
  });

  describe('cors', () => {
    // Test CORS headers
    // Test origin validation
  });
});
```

**File:** `packages/server/src/middleware/security.test.ts`

### Phase 4: Extension Background Tests (Day 3-4)

#### 4.1 Test `sync.ts`
**Priority:** P0
**Complexity:** High
**Test Cases Needed:**

```typescript
describe('Sync Logic', () => {
  describe('syncAllBookmarksToNotion', () => {
    // Test bookmark flattening
    // Test path building
    // Test API communication
    // Test error handling
  });

  describe('buildBookmarkPath', () => {
    // Test path construction
    // Test nested folders
    // Test edge cases
  });
});
```

**File:** `packages/extension/src/background/sync.test.ts`

#### 4.2 Test `auto-sync.ts`
**Priority:** P0
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Auto Sync', () => {
  describe('scheduleSync', () => {
    // Test interval calculation
    // Test free vs pro tiers
    // Test throttling
  });

  describe('onBookmarksChanged', () => {
    // Test change detection
    // Test sync triggering
    // Test batching
  });
});
```

**File:** `packages/extension/src/background/auto-sync.test.ts`

#### 4.3 Test `server-api.ts`
**Priority:** P0
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Server API', () => {
  describe('syncBookmarks', () => {
    // Test API calls
    // Test authentication
    // Test error handling
    // Test retry logic
  });

  describe('authenticate', () => {
    // Test OAuth flow
    // Test token refresh
  });
});
```

**File:** `packages/extension/src/background/server-api.test.ts`

### Phase 5: Extension Utils Tests (Day 4)

#### 5.1 Test `cache.ts`
**Priority:** P1
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Cache Utils', () => {
  describe('getCached', () => {
    // Test cache retrieval
    // Test TTL handling
  });

  describe('setCached', () => {
    // Test cache storage
    // Test expiration
  });

  describe('invalidate', () => {
    // Test cache invalidation
    // Test pattern matching
  });
});
```

**File:** `packages/extension/src/utils/cache.test.ts`

#### 5.2 Test `bookmark.ts`
**Priority:** P1
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Bookmark Utils', () => {
  describe('flattenBookmarks', () => {
    // Test tree flattening
    // Test filtering
  });

  describe('groupByParent', () => {
    // Test grouping logic
    // Test hierarchy
  });
});
```

**File:** `packages/extension/src/utils/bookmark.test.ts`

### Phase 6: Extension Component Tests (Day 4-5)

#### 6.1 Test Popup Component
**Priority:** P1
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Popup Component', () => {
  describe('render', () => {
    // Test UI rendering
    // Test state display
  });

  describe('handleSync', () => {
    // Test sync triggering
    // Test loading states
    // Test success/error
  });
});
```

**File:** `packages/extension/src/popup/popup.test.tsx`

#### 6.2 Test Options Page Components
**Priority:** P1
**Complexity:** Medium
**Test Cases Needed:**

```typescript
describe('Options Components', () => {
  describe('ConnectionSection', () => {
    // Test connection status
    // Test OAuth flow
  });

  describe('SyncSettingsSection', () => {
    // Test settings display
    // Test configuration updates
  });

  describe('BillingSection', () => {
    // Test plan display
    // Test upgrade flow
  });
});
```

**File:** `packages/extension/src/options/options.test.tsx`

### Phase 7: Integration Tests (Day 5)

#### 7.1 OAuth Flow Integration Test
**Priority:** P0
**Complexity:** High

```typescript
describe('OAuth Flow Integration', () => {
  test('complete OAuth flow', async () => {
    // Test extension → server → Notion OAuth
    // Test token exchange
    // Test user creation
  });
});
```

**File:** `tests/integration/oauth.test.ts`

#### 7.2 Bookmark Sync Integration Test
**Priority:** P0
**Complexity:** High

```typescript
describe('Bookmark Sync Integration', () => {
  test('sync bookmarks end-to-end', async () => {
    // Test extension → server → Notion
    // Test description extraction
    // Test duplicate detection
  });
});
```

**File:** `tests/integration/sync.test.ts`

---

## Testing Infrastructure Setup

### 1. Install Required Dependencies

```bash
# Server testing
pnpm add -D @vitest/spy @prisma/client @notionhq/client

# Extension testing
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom

# Integration testing
pnpm add -D supertest nock
```

### 2. Update Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'tests/',
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60,
        },
      },
    },
  },
});
```

### 3. Create Test Utilities

```typescript
// tests/helpers/test-server.ts
import { createServer } from 'http';
import { setupServer } from '../../packages/server/src';

export function createTestServer() {
  const app = setupServer();
  const server = createServer(app);
  return { app, server };
}

// tests/helpers/chrome-mock.ts
export function setupChromeMock() {
  // Mock chrome.runtime, chrome.storage, etc.
}
```

---

## Coverage Goals by Package

### Target Coverage

| Package | Current | Target | Tests Needed |
|---------|---------|--------|--------------|
| **Server** | 0% | 70% | 8 test files |
| **Extension** | 40% | 65% | 6 test files |
| **Shared** | N/A | 80% | Minimal |
| **Website** | 0% | 50% | 2 test files |
| **Integration** | 0% | N/A | 2 test files |
| **Total** | **27%** | **65%** | **18 test files** |

### Code Coverage by Type

| Coverage Type | Current | Target | Focus Areas |
|---------------|---------|--------|-------------|
| **Branches** | 20% | 60% | Error handling, edge cases |
| **Functions** | 25% | 60% | Business logic, utilities |
| **Lines** | 27% | 60% | All code paths |
| **Statements** | 27% | 60% | Code execution |

---

## Test Quality Standards

### 1. Test Naming Convention

```typescript
// ✅ Good
describe('NotionService', () => {
  it('should create a page in Notion database with correct properties', () => { });
  it('should throw error when database not found', () => { });
});

// ❌ Bad
describe('NotionService', () => {
  it('test create', () => { });
});
```

### 2. Test Structure (AAA Pattern)

```typescript
it('should handle sync errors gracefully', () => {
  // Arrange
  const mockError = new Error('Network timeout');
  vi.mocked(api.syncBookmarks).mockRejectedValue(mockError);

  // Act
  const result = syncBookmarks(bookmarks);

  // Assert
  expect(result.success).toBe(false);
  expect(result.error).toContain('timeout');
});
```

### 3. Mock External Dependencies

```typescript
// Mock Notion API
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    pages: {
      create: vi.fn(),
      update: vi.fn(),
    },
    search: vi.fn(),
  })),
}));

// Mock chrome API
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
});
```

### 4. Test Edge Cases

```typescript
describe('syncBookmarks', () => {
  it('should handle empty bookmarks array', () => {
    // Test edge case
  });

  it('should handle malformed bookmark data', () => {
    // Test validation
  });

  it('should handle API rate limits', () => {
    // Test rate limiting
  });

  it('should handle network timeouts', () => {
    // Test timeout handling
  });
});
```

---

## Execution Timeline

### Day 1: Server Services
- [ ] `description-extractor.test.ts`
- [ ] `notion.test.ts`
- [ ] `userPrisma.test.ts`
- [ ] `paddlePricing.test.ts`

### Day 2: Server Routes
- [ ] `bookmarks.test.ts`
- [ ] `oauth.test.ts`
- [ ] `user.test.ts`
- [ ] `notion-routes.test.ts`

### Day 3: Server Middleware + Extension Background
- [ ] `auth.test.ts`
- [ ] `security.test.ts`
- [ ] `sync.test.ts`
- [ ] `auto-sync.test.ts`
- [ ] `server-api.test.ts`

### Day 4: Extension Utils + Components
- [ ] `cache.test.ts`
- [ ] `bookmark.test.ts`
- [ ] `message.test.ts`
- [ ] `popup.test.tsx`
- [ ] `options.test.tsx`

### Day 5: Integration + Coverage Verification
- [ ] `oauth.integration.test.ts`
- [ ] `sync.integration.test.ts`
- [ ] Run coverage report
- [ ] Verify 60%+ coverage
- [ ] Fix coverage gaps

---

## Success Metrics

### Quantitative Goals

- [ ] **60%+ overall coverage** (lines, functions, branches)
- [ ] **18 new test files** created
- [ ] **100+ new test cases** added
- [ ] **All critical paths tested** (OAuth, sync, payment)
- [ ] **Zero failing tests** in CI/CD

### Qualitative Goals

- [ ] **High-value logic covered** (business rules, error handling)
- [ ] **Edge cases tested** (timeouts, rate limits, malformed data)
- [ ] **Integration tests** verify end-to-end flows
- [ ] **Tests are maintainable** (clear, well-named, isolated)
- [ ] **Test suite runs fast** (<30 seconds)

---

## Risk Mitigation

### Risk 1: Too Much Work for 5 Days
**Mitigation:** Focus on P0 items first (server services, routes, critical extension logic). P1 and P2 can be completed post-launch if needed.

### Risk 2: Mocking Complexity
**Mitigation:** Use existing `chrome-mock.ts` helper. Create similar helpers for Notion API, Prisma, and other services.

### Risk 3: Integration Test Flakiness
**Mitigation:** Start with well-isolated unit tests. Add integration tests only after unit test coverage is solid.

### Risk 4: Test Maintenance Burden
**Mitigation:** Follow AAA pattern. Keep tests simple and focused. Use descriptive test names.

---

## Tools and Resources

### Testing Libraries

- **Vitest** - Test runner (already configured)
- **Testing Library** - React component testing
- **Sinon** - Spy/stub/mock utilities
- **Supertest** - HTTP endpoint testing

### Coverage Tools

- **@vitest/coverage-v8** - Built-in coverage (already configured)
- **HTML coverage report** - For detailed analysis

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
```

---

## Post-Implementation Actions

### 1. Update Documentation
- [ ] Update `tests/README.md` with new test structure
- [ ] Document testing best practices in `CONTRIBUTING.md`
- [ ] Add test coverage badges to README

### 2. CI/CD Integration
- [ ] Add coverage thresholds to CI
- [ ] Block PRs with <60% coverage
- [ ] Generate coverage reports on PRs

### 3. Maintain Coverage
- [ ] Set coverage goal: **never drop below 60%**
- [ ] Add pre-commit hook: `pnpm test:coverage`
- [ ] Review test coverage in code reviews

### 4. Future Improvements
- [ ] Add visual regression tests for UI
- [ ] Add performance benchmarks
- [ ] Add security testing (SAST/DAST)
- [ ] Add mutation testing for test quality

---

## Conclusion

This plan provides a clear, systematic approach to increase test coverage from 27% to 60%+ within 5 days. By focusing on high-priority business logic first (server services and routes), we ensure that the most critical paths are well-tested before launch.

The key to success:
1. **Start with P0 items** (server services and routes)
2. **Follow AAA pattern** (Arrange, Act, Assert)
3. **Mock external dependencies** (Notion API, chrome APIs)
4. **Test edge cases** (errors, timeouts, rate limits)
5. **Verify coverage** (use Vitest coverage reports)

With 18 new test files and 100+ test cases, we'll have comprehensive coverage of the critical paths and significantly reduce the risk of production bugs.

---

**Next Steps:**
1. Review and approve this plan
2. Set up testing infrastructure (Day 0)
3. Begin Phase 1 implementation (Day 1)
4. Track progress daily
5. Verify coverage target (Day 5)
