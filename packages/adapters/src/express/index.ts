import type { ActSdkConfig } from '@act-sdk/core';
import type { NextFunction, Request, Response } from 'express';
import {
  isMcpMethod,
  toFetchRequest,
  writeFetchResponse,
} from '../shared/express-bridge.js';
import {
  type AuthContext,
  handleWebMcpRequest,
  unauthorizedResponse,
} from '../shared/web-mcp-handler.js';

export type { AuthContext };

export interface ExpressHandlerOptions<TAuth extends AuthContext = AuthContext> {
  auth?: (req: Request) => Promise<TAuth | null>;
}

export function createExpressHandler<TAuth extends AuthContext = AuthContext>(
  config: ActSdkConfig,
  options: ExpressHandlerOptions<TAuth> = {},
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isMcpMethod(req.method)) {
      next();
      return;
    }

    try {
      let authInfo: TAuth | undefined;

      if (options.auth) {
        const result = await options.auth(req);
        if (!result) {
          await writeFetchResponse(res, unauthorizedResponse());
          return;
        }
        authInfo = result;
      }

      const fetchReq = toFetchRequest(req);
      const fetchRes = await handleWebMcpRequest(config, fetchReq, { authInfo });
      await writeFetchResponse(res, fetchRes);
    } catch (error) {
      next(error);
    }
  };
}
