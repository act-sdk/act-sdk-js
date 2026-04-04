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
  const handleRequest = async (req: Request): Promise<Response> => {
    let authInfo: TAuth | undefined;

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
      authInfo = result;
    }

    const server = createServer(config, { authInfo });

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
