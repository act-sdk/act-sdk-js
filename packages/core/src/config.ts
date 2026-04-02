import { type ActInstance } from './act';

export interface ActConfig {
  name: string;
  description?: string;
  version?: string;
  act: ActInstance;
}

export function defineConfig(config: ActConfig): ActConfig {
  return config;
}
