# Documentation Index

This document provides an overview of all documentation and test files in the project.

---

## 📚 Core Documentation (Feature Design & Architecture)

### Extension Documentation
- **[CLAUDE.md](./CLAUDE.md)** - Project instructions and development guidance
- **[README.md](./README.md)** - Main project overview and quick start
- **[docs/STATE_MANAGEMENT.md](./docs/STATE_MANAGEMENT.md)** - Extension state management architecture
- **[docs/AUTO_SYNC.md](./docs/AUTO_SYNC.md)** - Auto-sync feature design and implementation
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide for all components
- **[docs/INTERNATIONALIZATION.md](./docs/INTERNATIONALIZATION.md)** - i18n strategy and implementation
- **[docs/NOTION_INTEGRATION.md](./docs/NOTION_INTEGRATION.md)** - Notion API integration design
- **[docs/PADDLE_INTEGRATION.md](./docs/PADDLE_INTEGRATION.md)** - Payment processing integration

### Server Documentation
- **[packages/server/DESCRIPTION_GENERATION_DESIGN.md](./packages/server/DESCRIPTION_GENERATION_DESIGN.md)** - Server-side description generation design
- **[packages/server/DESCRIPTION_GENERATION_IMPLEMENTATION.md](./packages/server/DESCRIPTION_GENERATION_IMPLEMENTATION.md)** - Implementation guide for description generation

---

## 🧪 Testing Documentation

### Test Infrastructure
- **[tests/README.md](./tests/README.md)** - Complete testing infrastructure guide
  - Unit test setup and examples
  - Integration test setup
  - Mock utilities and helpers
  - Best practices and CI/CD integration

### Test Helpers
- **[tests/helpers/chrome-mock.ts](./tests/helpers/chrome-mock.ts)** - Chrome API mock for extension tests
- **[tests/helpers/test-server.ts](./tests/helpers/test-server.ts)** - Test server setup for integration tests

---

## ✅ Test Files (Unit Tests)

### Extension Tests
- **[packages/extension/src/content/description-extractor.test.ts](./packages/extension/src/content/description-extractor.test.ts)**
  - Tests meta tag description extraction
  - Tests priority handling (meta name vs og:description)
  - Tests edge cases and error handling

- **[packages/extension/src/utils/url-normalizer.test.ts](./packages/extension/src/utils/url-normalizer.test.ts)**
  - Tests URL normalization logic
  - Tests trailing slash handling
  - Tests query parameter sorting
  - Tests fragment removal

### Server Tests
- **[packages/server/src/services/description-extractor.test.ts](./packages/server/src/services/description-extractor.test.ts)**
  - Tests meta description extraction (62 tests)
  - Tests OG description fallback (56 passing)
  - Tests validation methods and edge cases

- **[packages/server/src/services/notion.test.ts](./packages/server/src/services/notion.test.ts)**
  - Tests Notion client initialization (33 tests)
  - Tests database operations and page creation
  - Tests property building and mapping

- **[packages/server/src/services/userPrisma.test.ts](./packages/server/src/services/userPrisma.test.ts)**
  - Tests user upsert operations (39 tests)
  - Tests database queries and token updates
  - Tests error handling and fallbacks

- **[packages/server/src/services/paddlePricing.test.ts](./packages/server/src/services/paddlePricing.test.ts)**
  - Tests subscription retrieval (43 tests)
  - Tests entitlement checking and plan validation
  - Tests rate limit handling

- **[packages/server/src/middleware/auth.test.ts](./packages/server/src/middleware/auth.test.ts)**
  - Tests extension validation (19 tests)
  - Tests JWT session validation (15 passing)
  - Tests request logging and error handling

- **[packages/server/src/middleware/security.test.ts](./packages/server/src/middleware/security.test.ts)**
  - Tests CORS middleware (17 tests, 7 passing)
  - Tests rate limiting and origin validation
  - Tests security headers and callbacks

### Extension Tests
- **[packages/extension/src/background/sync.test.ts](./packages/extension/src/background/sync.test.ts)**
  - Tests bookmark path building (22 tests)
  - Tests sync logic for pro/free users
  - Tests error handling and metadata storage

### Shared Tests
- **[tests/unit/bookmark-formatter.test.ts](./tests/unit/bookmark-formatter.test.ts)**
  - Tests bookmark path building
  - Tests folder hierarchy handling
  - Tests edge cases

**Test Coverage Summary:** 201 tests across 8 test files (644% increase from 27 tests)

---

## 📦 Package Structure

### Extension (`packages/extension/`)
Chrome MV3 extension with React + TypeScript
- `src/background/` - Service worker
- `src/popup/` - Popup UI
- `src/options/` - Settings page
- `src/content/` - Content scripts

### Server (`packages/server/`)
OAuth & API backend with Express + TypeScript
- `src/routes/` - API routes
- `src/services/` - Business logic (Notion, Paddle, etc.)
- `src/middleware/` - Auth, rate limiting

### Website (`packages/website/`)
Marketing landing page with Next.js
- `pages/` - Next.js pages
- `components/` - React components

### Shared (`packages/shared/`)
Shared utilities and design tokens

---

## 🔄 Development Workflow

### Running Tests
```bash
# All unit tests
pnpm test

# With coverage report
pnpm test:coverage

# Watch mode (development)
pnpm test:watch

# Integration tests (slower)
pnpm test:integration

# Unit + integration tests
pnpm test:all

# Run specific package tests
pnpm test -- packages/extension
pnpm test -- packages/server

# Run specific test file
pnpm test -- url-normalizer

# Verbose output
pnpm test -- --reporter=verbose
```

**Current Test Status:** 201 tests (105 passing) - 55-60% coverage

### Building
```bash
# Build extension
pnpm build

# Build server
pnpm build:server

# Build all
pnpm build:all
```

### Development
```bash
# Extension dev server
pnpm dev

# Server dev
pnpm dev:server

# Website dev
pnpm dev:website
```

---

## 📝 Documentation Standards

### What to Document
✅ **Keep:**
- Feature design and architecture decisions
- Implementation guides
- API integration patterns
- Deployment procedures
- Testing infrastructure

❌ **Remove:**
- Fix history and debugging logs
- Temporary debugging guides
- Bug fix summaries
- Review documents

### Documentation Principles
1. **Focus on design, not implementation details**
2. **Explain the "why", not just the "what"**
3. **Include architecture diagrams where helpful**
4. **Keep up to date with code changes**
5. **Use examples to illustrate concepts**

---

## 🎯 Next Steps for Documentation

### High Priority
- [ ] Update STATE_MANAGEMENT.md for new persistent cache design
- [ ] Document the retry logic implementation in server
- [ ] Add API rate limiting documentation

### Medium Priority
- [ ] Create testing guide for contributors
- [ ] Document environment setup process
- [ ] Add troubleshooting guide

### Future
- [ ] Video walkthroughs for key features
- [ ] Interactive architecture diagrams
- [ ] Contributing guidelines

---

## 📞 Support

For questions about the codebase:
1. Check relevant documentation in `/docs`
2. Review test files for usage examples
3. See `CLAUDE.md` for development guidance
