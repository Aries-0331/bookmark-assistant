# Self-Hosting

Bookmark Assistant can be self-hosted for personal or internal use. Self-hosted deployments run the open source extension and server with your own Notion integration, database, and hosting.

## What Self-Hosting Includes

- Chrome extension build from source.
- Server-side Notion OAuth and bookmark sync API.
- PostgreSQL database through Prisma.
- Local managed-feature defaults when `SELF_HOSTED=true`.

## What Self-Hosting Does Not Include

- The official hosted Bookmark Assistant service.
- Official commercial billing or managed subscription services.
- Official monitoring, uptime, or support guarantees.
- Rights to use the official product branding for a fork or competing hosted service.

## Requirements

- Node.js 20+ for the server.
- pnpm 9+.
- PostgreSQL.
- A Notion OAuth integration.
- A Chrome extension ID from an unpacked extension or Chrome Web Store listing.

## Server Setup

```bash
cp packages/server/.env.example packages/server/.env.local
pnpm -F @bookmark-assistant/server prisma:generate
pnpm -F @bookmark-assistant/server prisma:migrate
pnpm dev:server
```

Set these required values in `packages/server/.env.local`:

```bash
SELF_HOSTED=true
EDITION=self-hosted
DATABASE_URL=<postgresql-connection-url>
JWT_SECRET=replace-with-a-random-secret
ALLOWED_EXTENSION_ID=your-extension-id
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
NOTION_API_VERSION=2025-09-03
WEBSITE_URL=http://localhost:3006
```

## Extension Setup

```bash
cp packages/extension/.env.example packages/extension/.env.local
pnpm -F @bookmark-assistant/extension build
```

Set these values in `packages/extension/.env.local`:

```bash
VITE_OAUTH_SERVER_URL=http://localhost:3333
VITE_NOTION_CLIENT_ID=your-notion-client-id
VITE_WEBSITE_URL=http://localhost:3006
VITE_DEBUG_MODE=true
VITE_APP_NAME=Bookmark Assistant
VITE_APP_VERSION=1.0.18
```

Load the built extension from:

```text
packages/extension/dist
```

## Notion OAuth Redirects

For unpacked local extension testing, Chrome generates a redirect URI like:

```text
https://<extension-id>.chromiumapp.org/callback
```

Add the redirect URI shown by the extension logs to your Notion OAuth integration.

## Local Feature Defaults

When `SELF_HOSTED=true`, the server enables local managed-feature defaults for authenticated users. This does not grant access to the official hosted service, official cloud infrastructure, or paid support.

When `SELF_HOSTED=false`, managed commercial features are expected to be handled by the private official service.

## Production Notes

- Use HTTPS for server and website deployments.
- Store secrets in your hosting provider, not in git.
- Rotate secrets if they are accidentally committed.
- Run your own backups for PostgreSQL.
- Monitor server logs and Notion API failures.
