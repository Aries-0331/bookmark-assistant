# Bookmark Assistant

> **AI-powered Chrome extension for intelligent bookmark management and seamless Notion synchronization**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

Bookmark Assistant is a professional-grade Chrome extension that transforms how you organize and sync bookmarks. Built with modern web technologies, it offers intelligent content extraction, secure OAuth authentication, and a flexible freemium model with Pro features for power users.

---

## 🎯 Product Overview

### **What It Does**
Bookmark Assistant bridges the gap between your Chrome bookmarks and Notion workspace, providing:
- **One-click synchronization** of bookmarks to Notion databases
- **Smart content extraction** from bookmarked pages (title, description, metadata)
- **Automatic background sync** with configurable intervals (Pro feature)
- **Fingerprint-based change detection** to avoid redundant syncs
- **Freemium model** with usage limits and Pro upgrade path

### **Who It's For**
- **Knowledge workers** managing research and references
- **Content creators** organizing inspiration and resources
- **Developers** bookmarking documentation and tutorials
- **Students** collecting academic materials
- **Power users** wanting advanced automation and AI features (coming soon)

---

## ✨ Core Features

### **Free Tier**
| Feature | Specification |
|---------|--------------|
| **Daily Sync Limit** | 50 bookmarks/day |
| **Manual Sync** | One-click bulk export to Notion |
| **Content Extraction** | Title, URL, description, metadata |
| **OAuth Integration** | Secure Notion workspace connection |
| **Sync Interval** | Minimum 12 hours between auto-syncs |
| **Database Mapping** | Single Notion database per connection |

### **Pro Tier**
| Feature | Specification |
|---------|--------------|
| **Unlimited Syncs** | No daily restrictions |
| **Auto-Sync** | Background synchronization every 30+ minutes |
| **Priority Support** | Faster response times |
| **Advanced Features** | Access to AI tagging and summarization (roadmap) |
| **Custom Mapping** | Multiple database support (planned) |
| **Pricing** | $10/month or $72/year (40% discount) |

---

## 🚀 Advanced Features (Roadmap)

### **Phase 1: Intelligence Layer** 🔮
- [ ] **AI-Powered Tagging**: Automatic category and topic detection using OpenAI
- [ ] **Smart Summaries**: AI-generated content summaries for quick review
- [ ] **Tag Templates**: Custom tagging rules and patterns
- [ ] **Duplicate Detection**: Identify and merge similar bookmarks

### **Phase 2: Workflow Automation** 🔧
- [ ] **Folder Mapping**: Sync Chrome folders to Notion databases
- [ ] **Bulk Operations**: Edit, delete, or move multiple bookmarks at once
- [ ] **Export/Import**: Backup and restore bookmark collections
- [ ] **Multi-Database Support**: Route bookmarks to different Notion databases

### **Phase 3: Analytics & Insights** 📊
- [ ] **Usage Statistics**: Track sync frequency, bookmark growth, tag distribution
- [ ] **Content Analysis**: Identify trending topics and reading patterns
- [ ] **Search Enhancement**: Full-text search across bookmark content
- [ ] **Recommendations**: Suggest related bookmarks and tags

---

## 🏗️ Product Structure

### **Monorepo Architecture**
```
bookmark-notion-sync/
├── packages/
│   ├── extension/       # Chrome MV3 extension (client)
│   ├── server/          # OAuth & API server (backend)
│   ├── website/         # Marketing landing page
│   └── shared/          # Shared design tokens & utilities
├── scripts/             # Build and development automation
└── tests/              # E2E, integration, and unit tests
```

### **Package Details**

#### **1. Extension** (`packages/extension/`)
**Purpose**: Chrome Manifest V3 extension providing the user interface and client-side logic.

**Key Components**:
- `src/background/` — Service worker handling sync, OAuth, content extraction
  - `index.ts` — Message router and sync orchestration
  - `oauth.ts` — Chrome Identity API OAuth flow
  - `bookmark-sync.ts` — Bulk sync pipeline with fingerprinting
  - `content-extractor.ts` — Intelligent page content extraction
  - `server-api.ts` — Backend API client with timeout and retry logic
  - `ai-tagger.ts` — AI tagging stub (future feature)
