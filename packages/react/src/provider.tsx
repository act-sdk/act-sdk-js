import { type ReactNode } from 'react';
import { DEFAULT_ACT_API_ENDPOINT } from '@act/core';
import type { ActSdkConfig, ActSdkInstance } from '@act/core';
import { ActSdkContext } from './context';

export interface ActSdkProviderProps {
  act: ActSdkInstance;
  config: ActSdkConfig;
  /**
   * @deprecated Prefer `config.endpoint`.
   */
  endpoint?: string;
  children: ReactNode;
}

export type ActProviderProps = ActSdkProviderProps;

export function ActSdkProvider({
  act,
  config,
  endpoint,
  children,
}: ActSdkProviderProps) {
  const resolvedConfig: ActSdkConfig = {
    ...config,
    endpoint: config.endpoint ?? endpoint ?? DEFAULT_ACT_API_ENDPOINT,
  };

  return <ActSdkContext.Provider value={{ act, config: resolvedConfig }}>{children}</ActSdkContext.Provider>;
}

export const ActProvider = ActSdkProvider;
