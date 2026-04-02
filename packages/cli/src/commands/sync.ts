import {
  DEFAULT_ACT_SDK_API_ENDPOINT,
  isSelfHostedConfig,
} from '@act-sdk/core';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { buildManifest, loadConfig, resolveConfigPath, resolveProjectPath } from './shared';

interface SyncPayload {
  actions: Array<{
    actionId: string;
    description: string;
    hasInput: boolean;
    inputSchema?: Record<string, unknown>;
  }>;
  routes: Array<{
    routeId: string;
    description: string;
    path: string;
    hasInput: boolean;
    inputSchema?: Record<string, unknown>;
  }>;
}

async function syncToCloud(
  payload: SyncPayload,
  endpoint: string,
  apiKey: string,
  projectId: string,
): Promise<void> {
  const response = await fetch(`${endpoint}/api/actions/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-project-id': projectId,
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
  const spinner = ora('Syncing Act definitions...').start();

  try {
    const projectPath = resolveProjectPath(options.project);
    const configPath = resolveConfigPath(projectPath, options.config);

    spinner.text = 'Loading configuration...';
    const config = await loadConfig(configPath);

    if (isSelfHostedConfig(config)) {
      throw new Error('`act sync` currently supports only cloud mode configs');
    }

    spinner.text = 'Scanning project for actions and routes...';
    const manifest = await buildManifest(projectPath, configPath);
    const actions = manifest.actions.map((action) => ({
      actionId: action.id,
      description: action.description,
      hasInput: action.hasInput,
      inputSchema: action.inputSchema,
    }));
    const routes = manifest.routes.map((route) => ({
      routeId: route.id,
      description: route.description,
      path: route.path,
      hasInput: route.hasInput,
      inputSchema: route.inputSchema,
    }));

    spinner.text = 'Syncing actions and routes to Act SDK API...';
    const payload: SyncPayload = {
      actions,
      routes,
    };

    await syncToCloud(
      payload,
      config.endpoint || DEFAULT_ACT_SDK_API_ENDPOINT,
      config.apiKey,
      config.projectId,
    );

    spinner.succeed(
      chalk.green(
        `Successfully synced ${actions.length} actions and ${routes.length} routes to the cloud`,
      ),
    );
    console.log(chalk.gray(`Project ID: ${config.projectId}`));
  } catch (error) {
    spinner.fail(chalk.red('Sync failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
};