- `src/options/` — React-based settings UI
  - `store.ts` — Event-driven state management via Zustand + chrome.storage
  - `components/` — Connection, sync settings, billing, overview sections
- `src/assets/` — Logos, favicons (canonical brand source)
- `public/manifest.json` — MV3 manifest with permissions and background worker

**Tech Stack**: Vite 5, React 18, TypeScript 5.9, Tailwind CSS 3, Zustand, @notionhq/client

---

#### **2. Server** (`packages/server/`)
**Purpose**: Secure OAuth proxy and API gateway for Notion integration.

**Key Routes**:
- `/oauth` — Notion OAuth token exchange
- `/bookmarks` — Sync bookmarks to Notion with rate limiting and entitlement checks
- `/entitlements` — Fetch user subscription status (Free vs. Pro)
- `/user/profile` — Retrieve user metadata
- `/notion` — Proxy Notion API calls with authentication

**Architecture**:
- `src/middleware/` — Auth (JWT), security (Helmet, CORS, rate limiting)
- `src/services/` — Notion client wrapper, Prisma DB operations
- `prisma/schema.prisma` — User, subscription, and session data models

**Tech Stack**: Node.js 18+, Express, Prisma (PostgreSQL), JWT, bcrypt, Vercel serverless

---

#### **3. Website** (`packages/website/`)
**Purpose**: Marketing landing page with product information, pricing, and CTA.

**Structure**:
- `app/` — Next.js 14 App Router
  - `layout.tsx` — Global layout with metadata and favicon refs
  - `page.tsx` — Renders landing page composition
- `components/sections/` — Hero, Features, How It Works, Pricing, FAQ, CTA, Footer
- `components/ui/` — Reusable primitives (Button, Card, Badge, Accordion)
- `components/icons/` — Logo component using synced brand assets
- `public/` — Static assets synced from extension via prebuild hook

**Tech Stack**: Next.js 14, React 18, TypeScript 5.9, Tailwind CSS 3, Framer Motion

---

#### **4. Shared** (`packages/shared/`)
**Purpose**: Centralized design tokens and Tailwind preset for consistent branding.

**Exports**:
- `tokens.js` — Brand color palette
- `tailwind-preset.js` — Tailwind configuration preset consuming tokens

**Usage**: Website imports the preset; extension can optionally adopt it for UI consistency.

---

## 🛠️ Technical Architecture

### **Frontend (Extension)**
```
┌─────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                     │
│  ┌──────────────────┐    ┌─────────────────────┐   │
│  │  Options Page    │    │  Background Worker  │   │
│  │  (React UI)      │◄──►│  (Service Worker)   │   │
│  │  - Settings      │    │  - OAuth            │   │
│  │  - Sync Status   │    │  - Sync Logic       │   │
│  │  - Entitlements  │    │  - Content Extract  │   │
│  └──────────────────┘    └─────────────────────┘   │
│         │                           │               │
│         │  chrome.storage.onChanged │               │
│         └───────────────────────────┘               │
└─────────────────────────────────────────────────────┘
              │                     │
              │ OAuth Flow          │ API Calls
              ▼                     ▼
┌─────────────────────────────────────────────────────┐
│  Backend Server (Express + Prisma)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ OAuth Proxy  │  │ Entitlements │  │ Bookmarks│  │
│  │ (Notion)     │  │ (JWT + DB)   │  │ (Notion) │  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────┘
              │                     │
              │                     │
              ▼                     ▼
       ┌─────────────┐      ┌─────────────┐
       │  Notion API │      │  PostgreSQL │
       │  (OAuth 2.0)│      │  (Prisma)   │
       └─────────────┘      └─────────────┘
```

### **Key Technical Decisions**

