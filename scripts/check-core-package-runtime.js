#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const packages = [
  {
    name: '@bookmark-assistant/contracts',
    dir: 'packages/contracts',
    tarballPrefix: 'bookmark-assistant-contracts',
  },
  {
    name: '@bookmark-assistant/extension-core',
    dir: 'packages/extension-core',
    tarballPrefix: 'bookmark-assistant-extension-core',
  },
  {
    name: '@bookmark-assistant/server-core',
    dir: 'packages/server-core',
    tarballPrefix: 'bookmark-assistant-server-core',
  },
];

function fail(message) {
  console.error(`\nError: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    shell: false,
    stdio: options.stdio || 'pipe',
  });

  if (result.error) {
    fail(`${command} ${args.join(' ')} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    fail(`${command} ${args.join(' ')} exited with status ${result.status}\n${output}`);
  }

  return result.stdout ? result.stdout.trim() : '';
}

function readPackageJson(packageDir) {
  return JSON.parse(
    fs.readFileSync(path.join(repoRoot, packageDir, 'package.json'), 'utf8')
  );
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookmark-assistant-core-runtime-'));
  const projectDir = path.join(tempDir, 'project');
  const npmCacheDir = path.join(tempDir, 'npm-cache');
  const env = { ...process.env, NPM_CONFIG_CACHE: npmCacheDir };

  try {
    fs.mkdirSync(projectDir);
    fs.mkdirSync(npmCacheDir);
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ private: true, type: 'module' }, null, 2)
    );

    const tarballs = packages.map((item) => {
      run('pnpm', ['--dir', item.dir, 'pack', '--pack-destination', tempDir], {
        stdio: 'inherit',
      });

      const packageJson = readPackageJson(item.dir);
      return path.join(tempDir, `${item.tarballPrefix}-${packageJson.version}.tgz`);
    });

    run('npm', ['install', ...tarballs, '--ignore-scripts', '--force'], {
      cwd: projectDir,
      env,
      stdio: 'inherit',
    });

    for (const item of packages) {
      const expectedVersion = readPackageJson(item.dir).version;
      const installedPackageJson = JSON.parse(
        fs.readFileSync(
          path.join(projectDir, 'node_modules', item.name, 'package.json'),
          'utf8'
        )
      );

      if (installedPackageJson.version !== expectedVersion) {
        fail(
          `${item.name} installed version ${installedPackageJson.version}, expected ${expectedVersion}`
        );
      }
    }

    const contractsResult = run(
      'node',
      [
        '--input-type=module',
        '-e',
        "import('@bookmark-assistant/contracts').then((m) => console.log(Object.keys(m).length))",
      ],
      { cwd: projectDir }
    );

    const extensionCoreResult = run(
      'node',
      [
        '--input-type=module',
        '-e',
        "import('@bookmark-assistant/extension-core').then(async (m) => { const item = m.toSyncFingerprintItems([{ title: 'Current', url: 'https://example.com', source: 'current_page', syncId: 'sync-1' }], 'Fallback')[0]; const fallback = m.createFallbackPageContent('https://www.example.com/docs/'); const reading = m.formatReadingListItemForSync({ title: { content: 'Read' }, url: { url: 'https://example.com/read' }, readState: { state: 'READ' }, dateAdded: Date.UTC(2026, 0, 1) }, { createSyncId: () => 'reading-1' }); const fingerprint = await m.createSyncFingerprint([], { crypto: null }); console.log([typeof m.formatBookmarkForSync, typeof m.formatCurrentPageForSync, typeof m.normalizeUrl, typeof m.extractPageContentFromDocument, typeof m.formatReadingListItemForSync, typeof m.createSyncFingerprint, m.isValidHttpUrl('https://example.com'), fallback.title, reading.type, reading.readState, reading.syncId, item.source, item.syncId, fingerprint, m.normalizeUrl('https://example.com/page/?b=2&a=1#top')].join(',')); })",
      ],
      { cwd: projectDir }
    );

    const serverCoreResult = run(
      'node',
      [
        '-e',
        "const core = require('@bookmark-assistant/server-core'); const desc = core.extractDescriptionFromHtml('<html><head><meta name=\"description\" content=\"Runtime package description\" /></head></html>'); console.log([typeof core.diffBookmarks, typeof core.validateLinkItemInput, typeof core.normalizeUrlForSync, core.normalizeUrlForSync('https://example.com/page/?b=2&a=1#top'), core.isValidUrl('file:///tmp/page.html'), core.isFetchableHttpUrl('file:///tmp/page.html'), typeof core.extractDescriptionFromHtml, desc.text, desc.source, core.sanitizeDescription('<p>Text &amp; content</p>')].join(','))",
      ],
      { cwd: projectDir }
    );

    if (contractsResult !== '0') {
      fail(`Expected contracts runtime exports count to be 0, got ${contractsResult}`);
    }

    if (
      extensionCoreResult !==
      'function,function,function,function,function,function,true,example.com/docs/,reading_list,READ,reading-1,current_page,sync-1,811c9dc5,https://example.com/page?a=1&b=2'
    ) {
      fail(
        `Expected extension-core runtime helpers, content helpers, reading list helpers, sync fingerprint hash helper, fingerprint metadata, and URL normalization to be available, got ${extensionCoreResult}`
      );
    }

    if (
      serverCoreResult !==
      'function,function,function,https://example.com/page?a=1&b=2,true,false,function,Runtime package description,meta_description,Text content'
    ) {
      fail(
        `Expected server-core diff, validation, URL, and description helpers to be available, got ${serverCoreResult}`
      );
    }

    console.log('Core package runtime check passed.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
