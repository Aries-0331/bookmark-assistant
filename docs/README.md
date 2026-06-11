# Documentation Index

> **Technical documentation for Bookmark Assistant**

---

## 📚 Quick Links (Root Level)

### Essential Documents

- [`../README.md`](../README.md) - Project overview, features, and quick start
- [`../CLAUDE.md`](../CLAUDE.md) - Architecture and technical specification
- [`archive/process-guides/BUILD_OPTIMIZATION.md`](archive/process-guides/BUILD_OPTIMIZATION.md) - Archived build process guide

### User & Operations Documentation

- [`archive/process-guides/FAQ_SUPPORT.md`](archive/process-guides/FAQ_SUPPORT.md) - Archived FAQ and support guide
- [`archive/process-guides/DEPLOYMENT.md`](archive/process-guides/DEPLOYMENT.md) - Archived deployment guide
- [`archive/process-guides/CHROME_WEB_STORE_SUBMISSION.md`](archive/process-guides/CHROME_WEB_STORE_SUBMISSION.md) - Archived Chrome Web Store submission guide
- [`archive/process-guides/PERMISSIONS_JUSTIFICATION.md`](archive/process-guides/PERMISSIONS_JUSTIFICATION.md) - Archived extension permissions explanation

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
| **Operations**   | archive/process-guides/DEPLOYMENT.md, archive/process-guides/CHROME_WEB_STORE_SUBMISSION.md | Deployment and launch     |
| **User-Facing**  | archive/process-guides/FAQ_SUPPORT.md, archive/process-guides/PERMISSIONS_JUSTIFICATION.md | User support and policies |

### By Priority

| Priority            | Documents                                              | When to Read       |
| ------------------- | ------------------------------------------------------ | ------------------ |
| **P0 - Essential**  | README.md, CLAUDE.md                                   | Start here         |
| **P1 - Important**  | STATE_MANAGEMENT.md, AUTO_SYNC.md, NOTION_INTEGRATION.md | Before development |
| **P2 - Reference**  | DESCRIPTION_CACHE.md, PADDLE_INTEGRATION.md            | As needed          |
| **P3 - Background** | INTERNATIONALIZATION.md                               | Future features    |

---

## 🗂️ Package-Specific Documentation

### Extension Package

- [`archive/setup/ENV_USAGE.md`](archive/setup/ENV_USAGE.md) - Archived environment variable guide
- [`../packages/extension/public/manifest.json`](../packages/extension/public/manifest.json) - Extension configuration

### Server Package

- [`archive/setup/ENVIRONMENT_SETUP.md`](archive/setup/ENVIRONMENT_SETUP.md) - Archived server environment configuration

### Shared Package

- [`../packages/shared/README.md`](../packages/shared/README.md) - Shared utilities and design tokens

---

## 📦 Archive

Historical and superseded documentation is stored in [`archive/`](archive/):

- DESCRIPTION_CACHE_IMPLEMENTATION_PLAN.md - Original cache plan
- DESCRIPTION_OPTIMIZATION.md - Initial optimization analysis
- TEST_COVERAGE_IMPROVEMENT_PLAN.md - Original test plan
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

1. Review feature-specific docs (AUTO_SYNC.md, DESCRIPTION_CACHE.md)
2. Reference [NOTION_INTEGRATION.md](NOTION_INTEGRATION.md) - API patterns
3. Check [BUILD_OPTIMIZATION.md](archive/process-guides/BUILD_OPTIMIZATION.md) - Archived build process

### Production Operations

1. Review [`archive/process-guides/DEPLOYMENT.md`](archive/process-guides/DEPLOYMENT.md) - Deploy procedures
2. Check [`archive/process-guides/CHROME_WEB_STORE_SUBMISSION.md`](archive/process-guides/CHROME_WEB_STORE_SUBMISSION.md) - Store submission
3. Reference [`archive/process-guides/PERMISSIONS_JUSTIFICATION.md`](archive/process-guides/PERMISSIONS_JUSTIFICATION.md) - Permissions
4. Use [`archive/process-guides/BUILD_OPTIMIZATION.md`](archive/process-guides/BUILD_OPTIMIZATION.md) - Build process

### User Support

1. Direct users to [`archive/process-guides/FAQ_SUPPORT.md`](archive/process-guides/FAQ_SUPPORT.md) - Archived FAQ

---

## 🔄 Document Maintenance

### Active Documents (Updated Regularly)

- [`archive/process-guides/BUILD_OPTIMIZATION.md`](archive/process-guides/BUILD_OPTIMIZATION.md) - Archived build process documentation
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Pattern reference

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
- Operations docs: `OPERATION_NAME.md` (e.g., DEPLOYMENT.md)

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
# Check archive/process-guides/BUILD_OPTIMIZATION.md for archived build process
```

### For Operations

```bash
# 1. Deployment
archive/process-guides/DEPLOYMENT.md

# 2. Chrome Store
archive/process-guides/CHROME_WEB_STORE_SUBMISSION.md

# 3. User Support
archive/process-guides/FAQ_SUPPORT.md

# 4. Build Process
archive/process-guides/BUILD_OPTIMIZATION.md
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

**Last Updated:** January 21, 2026
**Maintainer:** Development Team
**Status:** Current and maintained