#### **1. Event-Driven State Management**
- **Pattern**: `chrome.storage.onChanged` listeners instead of polling
- **Why**: MV3 service workers are ephemeral; storage is the source of truth
- **Implementation**: Options UI listens to `session_token`, `last_sync`, `sync_in_progress` keys

#### **2. Sync Fingerprinting**
- **Mechanism**: SHA-256 hash of bookmark titles/URLs to detect changes
- **Benefit**: Avoids redundant syncs when no bookmarks have changed
- **UX**: Minimal spinner duration (1.2s) to prevent flicker on "no changes" syncs

#### **3. Secure OAuth Flow**
- **Client Secret**: Never exposed to extension; stored server-side only
- **Token Exchange**: Extension gets auth code via Chrome Identity API → sends to server → receives JWT
- **API Calls**: Extension includes JWT in headers; server validates and proxies to Notion

#### **4. Rate Limiting & Entitlements**
- **Free Tier**: 50 bookmarks/day, 12-hour min interval
- **Pro Tier**: Unlimited syncs, 30-minute min interval
- **Enforcement**: Server checks entitlements before processing sync requests
- **Cooldown**: Server returns `Retry-After` header; extension respects cooldown period

#### **5. Content Extraction Pipeline**
```typescript
// Extraction priority:
1. Active tab injection (if URL matches)
2. Find tab by URL → inject script
3. Fallback: URL metadata (hostname, path)

// Extracted fields:
- Title (meta og:title > <title> > <h1>)
- Description (meta description > og:description)
- Keywords (meta keywords)
- Content (main > article > body, max 5000 chars)
```

---

## � Tech Stack Summary

### **Extension**
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Build Tool | Vite | 5.0 | Fast dev server, HMR, ESM bundling |
| Framework | React | 18.2 | UI rendering and state management |
| Language | TypeScript | 5.9 | Type safety and developer experience |
| Styling | Tailwind CSS | 3.3 | Utility-first responsive design |
| State | Zustand | 4.5 | Lightweight global state |
| API Client | @notionhq/client | 5.0 | Notion API integration |
| Extension API | @types/chrome | 0.0.254 | Chrome MV3 type definitions |

### **Server**
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | Server execution environment |
| Framework | Express | 4.18 | HTTP routing and middleware |
| Database | PostgreSQL | - | User and subscription data |
| ORM | Prisma | 6.17 | Type-safe database client |
| Auth | JWT | 9.0 | Stateless authentication tokens |
| Security | Helmet + CORS | - | HTTP headers and CORS policies |
| Rate Limiting | express-rate-limit | 7.1 | API abuse prevention |
| Deployment | Vercel | - | Serverless deployment |

### **Website**
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 14.2 | React meta-framework with SSG |
| Router | App Router | - | File-based routing with RSC |
| Language | TypeScript | 5.9 | Type safety |
| Styling | Tailwind CSS | 3.4 | Utility-first responsive design |
| Animation | Framer Motion | 12.23 | Declarative animations |
| Icons | Lucide React | 0.546 | SVG icon library |

### **Development Tools**
| Tool | Purpose |
|------|---------|
| pnpm | Fast, disk-efficient package manager for monorepo |
| ESLint | Linting and code quality enforcement |
| Prettier | Opinionated code formatting |
| Husky | Git hooks for pre-commit/pre-push validation |
| Commitlint | Enforce conventional commit messages |
| TypeScript | Type checking across all packages |

---

## 🚀 Quick Start

### **For Users**

#### **1. Install the Extension**
1. Download the extension from Chrome Web Store *(coming soon)* or load unpacked from `packages/extension/dist`
2. Click "Add to Chrome" and grant requested permissions

#### **2. Connect to Notion**
1. Click the extension icon in Chrome toolbar
2. Navigate to **Settings** (Options page)
3. Click **Connect to Notion**
4. Complete OAuth authentication in the popup
5. Grant access to your Notion workspace

