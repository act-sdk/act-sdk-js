import chalk from 'chalk';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { buildManifest, resolveConfigPath, resolveProjectPath } from './shared';

interface GenerateManifestOptions {
  config?: string;
  project?: string;
}

export async function generateManifest(options: GenerateManifestOptions = {}) {
  const spinner = ora('Generating Act manifest...').start();

  try {
    const projectPath = resolveProjectPath(options.project);
    const configPath = resolveConfigPath(projectPath, options.config);
    const manifestPath = path.join(projectPath, 'act.manifest.json');

    spinner.text = 'Scanning project for actions and routes...';
    const manifest = await buildManifest(projectPath, configPath);

    spinner.text = 'Writing manifest file...';
    await fs.outputJson(manifestPath, manifest, { spaces: 2 });

    spinner.succeed(
      chalk.green(
        `Generated Act manifest with ${manifest.actions.length} actions and ${manifest.routes.length} routes`,
      ),
    );
    console.log(chalk.gray(`Manifest: ${manifestPath}`));
  } catch (error) {
    spinner.fail(chalk.red('Manifest generation failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}
