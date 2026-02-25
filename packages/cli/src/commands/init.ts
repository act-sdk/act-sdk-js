import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

type Framework = 'next-app' | 'next-pages' | 'react';

type InitAnswers = {
  framework: Framework;
  projectId: string;
  actionsPath: string;
};

interface InitOptions {
  skipInstall?: boolean;
}

const REQUIRED_DEPENDENCIES = ['@act-sdk/core', '@act-sdk/react', 'zod'];

function normalizeImportPath(actionsPath: string): string {
  const withoutExtension = actionsPath.replace(/\.[cm]?[tj]sx?$/, '');
  return withoutExtension.startsWith('./') || withoutExtension.startsWith('../')
    ? withoutExtension
    : `@/${withoutExtension}`;
}

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

  const answers = (await prompts([
    {
      type: 'select',
      name: 'framework',
      message: 'What framework are you using?',
      choices: [
        { title: 'Next.js (App Router)', value: 'next-app' },
        { title: 'Next.js (Pages Router)', value: 'next-pages' },
        { title: 'React', value: 'react' },
      ],
    },
    {
      type: 'text',
      name: 'projectId',
      message: 'Project ID (from your Act dashboard):',
      initial: 'proj_',
    },
    {
      type: 'text',
      name: 'actionsPath',
      message: 'Where will your actions live?',
      initial: 'lib/actions.ts',
    },
  ])) as InitAnswers;

  if (!answers.framework || !answers.projectId || !answers.actionsPath) {
    console.log(chalk.yellow('Setup canceled.'));
    return;
  }

  const spinner = ora('Initializing Act-SDK...').start();
  const cwd = process.cwd();

  try {
    await fs.outputFile(path.join(cwd, 'act-sdk.config.ts'), generateConfig(answers));
    await fs.outputFile(path.join(cwd, answers.actionsPath), generateActionsFile());

    const envPath = path.join(cwd, '.env.local');
    const envKey = 'NEXT_PUBLIC_ACT_API_KEY=';
    const envEntry = `${envKey}your_api_key_here`;

    if (await fs.pathExists(envPath)) {
      const current = await fs.readFile(envPath, 'utf-8');
      if (!current.includes(envKey)) {
        await fs.appendFile(envPath, `\n${envEntry}\n`);
      }
    } else {
      await fs.writeFile(envPath, `${envEntry}\n`);
    }

    if (answers.framework === 'next-app') {
      await fs.outputFile(
        path.join(cwd, 'app/act-provider.tsx'),
        generateProvider(normalizeImportPath(answers.actionsPath)),
      );
    }

    let packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | null = null;

    if (!options.skipInstall) {
      spinner.text = 'Installing dependencies...';
      packageManager = await installDependencies(cwd);
    }

    spinner.succeed('Act SDK initialized successfully!');

    console.log(chalk.dim('\n  Next steps:\n'));
    console.log(`  1. Add your API key to ${chalk.cyan('.env.local')}`);
    console.log(`  2. Add your real actions in ${chalk.cyan(answers.actionsPath)}`);
    if (options.skipInstall) {
      console.log(
        `  3. Install dependencies: ${chalk.cyan(`pnpm add ${REQUIRED_DEPENDENCIES.join(' ')}`)}`,
      );
      console.log(`  4. Run ${chalk.cyan('npx @act-sdk/cli add agent')} to add the UI\n`);
    } else {
      console.log(`  3. Dependencies installed with ${chalk.cyan(packageManager ?? 'npm')}`);
      console.log(`  4. Run ${chalk.cyan('npx @act-sdk/cli add agent')} to add the UI\n`);
    }
  } catch (error) {
    spinner.fail(chalk.red('Act SDK setup failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

function generateConfig(answers: { projectId: string }) {
  return `import { defineConfig } from "@act-sdk/core"

export const actSdkConfig = defineConfig({
  apiKey: process.env.NEXT_PUBLIC_ACT_API_KEY!,
  projectId: "${answers.projectId}",
  description: "My application",
})
`;
}

function generateActionsFile() {
  return `import { createAct } from "@act-sdk/core"
import { z } from "zod"

export const act = createAct()

export const exampleAction = act.action({
  id: "example_action",
  description: "An example action",
  input: z.object({
    message: z.string(),
  }),
})(async ({ message }) => {
  console.log(message)
})
`;
}

function generateProvider(actionsImportPath: string) {
  return `"use client"

import { ActProvider } from "@act-sdk/react"
import { actSdkConfig } from "@/act-sdk.config"
import { act } from "${actionsImportPath}"

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ActProvider act={act} config={actSdkConfig}>
      {children}
    </ActProvider>
  )
}
`;
}
