import type { ActSdkConfig } from '@act/core';
import type { ActSdkInstance } from '@act/core';

export interface ActSdkContextValue {
  act: ActSdkInstance;
  config: ActSdkConfig;
}
export interface ActionToolOutput {
  actionId: string;
  status: 'success' | 'error';
  message: string;
  payload: unknown;
  timestamp: string;
}
export type ActContextValue = ActSdkContextValue;
