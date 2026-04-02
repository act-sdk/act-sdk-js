import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';
type SetupMode = 'act-cloud' | 'self-hosted';

type InitAnswers = {
  setupMode: SetupMode;
  projectId?: string;
};

interface InitOptions {
  skipInstall?: boolean;
}

const ACT_DASHBOARD_URL = 'https://www.act-sdk.dev/auth';
const SELF_HOSTED_DOCS_URL = 'https://act-sdk.dev/docs/self-hosted';
const REQUIRED_DEPENDENCIES = ['@act-sdk/core', '@act-sdk/react', 'zod'];

async function detectPackageManager(cwd: string): Promise<PackageManager> {
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

async function installDependencies(cwd: string, deps: string[]): Promise<PackageManager> {
  const packageManager = await detectPackageManager(cwd);

  if (packageManager === 'pnpm') {
    await execa('pnpm', ['add', ...deps], { cwd, stdio: 'inherit' });
  } else if (packageManager === 'yarn') {
    await execa('yarn', ['add', ...deps], { cwd, stdio: 'inherit' });
  } else if (packageManager === 'bun') {
    await execa('bun', ['add', ...deps], { cwd, stdio: 'inherit' });
  } else {
    await execa('npm', ['install', ...deps], { cwd, stdio: 'inherit' });
  }

  return packageManager;
}

async function openUrl(url: string): Promise<void> {
  if (process.platform === 'darwin') {
    await execa('open', [url], { stdio: 'ignore' });
  } else if (process.platform === 'win32') {
    await execa('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
  } else {
    await execa('xdg-open', [url], { stdio: 'ignore' });
  }
}

async function appendEnvEntries(envPath: string, entries: string[]) {
  const current = (await fs.pathExists(envPath)) ? await fs.readFile(envPath, 'utf-8') : '';
  const nextEntries = entries.filter((entry) => entry.startsWith('#') || !current.includes(entry.split('=')[0] ?? entry));

  if (nextEntries.length === 0) {
    if (!(await fs.pathExists(envPath))) {
      await fs.writeFile(envPath, '');
    }
    return;
  }

  const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  await fs.appendFile(envPath, `${prefix}${nextEntries.join('\n')}\n`);
}

function generateConfig(answers: InitAnswers) {
  if (answers.setupMode === 'self-hosted') {
    return `import { createAct, defineConfig } from "@act-sdk/core"

export const act = createAct()

export const actSdkConfig = defineConfig({
  mode: "self-hosted",
  endpoint: "http://localhost:3000",
  description: "My Act actions",
})
`;
  }

  return `import { createAct, defineConfig } from "@act-sdk/core"

export const act = createAct()

export const actSdkConfig = defineConfig({
  mode: "cloud",
  apiKey: process.env.NEXT_PUBLIC_ACT_SDK_API_KEY!,
  projectId: "${answers.projectId ?? 'proj_'}",
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

export async function init(options: InitOptions = {}) {
  console.log(chalk.bold('\n  Act SDK — Setup\n'));
  console.log(
    chalk.dim(
      '  Any React framework is supported, including Next.js, TanStack Start, Vite, Expo, Gatsby, and more.\n',
    ),
  );

  const initialAnswers = (await prompts([
    {
      type: 'select',
      name: 'setupMode',
      message: 'How do you want to set up Act?',
      choices: [
        {
          title: 'Act cloud',
          description: 'Use the default Act dashboard flow for project setup.',
          value: 'act-cloud',
        },
        {
          title: 'Self-hosted',
          description: 'Use your own infra and provider. We support all AI SDK-compatible providers.',
          value: 'self-hosted',
        },
      ],
      initial: 0,
    },
  ])) as Pick<InitAnswers, 'setupMode'>;

  if (!initialAnswers.setupMode) {
    console.log(chalk.yellow('Setup canceled.'));
    return;
  }

  const dashboardMessage =
    initialAnswers.setupMode === 'self-hosted'
      ? 'Open the self-hosted docs to continue setup?'
      : 'Open the Act dashboard in your browser to log in and grab your Project ID & API key?';

  const { openDashboards } = await prompts({
    type: 'confirm',
    name: 'openDashboards',
    message: dashboardMessage,
    initial: true,
  });

  if (openDashboards) {
    if (initialAnswers.setupMode === 'self-hosted') {
      console.log(
        chalk.dim(
          `\n  Self-hosted setup supports all AI SDK-compatible providers.\n  Continue here: ${chalk.cyan(
            SELF_HOSTED_DOCS_URL,
          )}\n`,
        ),
      );
    } else {
      console.log(chalk.dim(`\n  Open this page:\n  Act dashboard: ${chalk.cyan(ACT_DASHBOARD_URL)}\n`));
    }

    try {
      await openUrl(
        initialAnswers.setupMode === 'self-hosted' ? SELF_HOSTED_DOCS_URL : ACT_DASHBOARD_URL,
      );
    } catch {
      // ignore failures, user still has the URLs printed above
    }
  }

  const answers = (await prompts([
    {
      type: initialAnswers.setupMode === 'act-cloud' ? 'text' : null,
      name: 'projectId',
      message: 'Project ID (from your Act dashboard):',
      initial: 'proj_',
    },
  ])) as Pick<InitAnswers, 'projectId'>;

  if (initialAnswers.setupMode === 'act-cloud' && !answers.projectId) {
    console.log(chalk.yellow('Setup canceled.'));
    return;
  }

  const fullAnswers: InitAnswers = {
    setupMode: initialAnswers.setupMode,
    projectId: answers.projectId,
  };

  const spinner = ora('Initializing Act SDK...').start();
  const cwd = process.cwd();
  const envEntries =
    initialAnswers.setupMode === 'act-cloud'
      ? ['NEXT_PUBLIC_ACT_SDK_API_KEY=your_act_sdk_api_key_here']
      : [];
  const installDeps = [...REQUIRED_DEPENDENCIES];

  try {
    await fs.outputFile(path.join(cwd, 'act-sdk.config.ts'), generateConfig(fullAnswers));
    await fs.outputFile(path.join(cwd, 'providers/act-provider.tsx'), generateProvider());

    await appendEnvEntries(path.join(cwd, '.env'), envEntries);

    let packageManager: PackageManager | null = null;

    if (!options.skipInstall) {
      spinner.text = 'Installing dependencies...';
      packageManager = await installDependencies(cwd, installDeps);
    }

    spinner.succeed('Act SDK initialized successfully!');

    console.log(chalk.dim('\n  Next steps:\n'));
    const nextSteps = [
    ];

    if (initialAnswers.setupMode === 'act-cloud') {
      nextSteps.unshift(
        `Add your Act key as ${chalk.cyan('NEXT_PUBLIC_ACT_SDK_API_KEY')} in ${chalk.cyan('.env')}`,
      );
    }

    if (initialAnswers.setupMode === 'self-hosted') {
      nextSteps.push(
        `Self-hosted supports all AI SDK-compatible providers. Continue setup at ${chalk.cyan(
          SELF_HOSTED_DOCS_URL,
        )}`,
      );
      nextSteps.push(`Update ${chalk.cyan('act-sdk.config.ts')} with your self-hosted endpoint`);
    }

    nextSteps.push(
      `Define your actions and routes anywhere in your app and import ${chalk.cyan('act')} from ${chalk.cyan('act-sdk.config.ts')}`,
    );
    nextSteps.push(`Wrap your app with ${chalk.cyan('providers/act-provider.tsx')}`);

    if (options.skipInstall) {
      nextSteps.push(`Install dependencies: ${chalk.cyan(`pnpm add ${installDeps.join(' ')}`)}`);
    } else {
      nextSteps.push(`Dependencies installed with ${chalk.cyan(packageManager ?? 'npm')}`);
    }

    nextSteps.push(`Run ${chalk.cyan('npx @act-sdk/cli add chat')} to add the chat widget`);

    nextSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step}`);
    });

    console.log(chalk.green('\n  Happy hacking. Let users control your app through chat.\n'));
  } catch (error) {
    spinner.fail(chalk.red('Act SDK setup failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}
