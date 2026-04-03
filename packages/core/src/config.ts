import type { ActSdkInstance } from './act';

export interface ActSdkConfig {
  name: string;
  description?: string;
  version?: string;
  act: ActSdkInstance;
}

export function defineConfig(config: ActSdkConfig): ActSdkConfig {
  return config;
}
