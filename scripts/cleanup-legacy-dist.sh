#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LEGACY_DIST="$ROOT_DIR/dist"

echo "🔎 Checking for legacy root-level dist at: $LEGACY_DIST"

if [ -d "$LEGACY_DIST" ]; then
  echo "Found legacy dist directory: $LEGACY_DIST"
  read -p "Remove it? (y/N): " -r
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$LEGACY_DIST"
    echo "Removed $LEGACY_DIST"
  else
    echo "Skipped removal. No changes made."
  fi
else
  echo "No legacy root dist found. Nothing to do."
fi

echo "✅ cleanup-legacy-dist finished"
