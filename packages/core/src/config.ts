export const DEFAULT_ACT_SDK_API_ENDPOINT = 'https://act-sdk.dev';

export interface ActSdkConfig {
  apiKey: string;
  projectId: string;
  description: string;
  endpoint?: string;
}

export type ResolvedActSdkConfig = ActSdkConfig & {
  endpoint: string;
};

export function defineConfig(config: ActSdkConfig): ResolvedActSdkConfig {
  return {
    ...config,
    endpoint: config.endpoint ?? DEFAULT_ACT_SDK_API_ENDPOINT,
  };
}
