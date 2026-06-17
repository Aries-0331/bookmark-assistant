<p align="center">
  <img src="packages/extension/src/assets/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
</p>

<h1 align="center">Bookmark Assistant</h1>

<p align="center">
  Sync Chrome bookmarks and Reading List items to Notion.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

Bookmark Assistant is a browser extension that syncs Chrome bookmarks and Reading List items into a Notion database. The project includes a Chrome MV3 extension and a small server used for Notion connection, session handling, and Notion API writes.

The free self-hosted version is intended to be useful on its own: you can build the extension from source, run the server yourself, connect your own Notion integration, and sync link data to infrastructure you control.

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

Bookmark Assistant is focused on bookmarks, Reading List items, saved pages, and link metadata. It is not a full web clipper, a note-taking app, or a replacement for Notion, Obsidian, or LiteContext.

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

## Contributing

Contributions are welcome if they fit the public repository scope.

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