#### **3. Configure Database**
1. In Notion, create a database with these properties:
   - `Title` (Title) — Bookmark title
   - `URL` (URL) — Bookmark URL
   - `Description` (Text) — Page description
   - `Created` (Date) — Bookmark creation timestamp
   - `BookmarkId` (Text) — Unique identifier
   - `Source` (Text) — Default: "Chrome Bookmarks"
2. Copy the database ID from the Notion URL:
   ```
   https://notion.so/workspace/{database_id}?v=...
                              ^^^^^^^^^^^
   ```
3. Paste the database ID in extension settings

#### **4. Sync Bookmarks**
1. Click **Sync All Bookmarks** in the extension popup
2. Monitor progress in the UI (processes 5 bookmarks at a time)
3. Check your Notion database to see imported bookmarks

---

### **For Developers**

#### **Prerequisites**
- Node.js ≥18.0.0
- pnpm ≥9.0.0
- Chrome browser (for extension testing)
- Notion account (for OAuth integration)
- PostgreSQL database (for server development)

#### **1. Clone & Install**
```bash
git clone https://github.com/Aries-0331/bookmarks_to_notion.git
cd bookmark-notion-sync

# Install all dependencies across packages
pnpm install -r
```

#### **2. Environment Setup**

**Extension** (`packages/extension/.env.development`):
```env
# Notion OAuth Client ID (public, safe for client-side)
VITE_NOTION_CLIENT_ID=your_notion_client_id

# Server API endpoint
VITE_API_URL=http://localhost:3000

# Optional: Feature flags
VITE_EDITION=open-source  # or "pro"
```

**Server** (`packages/server/.env`):
```env
# Notion OAuth credentials (NEVER expose client secret in extension)
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:3000/oauth/callback

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/bookmark_assistant

# JWT signing secret (generate with scripts/generate-jwt-secrets.sh)
JWT_SECRET=your_random_256_bit_secret

# Server configuration
PORT=3000
NODE_ENV=development
```

**Website** (`packages/website/.env.local`):
```env
# Optional: Analytics, feature flags, etc.
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### **3. Development Workflow**

**Start Extension Dev Server**:
```bash
pnpm dev              # Start extension with HMR
# Extension loads at http://localhost:5173/src/dev/index.html
# Load unpacked from packages/extension/dist after build
```

**Start Backend Server**:
```bash
pnpm dev:server       # Start Express server with nodemon
# API available at http://localhost:3000
```

**Start Website Dev Server**:
```bash
pnpm dev:website      # Start Next.js dev server
# Website available at http://localhost:3006
```

**Run All Services**:
```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm dev:server

# Terminal 3
pnpm dev:website
```

#### **4. Build for Production**

**Extension**:
```bash
pnpm build            # or pnpm -F @bookmark-assistant/extension build:prod
# Output: packages/extension/dist/
# Load unpacked in Chrome from this directory
```

**Server**:
```bash
pnpm build:server
# Output: packages/server/dist/
# Deploy to Vercel or your preferred Node.js host
```

**Website**:
```bash
pnpm build:website
# Output: packages/website/.next/
# Deploy to Vercel or static hosting
```

#### **5. Load Extension in Chrome**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select `packages/extension/dist` folder
5. Extension icon should appear in toolbar

---

## � Project Scripts

All scripts can be run from the monorepo root or individual packages.

### **Root-Level Scripts** (run from `/`)
```bash
# Development
pnpm dev              # Start extension dev server
pnpm dev:server       # Start backend API server
pnpm dev:website      # Start marketing website

# Production Builds
pnpm build            # Build extension only
pnpm build:server     # Build server only
pnpm build:website    # Build website only
pnpm build:all        # Build all packages

# Quality & Testing
pnpm lint             # Lint all packages
pnpm test             # Run all test suites
pnpm clean            # Remove all build artifacts

# Server Operations
pnpm start:server     # Start production server
pnpm start:website    # Start production website
```

### **Package-Specific Scripts**
```bash
# Extension
pnpm -F @bookmark-assistant/extension dev
pnpm -F @bookmark-assistant/extension build
pnpm -F @bookmark-assistant/extension build:prod
pnpm -F @bookmark-assistant/extension type-check

