# Contributing

Thanks for your interest in Bookmark Assistant. This repository is open source under the GNU Affero General Public License v3.0 or later.

## Development Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment templates:

```bash
cp packages/server/.env.example packages/server/.env.local
cp packages/extension/.env.example packages/extension/.env.local
cp packages/website/.env.example packages/website/.env.local
```

3. Fill in local Notion OAuth, database, and extension values.

4. Run the pieces you need:

```bash
pnpm dev
pnpm dev:server
pnpm dev:website
```

## Branches

- `main` is the public stable branch.
- Use `feature/*` for feature work.
- Use `fix/*` for bug fixes.
- Use `chore/*` for maintenance and documentation.

Keep branches short-lived and submit changes through pull requests.

## Quality Bar

Before opening a pull request, run the checks that match your change:

```bash
pnpm test
pnpm lint
pnpm build
```

For extension-only changes, also run:

```bash
pnpm -F @bookmark-assistant/extension type-check
```

## Pull Requests

Pull requests should include:

- A concise description of the behavior change.
- Screenshots for UI changes.
- Test coverage or a clear note about why tests were not added.
- Any setup or migration steps.

By contributing, you agree that your contribution is licensed under AGPL-3.0-or-later.
