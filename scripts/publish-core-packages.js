#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const registry = 'https://registry.npmjs.org/';
const publicVisibilityRetryDelaysMs = [0, 5_000, 15_000, 30_000, 60_000];
const packages = [
  {
    name: '@bookmark-assistant/contracts',
    dir: 'packages/contracts',
    runtimeCheck: null,
  },
  {
    name: '@bookmark-assistant/extension-core',
    dir: 'packages/extension-core',
    runtimeCheck: null,
  },
  {
    name: '@bookmark-assistant/server-core',
    dir: 'packages/server-core',
    runtimeCheck:
      "const core = require('.'); if (typeof core.diffBookmarks !== 'function') { throw new Error('diffBookmarks export is not available'); }",
  },
];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    yes: false,
    force: false,
    skipGitCheck: false,
    skipVerify: false,
    otp: '',
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--yes') options.yes = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--skip-git-check') options.skipGitCheck = true;
    else if (arg === '--skip-verify') options.skipVerify = true;
    else if (arg.startsWith('--otp=')) options.otp = arg.slice('--otp='.length);
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Publish Bookmark Assistant public core packages.

Usage:
  pnpm publish:core -- --dry-run
  NPM_TOKEN=npm_xxx pnpm publish:core -- --yes
  NPM_CONFIG_USERCONFIG=/path/to/npmrc pnpm publish:core -- --yes
  pnpm publish:core -- --yes --otp=123456

Options:
  --dry-run          Run build, runtime checks, pack dry-run, and publish dry-run.
  --yes              Required for a real publish.
  --force            Try publishing even when the same version already exists.
  --otp=123456       Optional npm one-time password for interactive 2FA accounts.
  --skip-git-check   Do not require a clean git worktree.
  --skip-verify      Skip build/runtime/pack verification before publish.
  --help             Show this help.

Token handling:
  Prefer NPM_TOKEN for this command, or point NPM_CONFIG_USERCONFIG at a temporary
  npmrc. The script never writes npm credentials into the repository.
  In GitHub Actions trusted publishing, do not set NPM_TOKEN; npm uses OIDC.
`);
}

function fail(message) {
  console.error(`\nError: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const cwd = options.cwd || repoRoot;
  const env = options.env || process.env;
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    fail(`${command} ${args.join(' ')} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
}

function runCapture(command, args, options = {}) {
  const cwd = options.cwd || repoRoot;
  const env = options.env || process.env;
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    fail(`${command} ${args.join(' ')} failed: ${result.error.message}`);
  }

  return result;
}

function readPackageJson(packageDir) {
  const filePath = path.join(repoRoot, packageDir, 'package.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertPackageMetadata() {
  for (const item of packages) {
    const packageJson = readPackageJson(item.dir);

    if (packageJson.name !== item.name) {
      fail(`${item.dir} package name is ${packageJson.name}, expected ${item.name}`);
    }

    if (packageJson.private === true) {
      fail(`${item.name} is marked private`);
    }

    if (!packageJson.version) {
      fail(`${item.name} does not have a version`);
    }

    if (packageJson.publishConfig?.access !== 'public') {
      fail(`${item.name} must set publishConfig.access to public`);
    }

    if (!packageJson.files?.includes('dist')) {
      fail(`${item.name} must whitelist dist in files`);
    }
  }
}

function assertCleanGitWorktree() {
  const result = spawnSync('git', ['status', '--short'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    fail(`git status failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`git status exited with status ${result.status}`);
  }

  if (result.stdout.trim()) {
    fail('git worktree is not clean. Commit or stash changes, or pass --skip-git-check.');
  }
}

function prepareNpmEnv() {
  const env = { ...process.env };
  const publicEnv = { ...process.env };
  let tempNpmrcPath = null;
  let tempCachePath = null;
  let tempPublicNpmrcPath = null;
  let tempPublicCachePath = null;

  if (!env.NPM_CONFIG_CACHE && !env.npm_config_cache) {
    tempCachePath = path.join(
      os.tmpdir(),
      `bookmark-assistant-npm-cache-${process.pid}-${Date.now()}`
    );
    fs.mkdirSync(tempCachePath, { recursive: true });
    env.NPM_CONFIG_CACHE = tempCachePath;
  }

  tempPublicNpmrcPath = path.join(
    os.tmpdir(),
    `bookmark-assistant-public-registry-${process.pid}-${Date.now()}.npmrc`
  );
  tempPublicCachePath = path.join(
    os.tmpdir(),
    `bookmark-assistant-public-cache-${process.pid}-${Date.now()}`
  );

  fs.mkdirSync(tempPublicCachePath, { recursive: true });
  fs.writeFileSync(tempPublicNpmrcPath, `registry=${registry}\n`, { mode: 0o600 });
  delete publicEnv.NPM_TOKEN;
  delete publicEnv.npm_config__authToken;
  delete publicEnv.NPM_CONFIG__AUTH_TOKEN;
  publicEnv.NPM_CONFIG_USERCONFIG = tempPublicNpmrcPath;
  publicEnv.npm_config_userconfig = tempPublicNpmrcPath;
  publicEnv.NPM_CONFIG_CACHE = tempPublicCachePath;
  publicEnv.npm_config_cache = tempPublicCachePath;

  if (env.NPM_CONFIG_USERCONFIG) {
    return {
      env,
      publicEnv,
      cleanup: () => {
        if (tempCachePath) {
          fs.rmSync(tempCachePath, { recursive: true, force: true });
        }
        fs.rmSync(tempPublicNpmrcPath, { force: true });
        fs.rmSync(tempPublicCachePath, { recursive: true, force: true });
      },
    };
  }

  if (!env.NPM_TOKEN) {
    return {
      env,
      publicEnv,
      cleanup: () => {
        if (tempCachePath) {
          fs.rmSync(tempCachePath, { recursive: true, force: true });
        }
        fs.rmSync(tempPublicNpmrcPath, { force: true });
        fs.rmSync(tempPublicCachePath, { recursive: true, force: true });
      },
    };
  }

  tempNpmrcPath = path.join(
    os.tmpdir(),
    `bookmark-assistant-publish-${process.pid}-${Date.now()}.npmrc`
  );

  const npmrc = [
    `registry=${registry}`,
    `@bookmark-assistant:registry=${registry}`,
    `//registry.npmjs.org/:_authToken=${env.NPM_TOKEN}`,
    '',
  ].join('\n');

  fs.writeFileSync(tempNpmrcPath, npmrc, { mode: 0o600 });
  env.NPM_CONFIG_USERCONFIG = tempNpmrcPath;

  return {
    env,
    publicEnv,
    cleanup: () => {
      if (tempNpmrcPath) {
        fs.rmSync(tempNpmrcPath, { force: true });
      }
      if (tempCachePath) {
        fs.rmSync(tempCachePath, { recursive: true, force: true });
      }
      fs.rmSync(tempPublicNpmrcPath, { force: true });
      fs.rmSync(tempPublicCachePath, { recursive: true, force: true });
    },
  };
}

