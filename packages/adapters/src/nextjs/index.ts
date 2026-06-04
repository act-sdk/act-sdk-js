import type { ActSdkConfig } from '@act-sdk/core';
import {
  type AuthContext,
  createWebMcpHandler,
  type WebMcpHandlerOptions,
} from '../shared/web-mcp-handler.js';

export type { AuthContext };

export interface NextHandlerOptions<TAuth extends AuthContext = AuthContext>
  extends WebMcpHandlerOptions<TAuth> {}

export function createNextHandler<TAuth extends AuthContext = AuthContext>(
  config: ActSdkConfig,
  options: NextHandlerOptions<TAuth> = {},
) {
  const handleRequest = createWebMcpHandler(config, options);

  return {
    GET: handleRequest,
    POST: handleRequest,
    DELETE: handleRequest,
  };
}
