import type { ActManifest, ActSdkConfig, ActionManifest, RouteManifest } from '@act-sdk/core';
import { readFile } from 'fs/promises';
import path, { isAbsolute, resolve } from 'path';
import { createJiti } from 'jiti';
import {
  Node,
  Project,
  SyntaxKind,
  type CallExpression,
  type Expression,
  type ObjectLiteralExpression,
  type SourceFile,
} from 'ts-morph';

export interface ManifestFile extends ActManifest {}

interface RuntimeActModule {
  listActions: () => ActionManifest[];
  listRoutes?: () => RouteManifest[];
}

type JsonSchema = Record<string, unknown>;

interface ParsedStaticSchema {
  schema: JsonSchema;
  optional?: boolean;
}

const NOOP_ZOD_CHAIN_METHODS = new Set([
  'brand',
  'catch',
  'default',
  'describe',
  'finite',
  'int',
  'lte',
  'lt',
  'gte',
  'gt',
  'max',
  'min',
  'multipleOf',
  'negative',
  'nonnegative',
  'nonpositive',
  'positive',
  'readonly',
  'refine',
  'regex',
  'safe',
  'startsWith',
  'endsWith',
  'step',
  'transform',
  'trim',
  'toLowerCase',
  'toUpperCase',
  'url',
  'uuid',
]);

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

    const key = property
      .getNameNode()
      .getText()
      .replace(/^['"]|['"]$/g, '');
    const initializer = property.getInitializer();
    if (!initializer || !Node.isExpression(initializer)) {
      throw new Error(`Missing value for config key "${key}"`);
    }

    result[key] = parseExpressionValue(initializer);
  }

  return result;
}

