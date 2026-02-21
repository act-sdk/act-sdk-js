import type { ActSdkConfig } from '@act-sdk/core';
import type { ActSdkInstance } from '@act-sdk/core';

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
