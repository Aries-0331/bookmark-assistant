# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bookmark Assistant is a Chrome MV3 extension that syncs bookmarks to Notion databases. It's a monorepo with 4 packages:
- **extension** - Chrome extension (React + TypeScript, Vite)
- **server** - OAuth & API backend (Express + TypeScript, Node 20+)
- **website** - Marketing landing page (Next.js + TypeScript)
- **shared** - Shared design tokens & utilities

The extension uses a freemium model with Paddle for payments and Notion OAuth for authentication.

## Common Development Commands

### Package Management
```bash
pnpm install              # Install dependencies
pnpm dev                  # Run extension in development
pnpm dev:server           # Run backend server
pnpm dev:website          # Run marketing website
```

### Building
```bash
pnpm build                # Build extension only
pnpm build:all            # Build all packages
pnpm build:server         # Build backend
pnpm build:website        # Build website
```

### Testing
```bash
pnpm test                 # Run unit tests
pnpm test:watch           # Run tests in watch mode
pnpm test:unit            # Run unit tests (same as pnpm test)
pnpm test:integration     # Run integration tests (slower)
pnpm test:all             # Run unit + integration tests
pnpm test:coverage        # Run tests with coverage report
```

### Linting & Code Quality
```bash
pnpm lint                 # Lint all packages
pnpm clean                # Clean build artifacts
```

### Environment Validation
```bash
node scripts/validate-env.js development   # Validate dev environment
node scripts/validate-env.js production    # Validate prod environment
```

## Architecture Overview

### Monorepo Structure
```
packages/
├── extension/         # Chrome MV3 extension
│   ├── src/
│   │   ├── background/      # Service worker
│   │   ├── popup/           # Popup UI
│   │   ├── options/         # Settings page
│   │   ├── content/         # Content scripts
│   │   └── dev/             # Dev tools
│   ├── dist/                # Built extension
│   └── .env                 # Extension env vars
├── server/            # OAuth & API backend
│   ├── src/
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Auth, rate limiting
│   │   └── services/        # Notion, Paddle, DB
│   └── prisma/              # Database schema
├── website/           # Marketing landing page
│   ├── pages/         # Next.js pages
│   └── components/    # React components
└── shared/            # Shared utilities & tokens
```

### State Management (Extension)
The extension uses an event-driven state architecture:

- **Background Script** - Single source of truth, writes all state to `chrome.storage.local`
- **Chrome Storage** - Acts as the state bus for persistence
- **Zustand Store** - UI components subscribe via `useAppStore()`
- **Global Listeners** - Components listen to `chrome.storage.onChanged` events

**Key State Keys:**
- `sync_in_progress` - Sync operation flag
- `session_token` - JWT authentication token
- `is_connecting` - OAuth connection status
- `is_pro` - Pro tier status

### Sync Flow
1. Extension reads bookmarks from Chrome
2. Generates SHA-256 fingerprint of titles/URLs
3. Compares with last sync fingerprint
4. If changed, extracts content (title, description, metadata)
5. Sends to server API with JWT
6. Server validates entitlement (free vs pro)
7. Server syncs to Notion database

**Rate Limits:**
- Free: 24-hour min interval, auto-sync disabled
- Pro: 6-hour min interval, unlimited manual syncs

### OAuth Flow
```
Extension → Chrome Identity API → Notion OAuth
Extension sends auth code → Server
Server exchanges code → Notion API
Server stores user + returns JWT to extension
Extension stores JWT → Uses for API calls
```

## Key Technologies

### Extension Stack
- **Chrome Extension API** - MV3 with service workers
- **React 18** - UI components
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Server Stack
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - PostgreSQL ORM
- **JWT** - Authentication
- **Notion SDK** - Notion integration
- **Paddle SDK** - Payment processing
- **Vercel** - Deployment platform

### Server Dependencies
Node.js 20+ required for server package.

## Testing Infrastructure

Tests use Vitest with three tiers:

**Unit Tests** (`packages/*/src/**/*.test.ts`)
- Fast, isolated tests
- Mock Chrome APIs using `tests/helpers/chrome-mock.ts`
- Run: `pnpm test` or `pnpm test:watch`

