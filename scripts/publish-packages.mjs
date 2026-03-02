import { spawnSync } from 'node:child_process';

const packages = ['@act-sdk/core', '@act-sdk/react', '@act-sdk/cli'];
const extraArgs = process.argv.slice(2);

for (const pkg of packages) {
  console.log(`\nPublishing ${pkg}...`);

  const result = spawnSync(
    'pnpm',
    ['--filter', pkg, 'publish', '--access', 'public', '--no-git-checks', ...extraArgs],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
