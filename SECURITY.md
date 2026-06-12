# Security Policy

## Supported Versions

Security fixes target the latest version on `main`. Older releases may receive fixes when the impact and upgrade risk justify it.

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities.

Report security issues by email:

`aries0331.dev@gmail.com`

Include:

- Affected component: extension, server, website, or shared package.
- Reproduction steps.
- Impact assessment.
- Any relevant logs or screenshots with secrets removed.

## Secret Handling

Never commit:

- `.env` or `.env.local` files.
- Notion OAuth secrets.
- Paddle API keys or webhook secrets.
- JWT secrets.
- Database URLs.
- Production logs or database dumps.

If a secret is committed, rotate it immediately and treat the git history as compromised.
