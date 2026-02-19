import { createContext, useContext } from 'react';
import type { ActSdkContextValue } from './types';

export const ActSdkContext = createContext<ActSdkContextValue | null>(null);
export const ActContext = ActSdkContext;

export function useActSdkContext(): ActSdkContextValue {
  const ctx = useContext(ActSdkContext);
  if (!ctx) {
    throw new Error('[act] useAct must be used inside <ActSdkProvider>');
  }
  return ctx;
}

export const useActContext = useActSdkContext;
