#!/usr/bin/env node
// Copies brand assets from extension to website public for consistent usage
// Run before dev/build in the website package
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..');
  const extAssets = path.join(repoRoot, 'packages', 'extension', 'src', 'assets');
  const extFavicons = path.join(extAssets, 'favicon');
  const websitePublic = path.join(repoRoot, 'packages', 'website', 'public');
  const websiteBrand = path.join(websitePublic, 'brand');

  try {
    // Copy logo and brand imagery under /public/brand
    await fs.mkdir(websiteBrand, { recursive: true });
    await copyDir(extAssets, websiteBrand);
    // Copy favicon pack into public root (where Next and browsers expect them)
    await copyDir(extFavicons, websitePublic);
    // Optional: avoid duplicating the favicon folder inside brand
    try { await fs.rm(path.join(websiteBrand, 'favicon'), { recursive: true, force: true }); } catch {}
    // Done
    console.log('[sync-brand-assets] Synced brand assets to website/public');
  } catch (err) {
    console.warn('[sync-brand-assets] Skipped: could not copy assets', err?.message || err);
  }
}

main();
