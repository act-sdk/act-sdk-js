import type { ActSdkConfig } from '@act-sdk/core';
import { createServer } from '@act-sdk/mcp';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

export interface AuthContext {
  [key: string]: unknown;
}

export interface NextHandlerOptions<TAuth extends AuthContext = AuthContext> {
  auth?: (req: Request) => Promise<TAuth | null>;
}

export function createNextHandler<TAuth extends AuthContext = AuthContext>(
  config: ActSdkConfig,
  options: NextHandlerOptions<TAuth> = {},
) {
  let currentAuthInfo: TAuth | undefined;

  const server = createServer(config, () => ({ authInfo: currentAuthInfo }));

  const handleRequest = async (req: Request): Promise<Response> => {
    if (options.auth) {
      const result = await options.auth(req);
      if (!result) {
        return Response.json(
          {
            error: 'unauthorized',
            message: 'Provide a valid Authorization: Bearer <token>.',
          },
          { status: 401 },
        );
      }
      currentAuthInfo = result;
    } else {
      currentAuthInfo = undefined;
    }

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    return transport.handleRequest(req);
  };

  return {
    GET: handleRequest,
    POST: handleRequest,
    DELETE: handleRequest,
  };
}