# Server
pnpm -F @bookmark-assistant/server dev
pnpm -F @bookmark-assistant/server build
pnpm -F @bookmark-assistant/server prisma:generate
pnpm -F @bookmark-assistant/server prisma:migrate

# Website
pnpm -F @bookmark-assistant/website dev
pnpm -F @bookmark-assistant/website build
pnpm -F @bookmark-assistant/website start
```

### **Utility Scripts** (in `scripts/`)
```bash
# Sync brand assets from extension to website
node scripts/sync-brand-assets.mjs

# Generate JWT secrets for server
./scripts/generate-jwt-secrets.sh

# Validate environment configuration
node scripts/validate-env.js

# Development workflow automation
node scripts/dev-workflow.js
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "Notion database not configured"**
**Cause**: Database ID not set or invalid in extension settings.

**Solution**:
1. Go to extension Options (right-click icon → Options)
2. Copy database ID from Notion URL: `https://notion.so/{workspace}/{database_id}`
3. Paste in "Notion Database ID" field
4. Click "Save Settings"

---

#### **2. "Failed to execute 'fetch' on 'ServiceWorkerGlobalScope'"**
**Cause**: Chrome MV3 service worker context issues with `fetch`.

**Solution**: Extension includes automatic fallback:
- Primary: `fetch.call(null, url, options)` for proper context binding
- Fallback: XMLHttpRequest for maximum compatibility
- If issue persists, check browser console for detailed error logs

---

#### **3. OAuth Authentication Failed**
**Cause**: Misconfigured OAuth redirect URI or expired tokens.

**Solution**:
1. Verify Notion integration redirect URI matches server config:
   - Server `.env`: `NOTION_REDIRECT_URI=http://localhost:3000/oauth/callback`
   - Notion integration settings: Add `http://localhost:3000/oauth/callback` as authorized redirect URI
2. Clear browser cache and extension storage:
   ```javascript
   // In extension console
   chrome.storage.local.clear()
   chrome.storage.sync.clear()
   ```
3. Re-authenticate via extension Options page

---

#### **4. Sync Cooldown / Rate Limit**
**Cause**: Hit daily limit (Free: 50/day) or minimum interval (Free: 12h, Pro: 30min).

**Solution**:
- **Check Status**: Open extension Options → Overview section shows remaining quota
- **Wait for Cooldown**: Extension displays "Retry after X minutes" message
- **Upgrade to Pro**: Unlimited syncs and 30-minute intervals

---

#### **5. Content Extraction Returns Empty Results**
**Cause**: Target page blocks content extraction or tab is not accessible.

**Solution**:
- Ensure page is fully loaded before syncing
- Some sites (e.g., Chrome Web Store, internal pages) block script injection
- Extension uses fallback: extracts title/URL from tab metadata
- Check browser console for detailed extraction logs (`📄 Content extraction...`)

---

#### **6. TypeScript Errors in VSCode**
**Cause**: Monorepo project references not resolved or stale cache.

**Solution**:
```bash
# Rebuild TypeScript references
pnpm -r exec tsc -b --clean
pnpm -r exec tsc -b

# Restart VSCode TypeScript server
# Command Palette (Cmd+Shift+P) → "TypeScript: Restart TS Server"
```

---

#### **7. Build Fails with "Module not found"**
**Cause**: Dependency not installed or workspace link broken.

**Solution**:
```bash
# Clean install all dependencies
rm -rf node_modules packages/*/node_modules
pnpm install -r

# Verify workspace links
pnpm list --depth 0
```

---

## 📚 Documentation

### **User Guides**
- [Getting Started Guide](docs/getting-started.md) — Installation and setup walkthrough
- [Database Setup Guide](docs/database-setup.md) — Notion database configuration
- [Sync Settings Guide](docs/sync-settings.md) — Auto-sync and interval configuration

