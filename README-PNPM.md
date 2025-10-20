# Monorepo with pnpm

This repo uses pnpm workspaces for dependency management and scripts.

Quick start:

- Install pnpm (recommended via Corepack):
  - corepack enable
  - corepack prepare pnpm@9.12.0 --activate

- Install deps at the repo root:
  - pnpm install

- Run UI-only dev for the extension (Vite HMR with Chrome API mocks):
  - pnpm dev

- Build the extension bundle:
  - pnpm -F @bookmark-sync/extension build

- Build everything:
  - pnpm -r build

Notes:
- Do not use npm/yarn in this repo to avoid conflicting lockfiles.
- The popup dev preview at src/dev/index.html mocks minimal chrome.* APIs.
- For real extension testing, build to dist and load it in Chrome, or add web-ext if desired.