**Integration Tests** (`tests/integration/**/*.test.ts`)
- Test extension ↔ server interactions
- Use `tests/helpers/test-server.ts` for mock server
- Run: `pnpm test:integration`

**Coverage**
- Unit test coverage reports in `/coverage`
- Integration coverage in `/coverage/integration`
- Goal: >80% unit test coverage

## Configuration Files

- **Root**
  - `vitest.config.ts` - Unit test config
  - `vitest.integration.config.ts` - Integration test config
  - `eslint.config.mjs` - Linting rules (different configs per package)
  - `pnpm-workspace.yaml` - Workspace configuration
  - `package.json` - Root scripts & dependencies

- **Per-Package**
  - `packages/*/package.json` - Individual package config
  - `packages/*/.env.example` - Environment variable template
  - `packages/extension/vite.config.ts` - Vite build config
  - `packages/server/prisma/schema.prisma` - Database schema

## Environment Setup

### Extension (packages/extension/.env)
```
VITE_SERVER_URL=http://localhost:3333
VITE_API_URL=http://localhost:3333/api
```

### Server (packages/server/.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
PADDLE_API_KEY=...
```

### Website (packages/website/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3333
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=...
```

## Development Workflow

### Working on Extension
```bash
pnpm dev  # Starts Vite dev server, watches for changes
# Loads extension from packages/extension/dist/dev
# Changes auto-reload
```

### Working on Server
```bash
pnpm dev:server  # Starts Express with nodemon
# Watch: packages/server/src/**/*.ts
# Prisma: Run `prisma generate` after schema changes
```

### Working on Website
```bash
pnpm dev:website  # Starts Next.js dev server on :3006
```

### Running Specific Tests
```bash
pnpm test -- packages/extension/src/popup  # Test specific directory
pnpm test -- --reporter=verbose            # Verbose output
```

## Deployment

### Extension
- Built with `pnpm build` → outputs to `packages/extension/dist`
- Load unpacked in Chrome for development
- Publish to Chrome Web Store for production

### Server
- Deploy to Vercel using `vercel --prod`
- Configure environment variables in Vercel dashboard
- Webhooks: Configure Paddle & Notion to point to deployed URL

### Website
- Next.js builds to `.next/`
- Deploy to Vercel or similar platform

See `docs.archive/process-guides/DEPLOYMENT.md` for detailed deployment steps.

## Important Documentation

- `docs/STATE_MANAGEMENT.md` - Extension state architecture
- `docs/PADDLE_INTEGRATION.md` - Payment integration
- `docs/NOTION_INTEGRATION.md` - Notion API usage
- `docs/AUTO_SYNC.md` - Auto-sync implementation
- `docs/INTERNATIONALIZATION.md` - i18n strategy
- `docs/DESCRIPTION_CACHE.md` - Content extraction caching

Archived documentation: See `docs.archive/process-guides/` for deployment, Chrome Web Store, and other legacy guides.

## Code Patterns

### Extension Components
- Use Zustand store for state: `const { state, action } = useAppStore()`
- Listen to storage changes: `chrome.storage.onChanged.addListener`
- Communicate with background: `chrome.runtime.sendMessage`
- Access storage: `chrome.storage.local.get/set`

### Server Routes
- Auth middleware validates JWT
- Rate limiting on sensitive endpoints
- Prisma for database operations
- Zod for input validation

### Testing
- Mock Chrome APIs: `setupChromeMock()` from test helpers
- Create test server: `createTestServer()` from helpers
- Use descriptive test names: "should do X when Y"
- Follow AAA pattern: Arrange, Act, Assert

## Notes

- Server requires Node.js 20+, extension requires Node.js 18+
- Use `pnpm -F <package>` to run commands in specific packages
- Extension uses MV3 service workers (ephemeral lifecycle)
- OAuth secrets never exposed to extension, server-side only
- Prisma schema changes require `prisma generate`
- Always run `pnpm lint` before committing
- Tests run on every commit via husky hooks
