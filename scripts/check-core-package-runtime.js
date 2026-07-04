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

function projectNameFor(packageName) {
  return packageName.replace(/^@/, '').replace(/\//g, '-');
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookmark-assistant-core-runtime-'));
  const npmCacheDir = path.join(tempDir, 'npm-cache');
  const env = { ...process.env, NPM_CONFIG_CACHE: npmCacheDir };

  try {
    fs.mkdirSync(npmCacheDir);

    const projects = new Map();

    const tarballs = packages.map((item) => {
      run('npm', ['pack', '--pack-destination', tempDir], {
        cwd: path.join(repoRoot, item.dir),
        stdio: 'inherit',
      });

      const packageJson = readPackageJson(item.dir);
      return path.join(tempDir, `${item.tarballPrefix}-${packageJson.version}.tgz`);
    });

    for (const [index, item] of packages.entries()) {
      const projectDir = path.join(tempDir, projectNameFor(item.name));
      fs.mkdirSync(projectDir);
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({ private: true, type: 'module' }, null, 2)
      );

      run('npm', ['install', tarballs[index], '--ignore-scripts', '--force'], {
        cwd: projectDir,
        env,
        stdio: 'inherit',
      });

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

      for (const [dependencyName, dependencyVersion] of Object.entries(
        installedPackageJson.dependencies || {}
      )) {
        if (typeof dependencyVersion === 'string' && dependencyVersion.startsWith('workspace:')) {
          fail(
            `${item.name} published dependency ${dependencyName} uses non-registry specifier ${dependencyVersion}`
          );
        }
      }

      projects.set(item.name, projectDir);
    }

    const contractsResult = run(
      'node',
      [
        '--input-type=module',
        '-e',
        "import('@bookmark-assistant/contracts').then((m) => console.log(Object.keys(m).length))",
      ],
      { cwd: projects.get('@bookmark-assistant/contracts') }
    );

    const extensionCoreResult = run(
      'node',
      [
        '--input-type=module',
        '-e',
        "import('@bookmark-assistant/extension-core').then(async (m) => { const item = m.toSyncFingerprintItems([{ title: 'Current', url: 'https://example.com', source: 'current_page', syncId: 'sync-1' }], 'Fallback')[0]; const fallback = m.createFallbackPageContent('https://www.example.com/docs/'); const reading = m.formatReadingListItemForSync({ title: { content: 'Read' }, url: { url: 'https://example.com/read' }, readState: { state: 'READ' }, dateAdded: Date.UTC(2026, 0, 1) }, { createSyncId: () => 'reading-1' }); const fingerprint = await m.createSyncFingerprint([], { crypto: null }); const cleanup = m.planStorageCleanup({ last_sync_hash: 'x', last_sync_partial_info: { new_count: '2' } }); const collected = await m.collectBookmarkSyncItems([{ id: 'folder', title: 'Folder', children: [{ id: 'bookmark-1', title: 'Bookmark', url: 'https://example.com/bookmark' }] }], { getDescription: () => 'Runtime description', createSyncId: () => 'bookmark-sync-1' }); console.log([typeof m.formatBookmarkForSync, typeof m.formatCurrentPageForSync, typeof m.normalizeUrl, typeof m.extractPageContentFromDocument, typeof m.formatReadingListItemForSync, typeof m.createSyncFingerprint, typeof m.planStorageCleanup, typeof m.collectBookmarkSyncItems, m.isValidHttpUrl('https://example.com'), fallback.title, reading.type, reading.readState, reading.syncId, item.source, item.syncId, fingerprint, m.normalizeUrl('https://example.com/page/?b=2&a=1#top'), cleanup.removeKeys.join('|'), cleanup.updateValues.last_sync_partial_info.new_count, collected.items[0].description, collected.fingerprintItems[0].path].join(',')); })",
      ],
      { cwd: projects.get('@bookmark-assistant/extension-core') }
    );

    const serverCoreResult = run(
      'node',
      [
        '-e',
        "const core = require('@bookmark-assistant/server-core'); const desc = core.extractDescriptionFromHtml('<html><head><meta name=\"description\" content=\"Runtime package description\" /></head></html>'); const normalized = core.normalizeBookmarkForSyncPlanning({ title: 'Reading', url: 'https://example.com/read', source: 'reading_list', type: 'reading_list', readState: 'READ', tags: ['runtime'] }); const unsynced = core.selectUnsyncedDescribedBookmarks([{ title: 'Existing', url: 'https://example.com/existing', description: 'Existing description' }, { title: 'New', url: 'https://example.com/new', syncId: 'new-sync-id', description: 'New description' }], ['https://example.com/existing'], []); const notionProps = core.buildBookmarkPropertiesFromNotionSchema({ Name: { type: 'title' }, URL: { type: 'url' }, Type: { type: 'single_select' }, Status: { type: 'status' }, Site: { type: 'formula' } }, { title: 'Runtime Notion', url: 'https://example.com/notion', type: 'reading_list', readState: 'READ' }); console.log([typeof core.diffBookmarks, typeof core.validateLinkItemInput, typeof core.normalizeBookmarkForSyncPlanning, normalized.source, normalized.type, normalized.readState, normalized.tags.join('|'), typeof core.normalizeUrlForSync, core.normalizeUrlForSync('https://example.com/page/?b=2&a=1#top'), core.isValidUrl('file:///tmp/page.html'), core.isFetchableHttpUrl('file:///tmp/page.html'), typeof core.extractDescriptionFromHtml, desc.text, desc.source, core.sanitizeDescription('<p>Text &amp; content</p>'), typeof core.selectUnsyncedDescribedBookmarks, unsynced.length, unsynced[0].syncId, typeof core.buildBookmarkPropertiesFromNotionSchema, notionProps.Name.title[0].text.content, notionProps.Type.single_select.name, notionProps.Status.status.name, core.isReadOnlyNotionPropertyType('formula'), Object.prototype.hasOwnProperty.call(notionProps, 'Site')].join(','))",
      ],
      { cwd: projects.get('@bookmark-assistant/server-core') }
    );

    if (contractsResult !== '0') {
      fail(`Expected contracts runtime exports count to be 0, got ${contractsResult}`);
    }

    if (
      extensionCoreResult !==
      'function,function,function,function,function,function,function,function,true,example.com/docs/,reading_list,READ,reading-1,current_page,sync-1,811c9dc5,https://example.com/page?a=1&b=2,last_sync_hash,2,Runtime description,Bookmarks / Folder'
    ) {
      fail(
        `Expected extension-core runtime helpers, content helpers, reading list helpers, sync fingerprint hash helper, storage cleanup helpers, bookmark collection helpers, fingerprint metadata, and URL normalization to be available, got ${extensionCoreResult}`
      );
    }

    if (
      serverCoreResult !==
      'function,function,function,reading_list,reading_list,READ,runtime,function,https://example.com/page?a=1&b=2,true,false,function,Runtime package description,meta_description,Text content,function,1,new-sync-id,function,Runtime Notion,Reading List,Read,true,false'
    ) {
      fail(
        `Expected server-core diff, validation, normalization, URL, description, sync planning, and Notion property helpers to be available, got ${serverCoreResult}`
      );
    }

    console.log('Core package runtime check passed.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
