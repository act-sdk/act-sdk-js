// packages/core/src/config.ts

import { type ActSDKConfig, type ResolvedActSDKConfig } from './types';

export function defineConfig(config: ActSDKConfig): ResolvedActSDKConfig {
  return {
    endpoint: 'https://api.act-sdk.dev',
    ...config,
  };
}

export interface LoadActSDKConfigOptions {
  cwd?: string;
  fileNames?: string[];
}

export const DEFAULT_ACT_SDK_CONFIG_FILE_NAMES = [
  'act-sdk.config.ts',
  'act-sdk.config.mts',
  'act-sdk.config.js',
  'act-sdk.config.mjs',
  'act-sdk.config.cjs',
] as const;

export async function loadConfig(
  options: LoadActSDKConfigOptions = {},
): Promise<ResolvedActSDKConfig> {
  const cwd = options.cwd ?? (globalThis as { process?: { cwd?: () => string } }).process?.cwd?.();
  if (!cwd) {
    throw new Error(
      'Could not determine cwd. Pass `cwd` to loadConfig({ cwd }) in non-Node runtimes.',
    );
  }

  const fileNames = options.fileNames ?? [...DEFAULT_ACT_SDK_CONFIG_FILE_NAMES];
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<any>;

  const pathModule = (await dynamicImport('node:path')) as {
    resolve: (...segments: string[]) => string;
  };
  const urlModule = (await dynamicImport('node:url')) as {
    pathToFileURL: (path: string) => { href: string };
  };
  const fsPromisesModule = (await dynamicImport('node:fs/promises')) as {
    access: (path: string) => Promise<void>;
  };

  let configPath: string | undefined;
  for (const fileName of fileNames) {
    const candidate = pathModule.resolve(cwd, fileName);
    try {
      await fsPromisesModule.access(candidate);
      configPath = candidate;
      break;
    } catch {
      // continue searching
    }
  }

  if (!configPath) {
    throw new Error(
      `No Act SDK config file found in "${cwd}". Looked for: ${fileNames.join(', ')}`,
    );
  }

  const moduleUrl = urlModule.pathToFileURL(configPath).href;
  const imported = (await dynamicImport(moduleUrl)) as { default?: unknown };
  const loadedConfig = imported.default;

  if (!loadedConfig || typeof loadedConfig !== 'object') {
    throw new Error(
      `Invalid Act SDK config in "${configPath}". Export a default object via defineConfig(...).`,
    );
  }

  return defineConfig(loadedConfig as ActSDKConfig);
}