function verifyPackages(env) {
  for (const item of packages) {
    run('pnpm', ['-F', item.name, 'build'], { env });
  }

  for (const item of packages) {
    if (item.runtimeCheck) {
      run('node', ['-e', item.runtimeCheck], {
        cwd: path.join(repoRoot, item.dir),
        env,
      });
    }
  }

  const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookmark-assistant-pack-'));

  try {
    for (const item of packages) {
      run('npm', ['pack', '--pack-destination', packDir], {
        cwd: path.join(repoRoot, item.dir),
        env,
      });
    }
  } finally {
    fs.rmSync(packDir, { recursive: true, force: true });
  }

  run('pnpm', ['check:core-runtime'], { env });
}

function publishPackages(options, env) {
  const publishArgs = ['publish', '--access', 'public', '--no-git-checks'];

  if (options.dryRun) {
    publishArgs.push('--dry-run');
  }

  if (options.otp) {
    publishArgs.push(`--otp=${options.otp}`);
  }

  for (const item of packages) {
    const packageJson = readPackageJson(item.dir);

    if (!options.dryRun && !options.force) {
      const publishedVersion = getPublishedVersion(item.name, packageJson.version, env);

      if (publishedVersion === packageJson.version) {
        console.log(`${item.name}@${packageJson.version} is already published; skipping.`);
        continue;
      }

      console.log(`${item.name}@${packageJson.version} is not published yet; publishing.`);
    }

    run('npm', publishArgs, {
      cwd: path.join(repoRoot, item.dir),
      env,
    });
  }
}

function getPublishedVersion(packageName, version, env) {
  const result = runCapture(
    'npm',
    ['view', `${packageName}@${version}`, 'version', `--registry=${registry}`],
    { cwd: os.tmpdir(), env }
  );

  if (result.status === 0) {
    return result.stdout.trim();
  }

  const output = `${result.stdout}\n${result.stderr}`;

  if (output.includes('E404') || output.includes('Not found')) {
    return null;
  }

  fail(`Unable to check published version for ${packageName}@${version}:\n${output.trim()}`);
}

function sleep(ms) {
  if (ms > 0) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }
}

function waitForPublishedVersion(packageName, version, env, label) {
  let lastResult = null;

  for (const delay of publicVisibilityRetryDelaysMs) {
    sleep(delay);
    lastResult = getPublishedVersion(packageName, version, env);

    if (lastResult === version) {
      return lastResult;
    }

    console.log(`${packageName}@${version} is not ${label} yet; retrying registry check...`);
  }

  return lastResult;
}

function verifyPublishedVersions(env, publicEnv) {
  for (const item of packages) {
    const packageJson = readPackageJson(item.dir);
    const authenticatedVersion = waitForPublishedVersion(
      item.name,
      packageJson.version,
      env,
      'authenticated-visible'
    );

    if (authenticatedVersion !== packageJson.version) {
      fail(
        `${item.name} expected version ${packageJson.version}, but authenticated registry check returned ${authenticatedVersion || 'not published'}`
      );
    }

    let publicVersion = waitForPublishedVersion(
      item.name,
      packageJson.version,
      publicEnv,
      'public-visible'
    );

    if (publicVersion !== packageJson.version) {
      console.log(
        `${item.name}@${packageJson.version} is authenticated-visible but not public-visible; setting npm access to public.`
      );

      run('npm', ['access', 'public', item.name, `--registry=${registry}`], { env });
      publicVersion = waitForPublishedVersion(
        item.name,
        packageJson.version,
        publicEnv,
        'public-visible'
      );
    }

    if (publicVersion !== packageJson.version) {
      fail(
        `${item.name}@${packageJson.version} is published for authenticated npm access, but it is not public-visible. This usually means npm access is still restricted or registry propagation is delayed. Try: npm access public ${item.name}`
      );
    }

    console.log(`${item.name}@${packageJson.version} is published and public-visible on npm.`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.dryRun && !options.yes) {
    fail('Real publishing requires --yes. Run --dry-run first if you only want verification.');
  }

  const { env, publicEnv, cleanup } = prepareNpmEnv();

  try {
    assertPackageMetadata();

    if (!options.dryRun && !options.skipGitCheck) {
      assertCleanGitWorktree();
    }

    if (!options.skipVerify) {
      verifyPackages(env);
    }

    publishPackages(options, env);

    if (!options.dryRun) {
      verifyPublishedVersions(env, publicEnv);
    }
  } finally {
    cleanup();
  }
}

main();
