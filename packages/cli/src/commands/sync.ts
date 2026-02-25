import { DEFAULT_ACT_SDK_API_ENDPOINT, type ActSdkConfig } from '@act-sdk/core';
import chalk from 'chalk';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import ora from 'ora';
import path, { resolve } from 'path';
import { Node, Project, SyntaxKind, type Expression, type ObjectLiteralExpression } from 'ts-morph';

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

function unwrapExpression(expression: Expression): Expression {
  let current = expression;

  while (
    Node.isParenthesizedExpression(current) ||
    Node.isAsExpression(current) ||
    Node.isSatisfiesExpression(current) ||
    Node.isNonNullExpression(current)
  ) {
    current = current.getExpression();
  }

  return current;
}

function parseEnvExpression(expression: Expression): string | undefined {
  const text = unwrapExpression(expression).getText().replace(/\s+/g, '');

  const dotNotation = text.match(/^process\.env\.([A-Za-z_][A-Za-z0-9_]*)$/);
  if (dotNotation) {
    const envKey = dotNotation[1];
    if (!envKey) {
      throw new Error('Invalid process.env key in config');
    }
    const value = process.env[envKey];
    if (!value) {
      throw new Error(`Missing required environment variable "${envKey}"`);
    }
    return value;
  }

  const bracketNotation = text.match(/^process\.env\[['"]([^'"]+)['"]\]$/);
  if (bracketNotation) {
    const envKey = bracketNotation[1];
    if (!envKey) {
      throw new Error('Invalid process.env key in config');
    }
    const value = process.env[envKey];
    if (!value) {
      throw new Error(`Missing required environment variable "${envKey}"`);
    }
    return value;
  }

  return undefined;
}

function parseExpressionValue(expression: Expression): unknown {
  const parsedEnvValue = parseEnvExpression(expression);
  if (parsedEnvValue !== undefined) {
    return parsedEnvValue;
  }

  const value = unwrapExpression(expression);

  if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
    return value.getLiteralText();
  }

  if (Node.isNumericLiteral(value)) {
    return Number(value.getText());
  }

  if (Node.isTrueLiteral(value)) {
    return true;
  }

  if (Node.isFalseLiteral(value)) {
    return false;
  }

  if (Node.isNullLiteral(value)) {
    return null;
  }

  if (Node.isArrayLiteralExpression(value)) {
    return value.getElements().map((element) => parseExpressionValue(element));
  }

  if (Node.isObjectLiteralExpression(value)) {
    return parseObjectLiteral(value);
  }

  throw new Error(`Unsupported config value: "${value.getText()}"`);
}

function parseObjectLiteral(objectLiteral: ObjectLiteralExpression): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const property of objectLiteral.getProperties()) {
    if (!Node.isPropertyAssignment(property)) {
      throw new Error(`Unsupported config property syntax: "${property.getText()}"`);
    }

    const key = property.getNameNode().getText().replace(/^['"]|['"]$/g, '');
    const initializer = property.getInitializer();
    if (!initializer || !Node.isExpression(initializer)) {
      throw new Error(`Missing value for config key "${key}"`);
    }

    result[key] = parseExpressionValue(initializer);
  }

  return result;
}

function toActSdkConfig(rawConfig: Record<string, unknown>): ActSdkConfig {
  const apiKey = rawConfig['apiKey'];
  const projectId = rawConfig['projectId'];
  const description = rawConfig['description'];
  const endpoint = rawConfig['endpoint'];

  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error('Config "apiKey" must be a non-empty string or process.env reference');
  }
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Config "projectId" must be a non-empty string');
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error('Config "description" must be a non-empty string');
  }
  if (endpoint !== undefined && typeof endpoint !== 'string') {
    throw new Error('Config "endpoint" must be a string when provided');
  }

  return {
    apiKey,
    projectId,
    description,
    endpoint,
  };
}

function parseConfigExpression(expression: Expression): ActSdkConfig | null {
  const value = unwrapExpression(expression);

  if (Node.isCallExpression(value) && value.getExpression().getText() === 'defineConfig') {
    const [firstArg] = value.getArguments();
    if (!firstArg || !Node.isExpression(firstArg)) return null;
    const raw = parseExpressionValue(firstArg);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return toActSdkConfig(raw as Record<string, unknown>);
  }

  if (Node.isObjectLiteralExpression(value)) {
    const raw = parseObjectLiteral(value);
    return toActSdkConfig(raw);
  }

  return null;
}

function parseTsConfig(configContent: string): ActSdkConfig {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('act-sdk.config.ts', configContent);

  const candidates: Expression[] = [];

  const defaultExport = sourceFile.getExportAssignment((exp) => !exp.isExportEquals());
  if (defaultExport) {
    candidates.push(defaultExport.getExpression());
  }

  const variableStatements = sourceFile.getVariableStatements().filter((statement) =>
    statement.isExported(),
  );

  for (const statement of variableStatements) {
    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      if (!initializer || !Node.isExpression(initializer)) continue;
      candidates.push(initializer);
    }
  }

  for (const candidate of candidates) {
    const config = parseConfigExpression(candidate);
    if (config) return config;
  }

  throw new Error(
    'Could not find a supported config export. Use `export default defineConfig({ ... })`, `export const actSdkConfig = defineConfig({ ... })`, or `export const config = { ... }`.',
  );
}

async function loadConfig(configPath: string): Promise<ActSdkConfig> {
  try {
    const configContent = await readFile(configPath, 'utf-8');

    if (configPath.endsWith('.json')) {
      const config = JSON.parse(configContent);
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new Error('Config JSON must be an object');
      }
      return toActSdkConfig(config as Record<string, unknown>);
    }

    return parseTsConfig(configContent);
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
