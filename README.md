<p align="center">
  <img src="packages/website/public/brand/logo_128x128.png" alt="Bookmark Assistant logo" width="96" height="96" />
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
  <a href="SELF_HOSTING.md"><img alt="Self-hostable" src="https://img.shields.io/badge/self--hostable-yes-111827.svg" /></a>
  <a href="https://chromewebstore.google.com/detail/khffaaemphidjmhokafmiilkcjpgiije?utm_source=item-share-cb"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome%20Web%20Store-available-16a34a.svg" /></a>
</p>

---

Bookmark Assistant is an open source Chrome extension that keeps your browser bookmarks organized in Notion. It can sync Chrome bookmarks, Reading List items, and the current page into a Notion database with useful page metadata.

The project is self-hostable. You can run the extension and server with your own Notion integration, database, and infrastructure. The official hosted service and Chrome Web Store listing are separate managed offerings.

## Features

- Sync Chrome bookmarks to Notion.
- Sync Chrome Reading List items.
- Save the current page from the popup.
- Save links from the browser context menu.
- Extract page titles and descriptions when available.
- Self-host the server and extension from source.

## Project Structure

```text
packages/
  extension/   Chrome MV3 extension
  server/      OAuth and sync API
  website/     Public website
  shared/      Shared brand and UI assets
```

## Getting Started

For self-hosting instructions, see [SELF_HOSTING.md](SELF_HOSTING.md).

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Open Source Model

Bookmark Assistant is licensed under [AGPL-3.0-or-later](LICENSE).

The Bookmark Assistant name, logo, Chrome Web Store listing, domains, and hosted service branding are reserved. See [TRADEMARKS.md](TRADEMARKS.md).
