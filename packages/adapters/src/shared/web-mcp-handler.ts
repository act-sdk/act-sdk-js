import type { ActSdkConfig } from '@act-sdk/core';
import { createServer } from '@act-sdk/mcp';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

export interface AuthContext {
  [key: string]: unknown;
}

export interface WebMcpHandlerOptions<TAuth extends AuthContext = AuthContext> {
  auth?: (req: Request) => Promise<TAuth | null>;
}

export function unauthorizedResponse(): Response {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Provide a valid Authorization: Bearer <token>.',
    },
    { status: 401 },
  );
}

export async function handleWebMcpRequest<TAuth extends AuthContext = AuthContext>(
  config: ActSdkConfig,
  req: Request,
  context: { authInfo?: TAuth } = {},
): Promise<Response> {
  const server = createServer(config, { authInfo: context.authInfo });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export function createWebMcpHandler<TAuth extends AuthContext = AuthContext>(
  config: ActSdkConfig,
  options: WebMcpHandlerOptions<TAuth> = {},
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    let authInfo: TAuth | undefined;

    if (options.auth) {
      const result = await options.auth(req);
      if (!result) {
        return unauthorizedResponse();
      }
      authInfo = result;
    }

    return handleWebMcpRequest(config, req, { authInfo });
  };
}
