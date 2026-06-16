<p align="center">
  <img src="packages/extension/src/assets/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
</p>

<h1 align="center">Bookmark Assistant</h1>

<p align="center">
  A browser extension for collecting, organizing, and syncing bookmarks to Notion.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0-or-later" src="https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

Bookmark Assistant syncs Chrome bookmarks and Reading List items into a Notion database. It is built as a Chrome MV3 extension with a small server for Notion OAuth, session handling, and Notion API writes.

The open-source version is intended to be useful on its own: you can self-host the server, build the extension from source, connect your own Notion integration, and sync bookmark data to infrastructure you control.

The hosted/Pro version is planned for users who want less setup and more managed automation, such as hosted Notion OAuth, AI auto-tagging, AI summaries, smarter sync, and managed service operations.

## Why This Exists

Browser bookmarks are useful but easy to lose in folders. Notion is better for review, search, annotation, and long-term organization. Bookmark Assistant connects the two without forcing you into a proprietary bookmark manager.

This repo is for:

- Users who want a self-hostable bookmark-to-Notion workflow.
- Developers who want to inspect or extend the extension and server.
- Teams evaluating whether a managed hosted version is worth using later.

## Features

Implemented in this repository:

- Sync Chrome bookmarks to Notion.
- Sync Chrome Reading List items to Notion.
- Save the current page from the extension popup.
- Save links from the browser context menu.
- Extract page titles and descriptions when available.
- Avoid re-creating existing Notion pages by matching sync IDs and URLs.
- Store sync state in Chrome storage and update popup/options UI from that state.
- Self-host the server with PostgreSQL and Prisma.

Not included in the open-source repo:

- Payment logic.
- Hosted service secrets.
- Hosted commercial OAuth infrastructure.
- AI backend for production-grade auto-tagging or summaries.

## Open Source vs Pro / Hosted

The open-source edition is for self-hosting and transparency. The Pro/hosted edition is for convenience and managed features.

| Capability               | Open source | Pro / hosted |
| ------------------------ | ----------- | ------------ |
| Read Chrome bookmarks    | Yes         | Yes          |
| Read Chrome Reading List | Yes         | Yes          |
| Manual sync to Notion    | Yes         | Yes          |
| Save current page        | Yes         | Yes          |
| Context menu save        | Yes         | Yes          |
| Hosted Notion OAuth      | No          | Yes.         |
| AI auto-tagging          | No          | Planned      |
| AI summaries             | No          | Planned      |
| Smarter managed sync     | No          | Planned      |
| Support                  | Community   | Priority     |

## How It Works

1. The extension reads bookmarks and Reading List items from Chrome.
2. The extension formats items with stable sync IDs, URL metadata, type, and read-state information.
3. The extension sends sync requests to the server.
4. The server validates the session, checks the configured Notion data source, and builds Notion properties.
5. The server creates missing Notion pages and skips existing pages by sync ID or URL.
6. The extension stores sync state locally so the popup and options page can reflect the latest status.

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

TODO: Confirm whether the recommended local extension path should be `packages/extension/dist` or a dev-specific output directory for contributors.

## Local Development

Common commands from `package.json`:

```bash
pnpm dev                 # Run the extension dev preview
pnpm dev:server          # Run the server
pnpm build               # Build the extension
pnpm build:server        # Build the server
pnpm build:all           # Build all packages
pnpm test                # Run unit tests
pnpm test:integration    # Run integration tests
pnpm lint                # Lint all packages
pnpm check:i18n          # Check extension i18n key usage
```

Package-specific commands also exist:

```bash
pnpm -F @bookmark-assistant/extension build
pnpm -F @bookmark-assistant/server prisma:generate
pnpm -F @bookmark-assistant/server prisma:migrate
```

Runtime requirements from the package metadata:

- Node.js 18+ for the workspace and extension package.
- Node.js 20.x for the server package.
- pnpm 9.x.
- PostgreSQL for the server.

## Notion Setup

Self-hosted deployments need a Notion OAuth integration and a Notion database or data source that the integration can write to.

At a high level:

1. Create a Notion integration.
2. Configure the OAuth redirect URI for your Chrome extension.
3. Share the target Notion database with the integration.
4. Configure the server with the Notion client ID and client secret.
5. Configure the extension with the server URL and Notion client ID.

TODO: Confirm and document the recommended Notion database template, required properties, and template link.

## Configuration

Extension environment template:

```bash
cp packages/extension/.env.example packages/extension/.env.local
```

Important extension variables:

```text
VITE_OAUTH_SERVER_URL
VITE_NOTION_CLIENT_ID
VITE_SUPPORT_URL
VITE_DEBUG_MODE
VITE_APP_NAME
VITE_APP_VERSION
```

Server environment template:

```bash
cp packages/server/.env.example packages/server/.env.local
```

Important server variables:

```text
PORT
NODE_ENV
SELF_HOSTED
EDITION
ALLOWED_ORIGINS
JWT_SECRET
ALLOWED_EXTENSION_ID
NOTION_CLIENT_ID
NOTION_CLIENT_SECRET
NOTION_API_VERSION
DATABASE_URL
```

Do not commit `.env` or `.env.local` files.

## Roadmap

Open-source direction:

- Clearer self-hosting setup.
- Better Notion template documentation.
- More reliable local development docs.
- Screenshots and demo media.
- More focused tests around extension-to-server flows.

Hosted/Pro direction:

- Hosted Notion OAuth.
- AI auto-tagging.
- AI summaries.
- Smarter sync behavior.
- Managed service operations and support.

## Limitations

- The open-source version requires self-hosting a server and PostgreSQL database.
- You must configure your own Notion OAuth integration for self-hosting.
- AI auto-tagging and AI summaries are not production features in this open-source repo.
- Browser extension behavior depends on Chrome extension APIs and MV3 service worker lifecycle constraints.
- Notion schema differences can require property mapping adjustments.

## Contributing

Contributions are welcome if they fit the open-source scope of the project.

Start with [CONTRIBUTING.md](CONTRIBUTING.md).

Before opening a pull request, run the relevant checks:

```bash
pnpm lint
pnpm test
pnpm build
```

## Privacy and Data Handling

Self-hosted deployments are controlled by the operator. Do not commit `.env` files, Notion credentials, JWT secrets, or exported user data. Bookmark and page data is sent only to the server URL configured for the extension.

## License

Bookmark Assistant is licensed under [AGPL-3.0-or-later](LICENSE).
