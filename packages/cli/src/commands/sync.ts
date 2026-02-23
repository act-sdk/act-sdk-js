import { DEFAULT_ACT_SDK_API_ENDPOINT, type ActSdkConfig } from '@act-sdk/core';
import chalk from 'chalk';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import ora from 'ora';
import path, { resolve } from 'path';
import { Project, SyntaxKind } from 'ts-morph';

interface SyncPayload {
  projectId: string;
  actions: Array<{
    id: string;
    description: string;
    hasInput: boolean;
    inputSchema?: Record<string, unknown>;
  }>;
  projectDescription: string;
}

async function loadConfig(configPath: string): Promise<ActSdkConfig> {
  try {
    const configContent = await readFile(configPath, 'utf-8');

    if (configPath.endsWith('.json')) {
      const config = JSON.parse(configContent);
      return config as ActSdkConfig;
    } else {
      const configMatch = configContent.match(/export\s+const\s+config\s*=\s*({[\s\S]*?})\s*$/m);
      if (!configMatch) {
        throw new Error('Could not find config export in file');
      }

      const configStr = configMatch[1];
      const config = eval(`(${configStr})`);
      return config as ActSdkConfig;
    }
  } catch (error) {
    throw new Error(
      `Failed to load config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function extractActionsFromProject(projectPath: string): Promise<SyncPayload['actions']> {
  const project = new Project({
    tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
  });

  const actions: SyncPayload['actions'] = [];

  for (const sourceFile of project.getSourceFiles()) {
    if (
      sourceFile.getFilePath().includes('node_modules') ||
      sourceFile.getFilePath().includes('dist')
    )
      continue;

    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of calls) {
      const expr = call.getExpression();

      if (!expr.getText().endsWith('.action')) continue;

      const args = call.getArguments();
      if (!args[0]) continue;

      const metaObj = args[0];
      if (metaObj.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

      const properties = metaObj.getDescendantsOfKind(SyntaxKind.PropertyAssignment);

      const meta: Record<string, string> = {};
      for (const prop of properties) {
        const name = prop.getName();
        const value = prop.getInitializer()?.getText().replace(/['"]/g, '') ?? '';
        meta[name] = value;
      }

      if (!meta['id'] || !meta['description']) continue;

      const hasInput = !!meta['input'];

      actions.push({
        id: meta['id'],
        description: meta['description'],
        hasInput,
      });
    }
  }

  return actions;
}

async function syncToCloud(payload: SyncPayload, endpoint: string, apiKey: string): Promise<void> {
  const response = await fetch(`${endpoint}/api/sync/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-project-id': payload.projectId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return result;
}

export const sync = async (
  options: {
    config?: string;
    project?: string;
  },
  command: Command,
) => {
  const spinner = ora('Syncing action definitions...').start();

  try {
    const configPath = resolve(options.config || 'act-sdk.config.ts');
    const projectPath = resolve(options.project || process.cwd());

    spinner.text = 'Loading configuration...';
    const config = await loadConfig(configPath);

    spinner.text = 'Extracting action definitions...';
    const actions = await extractActionsFromProject(projectPath);

    spinner.text = 'Syncing to cloud...';
    const payload: SyncPayload = {
      projectId: config.projectId,
      actions,
      projectDescription: config.description,
    };

    await syncToCloud(payload, config.endpoint || DEFAULT_ACT_SDK_API_ENDPOINT, config.apiKey);

    spinner.succeed(
      chalk.green(`Successfully synced ${actions.length} action definitions to the cloud`),
    );
    console.log(chalk.gray(`Project ID: ${config.projectId}`));
  } catch (error) {
    spinner.fail(chalk.red('Sync failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
};
