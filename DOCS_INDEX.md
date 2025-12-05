# 📚 Documentation Index

Quick reference guide to all project documentation.

## 🚀 Getting Started

- **[README.md](README.md)** - Main project overview, features, and architecture
- **[QUICK_START_AUTH.md](QUICK_START_AUTH.md)** - Test OAuth flow and payment upgrade

## 🔧 Development Guides

### Core Features

- **[AUTO_SYNC.md](packages/extension/AUTO_SYNC.md)** - Auto-sync implementation details
  - Scheduling with Chrome Alarms API
  - Catch-up strategy for missed syncs
  - Plan limits (24h free, 6h pro)

### Payment Integration

- **[PADDLE_INTEGRATION.md](docs/PADDLE_INTEGRATION.md)** - Paddle Billing setup
  - Configuration & environment variables
  - Pricing: $5/month or $42/year
  - Webhook implementation

### Testing

- **[tests/README.md](tests/README.md)** - Testing infrastructure guide
  - Unit, integration, and E2E testing
  - Chrome API mocking utilities
  - Test server setup
  - Current coverage: 27% (13 passing tests)

- **[TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)** - Paddle integration testing
  - Sandbox setup steps
  - Webhook verification
  - Payment flow testing

### Technical Specifications

- **[SPEC.md](docs/SPEC.md)** - Database schema and user system
  - User model with Notion + Paddle integration
  - Email-based reconciliation
  - Authentication flows

## 📦 Package-Specific Docs

### Extension (`packages/extension/`)

- **AUTO_SYNC.md** - Auto-sync feature documentation

### Server (`packages/server/`)

- No package-specific docs (see main docs/)

### Website (`packages/website/`)

- **public/README.md** - Static assets documentation

## 🧪 Test Commands

```bash
# Run all tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## 🏗️ Development Commands

```bash
# Start extension dev server
pnpm dev

# Start backend server
pnpm dev:server

# Start website
pnpm dev:website

# Build all packages
pnpm build:all

# Run tests
pnpm test:all
```

## 📊 Current Status

- **Version**: 0.1.0 (Beta)
- **Test Coverage**: 27% (13 passing, 16 todo)
- **Auto-Sync**: ✅ Implemented with catch-up strategy
- **Payments**: ✅ Paddle integration complete
- **Testing**: ✅ Infrastructure complete

## 🔗 Quick Links

- [GitHub Repository](https://github.com/Aries-0331/bookmarks_to_notion)
- [Paddle Sandbox](https://sandbox-vendors.paddle.com/)
- [Notion API Docs](https://developers.notion.com/)

---

**Last Updated**: 2025-12-05
