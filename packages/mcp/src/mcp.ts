import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZodObject, type ZodTypeAny } from 'zod';
import type { ActSdkConfig, ActionContext } from '@act-sdk/core';

export interface ServerContext {
  authInfo?: unknown;
}

export type ContextProvider = () => ServerContext;

export function createServer(
  config: ActSdkConfig,
  contextOrProvider?: ServerContext | ContextProvider,
): McpServer {
  const server = new McpServer({
    name: config.name,
    description: config.description ?? `MCP Server for ${config.name}`,
    version: config.version ?? '1.0.0',
  });

  registerTools(server, config, contextOrProvider);

  return server;
}

export function registerTools(
  server: McpServer,
  config: ActSdkConfig,
  contextOrProvider?: ServerContext | ContextProvider,
): void {
  for (const action of config.act.getRegistry().all()) {
    const shape = getShape(action.input);

    server.registerTool(
      action.id,
      {
        description: action.description,
        inputSchema: shape,
      },
      async (args: unknown) => {
        try {
          const context =
            typeof contextOrProvider === 'function'
              ? contextOrProvider()
              : (contextOrProvider ?? {});

          const actionContext: ActionContext = {
            authInfo: context.authInfo,
          };

          const input = action.input ? action.input.safeParse(args) : null;

          if (input && !input.success) {
            return {
              content: [
                { type: 'text' as const, text: `Validation error: ${input.error.message}` },
              ],
              isError: true,
            };
          }

          const result = await action.handler(input ? input.data : args, actionContext);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          return {
            content: [{ type: 'text' as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }
}

function getShape(input?: ZodTypeAny): Record<string, ZodTypeAny> {
  if (!input) return {};
  if (input instanceof ZodObject) return input.shape;
  return {};
}