### **Developer Guides**
- [Contributing Guide](CONTRIBUTING.md) — How to contribute to the project
- [Architecture Overview](docs/architecture.md) — System design and data flow
- [API Reference](docs/api-reference.md) — Server API endpoints and schemas
- [Extension API](docs/extension-api.md) — Chrome extension message passing and storage

### **Troubleshooting**
- [OAuth Setup Fix](docs/oauth-setup-fix.md) — Resolving OAuth configuration issues
- [Testing Guide](docs/testing-guide.md) — Running and writing tests
- [Deployment Guide](docs/deployment.md) — Production deployment instructions

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### **1. Fork & Clone**
```bash
git clone https://github.com/YOUR_USERNAME/bookmarks_to_notion.git
cd bookmark-notion-sync
```

### **2. Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### **3. Make Changes**
- Follow existing code style (ESLint + Prettier enforced)
- Add tests for new features
- Update documentation if needed

### **4. Commit with Conventional Commits**
```bash
git add .
git commit -m "feat: add AI tagging feature"
# or
git commit -m "fix: resolve OAuth redirect issue"
```

**Commit Types**:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, no logic change)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Build process or auxiliary tool changes

### **5. Push & Create PR**
```bash
git push origin feature/your-feature-name
```
- Open Pull Request on GitHub
- Describe changes and link related issues
- Wait for review and CI checks to pass

### **Code Quality Standards**
- All PRs must pass ESLint and TypeScript checks
- Add tests for new features (target: >80% coverage)
- Follow existing project structure and naming conventions
- Update README or docs if changing user-facing features

---
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Features Roadmap

### Core Features ✅

- [x] Bulk bookmark sync
- [x] OAuth authentication
- [x] Content extraction
- [x] Error handling

### Advanced Features 🔮

- [ ] AI-powered tagging (OpenAI integration)
- [ ] AI-generated summaries
- [ ] Custom tag templates
- [ ] Folder-based syncing
- [ ] Bulk edit operations
- [ ] Export/import bookmarks
- [ ] Multiple Notion databases
- [ ] Browser bookmark folders mapping

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Notion** for their excellent API and OAuth support
- **Chrome Extensions Team** for Manifest V3 documentation
- **React** and **Next.js** communities for amazing tooling
- All contributors and beta testers

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/Aries-0331/bookmarks_to_notion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Aries-0331/bookmarks_to_notion/discussions)
- **Email**: support@bookmarkassistant.com *(coming soon)*
- **Twitter**: [@BookmarkAssist](https://twitter.com/BookmarkAssist) *(coming soon)*

---

## 🗺️ Development Roadmap

### **Q1 2025**
- [x] Core sync functionality
- [x] OAuth integration
- [x] Content extraction
- [x] Freemium model with Pro tier
- [ ] Chrome Web Store listing
- [ ] Public beta launch

### **Q2 2025**
- [ ] AI-powered tagging (OpenAI integration)
- [ ] Smart summaries
- [ ] Folder-to-database mapping
- [ ] Analytics dashboard

### **Q3 2025**
- [ ] Multi-database support
- [ ] Bulk operations UI
- [ ] Export/import bookmarks
- [ ] Mobile companion app (iOS/Android)

### **Q4 2025**
- [ ] Firefox extension port
- [ ] Safari extension port
- [ ] Team collaboration features
- [ ] Enterprise tier

---

## 📊 Project Status

| Metric | Status |
|--------|--------|
| **Development** | Active 🟢 |
| **Version** | 0.1.0 (Beta) |
| **License** | MIT |
| **Chrome Web Store** | Pending Review |
| **Active Users** | Private Beta |
| **Last Updated** | 2025-11-08 |

---

## 🌟 Star History

If you find this project helpful, please consider giving it a ⭐ on GitHub!

[![Star History Chart](https://api.star-history.com/svg?repos=Aries-0331/bookmarks_to_notion&type=Date)](https://star-history.com/#Aries-0331/bookmarks_to_notion&Date)

---

**Built with ❤️ by [Aries](https://github.com/Aries-0331)**

*Transform your bookmarks into organized knowledge with Bookmark Assistant.*
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
````
