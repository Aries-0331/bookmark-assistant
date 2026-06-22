#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const registry = 'https://registry.npmjs.org/';
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
    skipGitCheck: false,
    skipVerify: false,
    otp: '',
  };

  for (const arg of argv) {
    if (arg === '--') continue;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--yes') options.yes = true;
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
  --otp=123456       Optional npm one-time password for interactive 2FA accounts.
  --skip-git-check   Do not require a clean git worktree.
  --skip-verify      Skip build/runtime/pack verification before publish.
  --help             Show this help.

Token handling:
  Prefer NPM_TOKEN for this command, or point NPM_CONFIG_USERCONFIG at a temporary
  npmrc. The script never writes npm credentials into the repository.
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
  let tempNpmrcPath = null;
  let tempCachePath = null;

  if (!env.NPM_CONFIG_CACHE && !env.npm_config_cache) {
    tempCachePath = path.join(
      os.tmpdir(),
      `bookmark-assistant-npm-cache-${process.pid}-${Date.now()}`
    );
    fs.mkdirSync(tempCachePath, { recursive: true });
    env.NPM_CONFIG_CACHE = tempCachePath;
  }

  if (env.NPM_CONFIG_USERCONFIG) {
    return {
      env,
      cleanup: () => {
        if (tempCachePath) {
          fs.rmSync(tempCachePath, { recursive: true, force: true });
        }
      },
    };
  }

  if (!env.NPM_TOKEN) {
    return {
      env,
      cleanup: () => {
        if (tempCachePath) {
          fs.rmSync(tempCachePath, { recursive: true, force: true });
        }
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
    cleanup: () => {
      if (tempNpmrcPath) {
        fs.rmSync(tempNpmrcPath, { force: true });
      }
      if (tempCachePath) {
        fs.rmSync(tempCachePath, { recursive: true, force: true });
      }
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
      run('pnpm', ['pack', '--pack-destination', packDir], {
        cwd: path.join(repoRoot, item.dir),
        env,
      });
    }
  } finally {
    fs.rmSync(packDir, { recursive: true, force: true });
  }
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
    run('pnpm', publishArgs, {
      cwd: path.join(repoRoot, item.dir),
      env,
    });
  }
}

function verifyPublishedVersions(env) {
  for (const item of packages) {
    const packageJson = readPackageJson(item.dir);
    run(
      'npm',
      ['view', item.name, 'version', `--registry=${registry}`],
      { env }
    );
    console.log(`${item.name} expected version: ${packageJson.version}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.dryRun && !options.yes) {
    fail('Real publishing requires --yes. Run --dry-run first if you only want verification.');
  }

  const { env, cleanup } = prepareNpmEnv();

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
      verifyPublishedVersions(env);
    }
  } finally {
    cleanup();
  }
}

main();
