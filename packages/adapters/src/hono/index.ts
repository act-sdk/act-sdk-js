import type { ActSdkConfig } from '@act-sdk/core';
import type { Context } from 'hono';
import {
  type AuthContext,
  handleWebMcpRequest,
  unauthorizedResponse,
} from '../shared/web-mcp-handler.js';

export type { AuthContext };

export interface HonoHandlerOptions<TAuth extends AuthContext = AuthContext> {
  auth?: (c: Context) => Promise<TAuth | null>;
}

export function createHonoHandler<TAuth extends AuthContext = AuthContext>(
  config: ActSdkConfig,
  options: HonoHandlerOptions<TAuth> = {},
) {
  return async (c: Context): Promise<Response> => {
    let authInfo: TAuth | undefined;

    if (options.auth) {
      const result = await options.auth(c);
      if (!result) {
        return unauthorizedResponse();
      }
      authInfo = result;
    }

    return handleWebMcpRequest(config, c.req.raw, { authInfo });
  };
}
