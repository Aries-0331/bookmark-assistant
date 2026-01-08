# Documentation Index

> **Technical documentation for Bookmark Assistant**

---

## 📚 Quick Links (Root Level)

### Essential Documents

- [`../README.md`](../README.md) - Project overview and setup
- [`../CLAUDE.md`](../CLAUDE.md) - Architecture and technical specification
- [`../todo.md`](../todo.md) - Current tasks and roadmap
- [`../PRODUCTION_READINESS_ANALYSIS.md`](../PRODUCTION_READINESS_ANALYSIS.md) - Launch readiness assessment

### User & Operations Documentation

- [`../FAQ_SUPPORT.md`](../FAQ_SUPPORT.md) - Comprehensive FAQ and support guide
- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) - Deployment guide (Vercel)
- [`../CHROME_WEB_STORE_SUBMISSION.md`](../CHROME_WEB_STORE_SUBMISSION.md) - Chrome Web Store submission guide
- [`../PERMISSIONS_JUSTIFICATION.md`](../PERMISSIONS_JUSTIFICATION.md) - Extension permissions explanation

---

## 📖 Technical Documentation

### Core Architecture

- [**STATE_MANAGEMENT.md**](STATE_MANAGEMENT.md) - Event-driven state architecture
- [**NOTION_INTEGRATION.md**](NOTION_INTEGRATION.md) - Notion API integration details
- [**AUTO_SYNC.md**](AUTO_SYNC.md) - Automatic background synchronization
- [**PADDLE_INTEGRATION.md**](PADDLE_INTEGRATION.md) - Payment processing integration

### Features

- [**DESCRIPTION_CACHE.md**](DESCRIPTION_CACHE.md) - Caching strategy and implementation
- [**INTERNATIONALIZATION.md**](INTERNATIONALIZATION.md) - Multi-language support plan

---

## 🗂️ Document Categories

### By Type

| Category         | Documents                                               | Purpose                    |
| ---------------- | ------------------------------------------------------- | -------------------------- |
| **Architecture** | CLAUDE.md, STATE_MANAGEMENT.md                          | System design and patterns |
| **Features**     | AUTO_SYNC.md, DESCRIPTION_CACHE.md                      | Feature specifications     |
| **Integration**  | NOTION_INTEGRATION.md, PADDLE_INTEGRATION.md           | API integrations          |
| **Operations**   | DEPLOYMENT.md, CHROME_WEB_STORE_SUBMISSION.md          | Deployment and launch     |
| **User-Facing**  | FAQ_SUPPORT.md, PERMISSIONS_JUSTIFICATION.md            | User support and policies |

### By Priority

| Priority            | Documents                                              | When to Read       |
| ------------------- | ------------------------------------------------------ | ------------------ |
| **P0 - Essential**  | README.md, CLAUDE.md, PRODUCTION_READINESS_ANALYSIS.md | Start here         |
| **P1 - Important**  | STATE_MANAGEMENT.md, AUTO_SYNC.md, NOTION_INTEGRATION.md | Before development |
| **P2 - Reference**  | DESCRIPTION_CACHE.md, PADDLE_INTEGRATION.md            | As needed          |
| **P3 - Background** | INTERNATIONALIZATION.md                               | Future features    |

---

## 🗂️ Package-Specific Documentation

### Extension Package

- [`../packages/extension/ENV_USAGE.md`](../packages/extension/ENV_USAGE.md) - Environment variable guide
- [`../packages/extension/DESCRIPTION_GENERATOR_REVIEW.md`](../packages/extension/DESCRIPTION_GENERATOR_REVIEW.md) - Description generation design

### Server Package

- [`../packages/server/DESCRIPTION_GENERATION_DESIGN.md`](../packages/server/DESCRIPTION_GENERATION_DESIGN.md) - Server-side description generation
- [`../packages/server/DESCRIPTION_GENERATION_IMPLEMENTATION.md`](../packages/server/DESCRIPTION_GENERATION_IMPLEMENTATION.md) - Implementation details

