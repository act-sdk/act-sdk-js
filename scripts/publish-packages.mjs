import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const packagesDir = join(process.cwd(), 'packages');
const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(packagesDir, entry.name, 'package.json'))
  .map((pkgJsonPath) => JSON.parse(readFileSync(pkgJsonPath, 'utf8')))
  .filter((pkg) => pkg.private !== true)
  .map((pkg) => pkg.name)
  .filter(Boolean)
  .sort();

if (packages.length === 0) {
  console.error('No publishable packages were found in packages/*.');
  process.exit(1);
}

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