function toActSdkConfig(rawConfig: Record<string, unknown>): ActSdkConfig {
  const mode = rawConfig['mode'];
  const apiKeyFromConfig = rawConfig['apiKey'];
  const projectId = rawConfig['projectId'];
  const description = rawConfig['description'];
  const endpoint = rawConfig['endpoint'];

  if (mode !== 'cloud' && mode !== 'self-hosted') {
    throw new Error('Config "mode" must be either "cloud" or "self-hosted"');
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error('Config "description" must be a non-empty string');
  }
  if (endpoint !== undefined && typeof endpoint !== 'string') {
    throw new Error('Config "endpoint" must be a string when provided');
  }

  if (mode === 'self-hosted') {
    if (typeof endpoint !== 'string' || endpoint.length === 0) {
      throw new Error('Config "endpoint" must be a non-empty string in self-hosted mode');
    }
    if (apiKeyFromConfig !== undefined) {
      throw new Error('Config "apiKey" is not used in self-hosted mode');
    }
    if (projectId !== undefined) {
      throw new Error('Config "projectId" is not used in self-hosted mode');
    }

    return {
      mode,
      description,
      endpoint,
    };
  }

  const apiKey =
    typeof apiKeyFromConfig === 'string' && apiKeyFromConfig.length > 0
      ? apiKeyFromConfig
      : process.env['NEXT_PUBLIC_ACT_SDK_API_KEY'];

  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error(
      'Config "apiKey" must be a non-empty string or process.env reference (fallback: NEXT_PUBLIC_ACT_SDK_API_KEY)',
    );
  }
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Config "projectId" must be a non-empty string in cloud mode');
  }

  return {
    mode,
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

  const variableStatements = sourceFile
    .getVariableStatements()
    .filter((statement) => statement.isExported());

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

export async function loadConfig(configPath: string): Promise<ActSdkConfig> {
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

export function resolveProjectPath(projectPath?: string): string {
  return resolve(projectPath || process.cwd());
}

export function resolveConfigPath(projectPath: string, configPath?: string): string {
  if (!configPath) {
    return path.join(projectPath, 'act-sdk.config.ts');
  }

  return isAbsolute(configPath) ? configPath : resolve(projectPath, configPath);
}

function isActRegistration(callExpression: CallExpression): boolean {
  const expression = unwrapExpression(callExpression.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return false;

  const target = expression.getExpression().getText();
  const method = expression.getName();

  return target === 'act' && (method === 'action' || method === 'route');
}

function fileHasActRegistrations(sourceFile: SourceFile): boolean {
  return sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).some(isActRegistration);
}

function discoverRegistrationSourceFiles(projectPath: string): SourceFile[] {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  project.addSourceFilesAtPaths([
    path.join(projectPath, '**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}'),
    `!${path.join(projectPath, '**/node_modules/**')}`,
    `!${path.join(projectPath, '**/.next/**')}`,
    `!${path.join(projectPath, '**/dist/**')}`,
    `!${path.join(projectPath, '**/coverage/**')}`,
    `!${path.join(projectPath, '**/.turbo/**')}`,
  ]);

  return project
    .getSourceFiles()
    .filter(fileHasActRegistrations)
    .sort((a, b) => a.getFilePath().localeCompare(b.getFilePath()));
}

function isJsxLikeFilePath(filePath: string): boolean {
  return ['.jsx', '.tsx', '.ctsx', '.mtsx'].includes(path.extname(filePath));
}

function parsePrimitiveLiteral(expression: Expression): string | number | boolean | null | undefined {
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

  return undefined;
}

function parsePropertyName(property: Node): string | null {
  if (!Node.isPropertyAssignment(property)) {
    return null;
  }

  return property
    .getNameNode()
    .getText()
    .replace(/^['"]|['"]$/g, '');
}

function isNoopZodChain(method: string): boolean {
  return NOOP_ZOD_CHAIN_METHODS.has(method);
}

function parseStaticZodSchema(expression: Expression): ParsedStaticSchema | undefined {
  const value = unwrapExpression(expression);

  if (!Node.isCallExpression(value)) {
    return undefined;
  }

  const callee = unwrapExpression(value.getExpression());
  if (!Node.isPropertyAccessExpression(callee)) {
    return undefined;
  }

  const target = unwrapExpression(callee.getExpression());
  const method = callee.getName();
  const args = value.getArguments().filter(Node.isExpression);

  if (target.getText() === 'z') {
    switch (method) {
      case 'any':
      case 'unknown':
        return { schema: {} };
      case 'boolean':
        return { schema: { type: 'boolean' } };
      case 'null':
        return { schema: { type: 'null' } };
      case 'number':
        return { schema: { type: 'number' } };
      case 'string':
        return { schema: { type: 'string' } };
      case 'literal': {
        const [literalArg] = args;
        if (!literalArg) return undefined;
        const literalValue = parsePrimitiveLiteral(literalArg);
        if (literalValue === undefined) return undefined;
        return { schema: { const: literalValue } };
      }
      case 'enum': {
        const [enumArg] = args;
        const enumValuesArg = enumArg ? unwrapExpression(enumArg) : undefined;
        if (!enumValuesArg || !Node.isArrayLiteralExpression(enumValuesArg)) {
          return undefined;
        }

        const enumValues = enumValuesArg
          .getElements()
          .filter(Node.isExpression)
          .map((element: Expression) => parsePrimitiveLiteral(element))
          .filter((element): element is string => typeof element === 'string');

        if (enumValues.length === 0) return undefined;
        return { schema: { type: 'string', enum: enumValues } };
      }
      case 'array': {
        const [itemArg] = args;
        if (!itemArg) return undefined;
        const itemSchema = parseStaticZodSchema(itemArg);
        if (!itemSchema) return undefined;
        return { schema: { type: 'array', items: itemSchema.schema } };
      }
      case 'object': {
        const [shapeArg] = args;
        const shape = shapeArg ? unwrapExpression(shapeArg) : undefined;
        if (!shape || !Node.isObjectLiteralExpression(shape)) {
          return undefined;
        }

        const properties: Record<string, JsonSchema> = {};
        const required: string[] = [];

        for (const property of shape.getProperties()) {
          const key = parsePropertyName(property);
          if (!key || !Node.isPropertyAssignment(property)) {
            return undefined;
          }

          const initializer = property.getInitializer();
          if (!initializer || !Node.isExpression(initializer)) {
            return undefined;
          }

          const parsedPropertySchema = parseStaticZodSchema(initializer);
          if (!parsedPropertySchema) {
            return undefined;
          }

          properties[key] = parsedPropertySchema.schema;
          if (!parsedPropertySchema.optional) {
            required.push(key);
          }
        }

        const schema: JsonSchema = {
          type: 'object',
          properties,
          additionalProperties: false,
        };

        if (required.length > 0) {
          schema['required'] = required;
        }

        return { schema };
      }
      default:
        return undefined;
    }
  }

  const baseSchema = Node.isExpression(target) ? parseStaticZodSchema(target) : undefined;
  if (!baseSchema) {
    return undefined;
  }

  if (method === 'optional') {
    return { schema: baseSchema.schema, optional: true };
  }

  if (method === 'nullable') {
    return {
      schema: {
        anyOf: [baseSchema.schema, { type: 'null' }],
      },
      optional: baseSchema.optional,
    };
  }

  if (isNoopZodChain(method)) {
    return baseSchema;
  }

  return undefined;
}

function parseRequiredStringProperty(
  metaObject: ObjectLiteralExpression,
  key: 'id' | 'description' | 'path',
  filePath: string,
): string {
  const property = metaObject
    .getProperties()
    .find((candidate) => parsePropertyName(candidate) === key);

  if (!property || !Node.isPropertyAssignment(property)) {
    throw new Error(`Unsupported act.${key === 'path' ? 'route' : 'action'} metadata in ${filePath}: missing "${key}"`);
  }

  const initializer = property.getInitializer();
  if (!initializer || !Node.isExpression(initializer)) {
    throw new Error(`Unsupported act metadata in ${filePath}: "${key}" must be a string literal`);
  }

  const value = parsePrimitiveLiteral(initializer);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Unsupported act metadata in ${filePath}: "${key}" must be a non-empty string literal`);
  }

  return value;
}

function parseOptionalInputProperty(metaObject: ObjectLiteralExpression): {
  hasInput: boolean;
  inputSchema?: JsonSchema;
} {
  const property = metaObject
    .getProperties()
    .find((candidate) => parsePropertyName(candidate) === 'input');

  if (!property || !Node.isPropertyAssignment(property)) {
    return { hasInput: false };
  }

  const initializer = property.getInitializer();
  if (!initializer || !Node.isExpression(initializer)) {
    return { hasInput: true };
  }

  const parsed = parseStaticZodSchema(initializer);
  return {
    hasInput: true,
    inputSchema: parsed?.schema,
  };
}

function parseStaticRegistration(callExpression: CallExpression, filePath: string):
  | { kind: 'action'; entry: ActionManifest }
  | { kind: 'route'; entry: RouteManifest }
  | null {
  if (!isActRegistration(callExpression)) {
    return null;
  }

  const expression = unwrapExpression(callExpression.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) {
    return null;
  }

  const [metaArg] = callExpression.getArguments().filter(Node.isExpression);
  const metaObject = metaArg ? unwrapExpression(metaArg) : undefined;
  if (!metaObject || !Node.isObjectLiteralExpression(metaObject)) {
    return null;
  }

  const kind = expression.getName();
  const id = parseRequiredStringProperty(metaObject, 'id', filePath);
  const description = parseRequiredStringProperty(metaObject, 'description', filePath);
  const inputMeta = parseOptionalInputProperty(metaObject);

  if (kind === 'action') {
    return {
      kind,
      entry: {
        id,
        description,
        hasInput: inputMeta.hasInput,
        inputSchema: inputMeta.inputSchema,
      },
    };
  }

  return {
    kind: 'route',
    entry: {
      id,
      description,
      path: parseRequiredStringProperty(metaObject, 'path', filePath),
      hasInput: inputMeta.hasInput,
      inputSchema: inputMeta.inputSchema,
    },
  };
}

function addManifestEntry<T extends ActionManifest | RouteManifest>(
  entries: T[],
  seen: Map<string, { kind: 'action' | 'route'; source: string; serialized: string }>,
  kind: 'action' | 'route',
  entry: T,
  source: string,
) {
  const serialized = JSON.stringify(entry);
  const existing = seen.get(entry.id);

  if (!existing) {
    seen.set(entry.id, { kind, source, serialized });
    entries.push(entry);
    return;
  }

  if (existing.kind === kind && existing.serialized === serialized) {
    return;
  }

  throw new Error(
    `Duplicate ${kind} id "${entry.id}" discovered in ${source}. Already registered as ${existing.kind} in ${existing.source}`,
  );
}

function buildStaticManifest(sourceFiles: SourceFile[]): ManifestFile {
  const actions: ActionManifest[] = [];
  const routes: RouteManifest[] = [];
  const seen = new Map<string, { kind: 'action' | 'route'; source: string; serialized: string }>();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    for (const callExpression of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const registration = parseStaticRegistration(callExpression, filePath);
      if (!registration) continue;

      if (registration.kind === 'action') {
        addManifestEntry(actions, seen, 'action', registration.entry, filePath);
      } else {
        addManifestEntry(routes, seen, 'route', registration.entry, filePath);
      }
    }
  }

  return { actions, routes };
}

function mergeManifests(runtimeManifest: ManifestFile, staticManifest: ManifestFile): ManifestFile {
  const actions: ActionManifest[] = [];
  const routes: RouteManifest[] = [];
  const seen = new Map<string, { kind: 'action' | 'route'; source: string; serialized: string }>();

  for (const action of runtimeManifest.actions) {
    addManifestEntry(actions, seen, 'action', action, 'runtime act instance');
  }

  for (const route of runtimeManifest.routes) {
    addManifestEntry(routes, seen, 'route', route, 'runtime act instance');
  }

  for (const action of staticManifest.actions) {
    addManifestEntry(actions, seen, 'action', action, 'static JSX/TSX discovery');
  }

  for (const route of staticManifest.routes) {
    addManifestEntry(routes, seen, 'route', route, 'static JSX/TSX discovery');
  }

  return { actions, routes };
}

async function loadRuntimeAct(
  configPath: string,
  registrationFiles: string[],
): Promise<RuntimeActModule> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    jsx: true,
  });

  let mod: Record<string, unknown>;
  try {
    mod = await jiti.import<Record<string, unknown>>(configPath);
  } catch (error) {
    throw new Error(
      `Failed to import act module from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  const act = mod['act'];
  if (!act || typeof act !== 'object') {
    throw new Error(`Config module ${configPath} must export an "act" instance`);
  }

  for (const filePath of registrationFiles) {
    if (filePath === configPath) continue;
    try {
      await jiti.import(filePath);
    } catch (error) {
      throw new Error(
        `Failed to import discovered registration file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  const listActions = (act as RuntimeActModule).listActions;
  if (typeof listActions !== 'function') {
    throw new Error(`Exported "act" from ${configPath} must expose a listActions() method`);
  }

  return act as RuntimeActModule;
}

export async function buildManifest(projectPath: string, configPath: string): Promise<ManifestFile> {
  const sourceFiles = discoverRegistrationSourceFiles(projectPath);
  const executableFiles = sourceFiles
    .map((sourceFile) => sourceFile.getFilePath())
    .filter((filePath) => !isJsxLikeFilePath(filePath));
  const staticFiles = sourceFiles.filter((sourceFile) => isJsxLikeFilePath(sourceFile.getFilePath()));

  const act = await loadRuntimeAct(configPath, executableFiles);
  const actions = act.listActions();
  const routes = act.listRoutes?.() ?? [];

  if (!Array.isArray(actions)) {
    throw new Error(`act.listActions() from ${configPath} must return an array`);
  }
  if (!Array.isArray(routes)) {
    throw new Error(`act.listRoutes() from ${configPath} must return an array`);
  }

  return mergeManifests({ actions, routes }, buildStaticManifest(staticFiles));
}
