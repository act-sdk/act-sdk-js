import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

type InitAnswers = {
  projectId: string;
};

interface InitOptions {
  skipInstall?: boolean;
}

const REQUIRED_DEPENDENCIES = ['@act-sdk/core', '@act-sdk/react', 'zod'];

async function detectPackageManager(cwd: string): Promise<'pnpm' | 'npm' | 'yarn' | 'bun'> {
  if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(cwd, 'bun.lockb'))) return 'bun';
  if (await fs.pathExists(path.join(cwd, 'package-lock.json'))) return 'npm';

  const userAgent = process.env['npm_config_user_agent']?.toLowerCase() ?? '';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('bun')) return 'bun';

  return 'npm';
}

async function installDependencies(cwd: string): Promise<'pnpm' | 'npm' | 'yarn' | 'bun'> {
  const packageManager = await detectPackageManager(cwd);

  if (packageManager === 'pnpm') {
    await execa('pnpm', ['add', ...REQUIRED_DEPENDENCIES], { cwd, stdio: 'inherit' });
  } else if (packageManager === 'yarn') {
    await execa('yarn', ['add', ...REQUIRED_DEPENDENCIES], { cwd, stdio: 'inherit' });
  } else if (packageManager === 'bun') {
    await execa('bun', ['add', ...REQUIRED_DEPENDENCIES], { cwd, stdio: 'inherit' });
  } else {
    await execa('npm', ['install', ...REQUIRED_DEPENDENCIES], { cwd, stdio: 'inherit' });
  }

  return packageManager;
}

export async function init(options: InitOptions = {}) {
  console.log(chalk.bold('\n  Act SDK — Setup\n'));
  console.log(
    chalk.dim(
      '  Any React framework is supported, including Next.js, TanStack Start, Vite, Expo, Gatsby, and more.\n',
    ),
  );

  const { openDashboard } = await prompts({
    type: 'confirm',
    name: 'openDashboard',
    message: 'Open the Act dashboard in your browser to log in and grab your Project ID & API key?',
    initial: true,
  });

  if (openDashboard) {
    const url = 'https://www.act-sdk.dev/auth';
    console.log(
      chalk.dim(
        `\n  Opening dashboard (or open this URL manually if it does not open automatically):\n  ${chalk.cyan(
          url,
        )}\n`,
      ),
    );
    try {
      if (process.platform === 'darwin') {
        await execa('open', [url], { stdio: 'ignore' });
      } else if (process.platform === 'win32') {
        await execa('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
      } else {
        await execa('xdg-open', [url], { stdio: 'ignore' });
      }
    } catch {
      // ignore failures, user still has the URL printed above
    }
  }

  const answers = (await prompts([
    {
      type: 'text',
      name: 'projectId',
      message: 'Project ID (from your Act dashboard):',
      initial: 'proj_',
    },
  ])) as InitAnswers;

  if (!answers.projectId) {
    console.log(chalk.yellow('Setup canceled.'));
    return;
  }

  const spinner = ora('Initializing Act-SDK...').start();
  const cwd = process.cwd();

  try {
    await fs.outputFile(path.join(cwd, 'act-sdk.config.ts'), generateConfig(answers));
    await fs.outputFile(path.join(cwd, 'providers/act-provider.tsx'), generateProvider());

    const envPath = path.join(cwd, '.env');
    const envKey = 'NEXT_PUBLIC_ACT_SDK_API_KEY=';
    const envEntry = `${envKey}your_api_key_here`;

    if (await fs.pathExists(envPath)) {
      const current = await fs.readFile(envPath, 'utf-8');
      if (!current.includes(envKey)) {
        await fs.appendFile(envPath, `\n${envEntry}\n`);
      }
    } else {
      await fs.writeFile(envPath, `${envEntry}\n`);
    }

    let packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | null = null;

    if (!options.skipInstall) {
      spinner.text = 'Installing dependencies...';
      packageManager = await installDependencies(cwd);
    }

    spinner.succeed('Act SDK initialized successfully!');

    console.log(chalk.dim('\n  Next steps:\n'));
    console.log(
      `  1. Add your API key as ${chalk.cyan('NEXT_PUBLIC_ACT_SDK_API_KEY')} in ${chalk.cyan('.env')}`,
    );
    console.log(
      `  2. Define your actions anywhere in your app and import ${chalk.cyan('act')} from ${chalk.cyan('act-sdk.config.ts')}`,
    );
    console.log(
      `  3. Wrap your app with ${chalk.cyan('providers/act-provider.tsx')}`,
    );
    if (options.skipInstall) {
      console.log(
        `  4. Install dependencies: ${chalk.cyan(`pnpm add ${REQUIRED_DEPENDENCIES.join(' ')}`)}`,
      );
      console.log(`  5. Run ${chalk.cyan('npx @act-sdk/cli add command')} to add the command palette UI`);
    } else {
      console.log(`  4. Dependencies installed with ${chalk.cyan(packageManager ?? 'npm')}`);
      console.log(`  5. Run ${chalk.cyan('npx @act-sdk/cli add command')} to add the command palette UI`);
    }
    console.log(chalk.green('\n  Happy hacking. Let users control your app with AI.\n'));
  } catch (error) {
    spinner.fail(chalk.red('Act SDK setup failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

function generateConfig(answers: { projectId: string }) {
  return `import { createAct, defineConfig } from "@act-sdk/core"

export const act = createAct()

export const actSdkConfig = defineConfig({
  apiKey: process.env.NEXT_PUBLIC_ACT_SDK_API_KEY!,
  projectId: "${answers.projectId}",
  description: "My Act actions",
  endpoint: "https://www.act-sdk.dev",
})
`;
}

function generateProvider() {
  return `"use client"

import { ActProvider as ActProviderRoot } from "@act-sdk/react"
import { act, actSdkConfig } from "../act-sdk.config"

export function ActSdkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ActProviderRoot act={act} config={actSdkConfig}>
      {children}
    </ActProviderRoot>
  )
}
`;
}
