<p align="center">
  <img src="packages/extension/src/assets/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
</p>

<h1 align="center">Bookmark Assistant</h1>

<p align="center">
  Save and sync browser links to Notion.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

> Legacy notice: this public repository is kept for historical reference, AGPL-licensed self-hosted code, and old public core package provenance. Current Bookmark Assistant product development, product release tags, GitHub Releases, Chrome Web Store artifacts, and hosted-service operations are maintained from the private Bookmark Assistant Pro repository.

Bookmark Assistant is a browser extension for turning browser-saved links into an organized Notion database. It syncs Chrome bookmarks and Reading List items, and it can save the current page or links from the browser context menu.

This legacy public codebase can still be self-hosted: you can build the extension from source, run the server yourself, connect your own Notion integration, and sync saved link data to infrastructure you control.

Bookmark Assistant Pro is the managed version for users who want hosted Notion OAuth and managed automation. This public repository does not include payment logic, hosted service secrets, commercial OAuth infrastructure, or production AI backend internals.

## Current Features

- Sync Chrome bookmarks to Notion.
- Sync Chrome Reading List items to Notion.
- Save the current page from the extension popup.
- Save links from the browser context menu.
- Extract page titles and descriptions when available.
- Avoid re-creating existing Notion pages by matching sync IDs and URLs.
- Store sync state in Chrome storage and update popup/options UI from that state.
- Self-host the server with PostgreSQL and Prisma.

## Scope

Bookmark Assistant is focused on bookmarks, Reading List items, saved pages, and link metadata. It is a link collector for Notion, not a full web clipper, a note-taking app, or a replacement for Notion, Obsidian, or LiteContext.

## Core Packages

This public repository contains historical Free/Core packages: `@bookmark-assistant/contracts`, `@bookmark-assistant/extension-core`, and `@bookmark-assistant/server-core`. They are retained for provenance and compatibility with older Pro pins, but public core publishing is no longer the default product release path.

Public core packages may include shared contracts, link formatting, local capture helpers, sync diffing, validation, and LiteContext-compatible data shapes. Pro-only internals such as payment logic, managed OAuth internals, entitlement implementation, production AI backend details, private deployment configuration, and secrets do not belong in this repository.

## Installation

This repository uses pnpm workspaces.

```bash
pnpm install
```

Build the extension:

```bash
pnpm build
```

The built extension is generated under:

```text
packages/extension/dist
```

Load it in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select `packages/extension/dist`.

## Local Development

Common commands from `package.json`:

```bash
pnpm dev                 # Run the extension dev preview
pnpm dev:server          # Run the server
pnpm build               # Build the extension
pnpm build:zip           # Build a distributable extension zip
pnpm build:server        # Build the server
pnpm build:all           # Build all packages
pnpm test                # Run unit tests
pnpm test:integration    # Run integration tests
pnpm lint                # Lint all packages
pnpm check:i18n          # Check extension i18n key usage
```

Runtime requirements from the package metadata:

- Node.js 18+ for the workspace and extension package.
- Node.js 20.x for the server package.
- pnpm 9.x.
- PostgreSQL for the server.

## Configuration

Extension environment template:

```bash
cp packages/extension/.env.example packages/extension/.env.local
```

Server environment template:

```bash
cp packages/server/.env.example packages/server/.env.local
```

Do not commit `.env` or `.env.local` files.

Minimal self-hosting setup:

1. Create a Notion integration and copy its client ID and client secret.
2. Create a PostgreSQL database for the server.
3. Set `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_EXTENSION_ID`, `NOTION_CLIENT_ID`, and `NOTION_CLIENT_SECRET` in `packages/server/.env.local`.
4. Set `VITE_OAUTH_SERVER_URL` and `VITE_NOTION_CLIENT_ID` in `packages/extension/.env.local`.
5. Run `pnpm dev:server`, then build or run the extension and load `packages/extension/dist` in Chrome.

The self-hosted server is the sync destination for the extension. It stores the Notion access token needed to sync bookmarks, Reading List items, and saved pages to your Notion workspace.

## Contributing

Maintenance contributions are welcome if they fit the legacy public repository scope.

Start with [CONTRIBUTING.md](CONTRIBUTING.md).

Before opening a pull request, run the relevant checks:

```bash
pnpm lint
pnpm test
pnpm build
```

## Privacy and Data Handling

Self-hosted deployments are controlled by the operator. Do not commit `.env` files, Notion credentials, JWT secrets, or exported user data. Bookmark, Reading List, and saved page data is sent only to the server URL configured for the extension.

## License

Bookmark Assistant is licensed under [AGPL-3.0-or-later](LICENSE).
