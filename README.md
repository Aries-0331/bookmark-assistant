# Bookmark Assistant

> **AI-powered Chrome extension for intelligent bookmark management and seamless Notion synchronization**

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
| **OAuth Integration** | Secure Notion workspace connection |
| **Manual Sync** | One-click bulk export to Notion |
| **Daily Sync** | Unlimited |
| **Sync Interval** | Minimum 12 hours between auto-syncs |
| **Database Mapping** | Single Notion database per connection |

### **Pro Tier**
| Feature | Specification |
|---------|--------------|
| **Auto-Sync** | Background synchronization every 30+ minutes |
| **AI Features** | Access to AI tagging and summarization (roadmap) |
| **Custom Mapping** | Multiple database support (planned) |
| **Priority Support** | Faster response times |

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
