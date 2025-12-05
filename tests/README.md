# 🧪 Testing Infrastructure

This directory contains the complete testing infrastructure for the Bookmark Notion Sync project.

## Directory Structure

```
tests/
├── unit/                   # Unit tests (fast, isolated)
│   └── bookmark-formatter.test.ts
├── integration/            # Integration tests (extension ↔ server)
│   └── auto-sync.integration.test.ts
├── e2e/                    # End-to-end tests (future)
├── helpers/                # Shared test utilities
│   ├── chrome-mock.ts      # Chrome API mocks
│   └── test-server.ts      # Test server setup
└── README.md              # This file
```

## Test Tiers

### Tier 1: Unit Tests
**Purpose:** Test logic in isolation  
**Speed:** Fast (<100ms per test)  
**Run:** On every commit  

**Locations:**
- `packages/extension/src/**/*.test.ts` - Extension logic
- `packages/server/src/**/*.test.ts` - Server logic
- `tests/unit/**/*.test.ts` - Shared utilities

**Run:**
```bash
pnpm test              # All unit tests
pnpm test:coverage     # With coverage report
```

### Tier 2: Integration Tests
**Purpose:** Test component interactions  
**Speed:** Medium (~5-10s per test)  
**Run:** Before deployment  

**Locations:**
- `tests/integration/**/*.test.ts`

**Run:**
```bash
pnpm test:integration
```

### Tier 3: E2E Tests (Future)
**Purpose:** Test full user flows in real browser  
**Speed:** Slow (~30s+ per test)  
**Run:** Before release  

**Run:**
```bash
pnpm test:e2e
```

## Configuration Files

### `vitest.config.ts`
Unit test configuration (extension + server)

### `vitest.integration.config.ts`
Integration test configuration with longer timeouts

## Test Utilities

### Chrome API Mock (`helpers/chrome-mock.ts`)
```typescript
import { setupChromeMock } from '../helpers/chrome-mock';

const chromeMock = setupChromeMock({
  session_token: 'test-token',
  user_id: 'user-123',
});

// Chrome API is now available globally
chrome.storage.local.get(['session_token']);
```

### Test Server (`helpers/test-server.ts`)
```typescript
import { createTestServer } from '../helpers/test-server';

const server = await createTestServer({ port: 3334 });
// Server is now running on http://localhost:3334
await server.stop();
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-module';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Test Example
```typescript
import { describe, it, beforeAll, afterAll } from 'vitest';
import { createTestServer } from '../helpers/test-server';
import { setupChromeMock } from '../helpers/chrome-mock';

describe('Integration Test', () => {
  let server;
  
  beforeAll(async () => {
    server = await createTestServer();
    setupChromeMock();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  it('should complete flow', async () => {
    // Test implementation
  });
});
```

## Best Practices

1. **Keep unit tests fast** - Mock all external dependencies
2. **Use descriptive test names** - Explain what is being tested
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Test edge cases** - Empty inputs, errors, boundary conditions
5. **Avoid test interdependence** - Each test should run independently

## CI/CD Integration

Tests run automatically on:
- Every commit (unit tests)
- Pull requests (unit + integration)
- Before deployment (all tests)

## Coverage Goals

- **Unit tests:** >80% coverage
- **Integration tests:** Critical paths covered
- **E2E tests:** Key user journeys covered

## Troubleshooting

### Tests fail with "chrome is not defined"
Ensure you're using `setupChromeMock()` in your test file.

### Integration tests timeout
Increase timeout in `vitest.integration.config.ts` or check if test server is running.

### Mock not working
Clear mocks in `beforeEach()` using `vi.clearAllMocks()`.

## Next Steps

1. ✅ Infrastructure setup complete
2. 🔄 Implement unit tests for bookmark formatting
3. 🔄 Implement integration tests for auto-sync
4. ⏳ Add E2E tests with Playwright