---

## 📦 Archive

Historical and superseded documentation is stored in [`archive/`](archive/):

- DESCRIPTION_CACHE_IMPLEMENTATION_PLAN.md - Original cache plan
- DESCRIPTION_OPTIMIZATION.md - Initial optimization analysis
- TEST_COVERAGE_IMPLEVEMENT_PLAN.md - Original test plan
- TEST_COVERAGE_PROGRESS_REPORT.md - Progress tracking
- DOCUMENTATION_REORGANIZATION.md - Documentation structure changes

---

## 🎯 Documentation by Use Case

### New Developer Onboarding

1. Read [`../README.md`](../README.md) - Project setup
2. Read [`../CLAUDE.md`](../CLAUDE.md) - Architecture overview
3. Review [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - State patterns
4. Check [NOTION_INTEGRATION.md](NOTION_INTEGRATION.md) - API integration

### Feature Development

1. Check [`../todo.md`](../todo.md) - Current priorities
2. Review feature-specific docs (AUTO_SYNC.md, DESCRIPTION_CACHE.md)
3. Reference [NOTION_INTEGRATION.md](NOTION_INTEGRATION.md) - API patterns

### Production Operations

1. Review [`../DEPLOYMENT.md`](../DEPLOYMENT.md) - Deploy procedures
2. Check [`../CHROME_WEB_STORE_SUBMISSION.md`](../CHROME_WEB_STORE_SUBMISSION.md) - Store submission
3. Reference [`../PERMISSIONS_JUSTIFICATION.md`](../PERMISSIONS_JUSTIFICATION.md) - Permissions

### User Support

1. Direct users to [`../FAQ_SUPPORT.md`](../FAQ_SUPPORT.md) - Comprehensive FAQ

---

## 🔄 Document Maintenance

### Active Documents (Updated Regularly)

- [`../todo.md`](../todo.md) - Weekly updates
- [`../PRODUCTION_READINESS_ANALYSIS.md`](../PRODUCTION_READINESS_ANALYSIS.md) - Pre-launch updates

### Reference Documents (Stable)

- [`../CLAUDE.md`](../CLAUDE.md) - Architecture reference
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Pattern reference
- [NOTION_INTEGRATION.md](NOTION_INTEGRATION.md) - API reference

### Archive Policy

Documents are archived when:

- Superseded by newer versions
- Feature implementation complete
- Historical reference only

---

## 📝 Documentation Standards

### File Naming

- Feature docs: `FEATURE_NAME.md` (e.g., AUTO_SYNC.md)
- Technical docs: `TOPIC_INTEGRATION.md` (e.g., NOTION_INTEGRATION.md)

### Document Structure

1. **Title & Status** - Clear title with current status
2. **Executive Summary** - TL;DR for busy readers
3. **Detailed Sections** - Technical details
4. **Examples** - Code samples where applicable
5. **References** - Links to related docs

### When to Create New Documentation

- **New Feature:** Create integration guide
- **API Integration:** Create INTEGRATION.md
- **Process Change:** Update relevant docs

---

## 🚀 Quick Start Guides

### For Developers

```bash
# 1. Read essentials
../README.md          # Setup
../CLAUDE.md          # Architecture

# 2. Setup environment
# Follow README.md instructions

# 3. Start developing
# Check ../todo.md for current priorities
```

### For Operations

```bash
# 1. Deployment
../DEPLOYMENT.md

# 2. Chrome Store
../CHROME_WEB_STORE_SUBMISSION.md

# 3. User Support
../FAQ_SUPPORT.md
```

---

## 📞 Support

**Questions about documentation?**

- Check this index first
- Review relevant feature doc
- Reference code comments for implementation details

**Documentation improvements?**

- Submit PR with updates
- Follow documentation standards
- Update this index if adding new docs

---

**Last Updated:** December 26, 2025
**Maintainer:** Development Team
**Status:** Current and maintained
