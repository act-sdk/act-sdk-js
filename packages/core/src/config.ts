export interface ActionConfig {
  id: string;
  description: string;
  hasInput?: boolean;
  inputSchema?: Record<string, unknown>; // JSON schema — zod gets converted at generate time
}

export const DEFAULT_ACT_API_ENDPOINT = 'https://act-sdk.dev';

export interface ActSdkConfig {
  apiKey: string;
  projectId: string;
  description: string;
  actions: ActionConfig[]; // plain objects, not functions
  restrictedRoutes?: string[];
  endpoint?: string;
}

export type ResolvedActSdkConfig = ActSdkConfig & {
  endpoint: string;
};

export function defineConfig(config: ActSdkConfig): ResolvedActSdkConfig {
  return {
    ...config,
    endpoint: config.endpoint ?? DEFAULT_ACT_API_ENDPOINT,
  };
}
