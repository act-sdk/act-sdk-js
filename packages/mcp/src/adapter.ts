import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ActSdkInstance, ActionManifest } from '@act-sdk/core';

export interface McpServerOptions {
  name: string;
  version: string;
  description?: string;
}

/**
 * Convert Act SDK actions to MCP tools format
 */
function actionsToMcpTools(actions: ActionManifest[]) {
  return actions.map((action) => ({
    name: action.id,
    description: action.description,
    inputSchema: action.inputSchema || {
      type: 'object',
      properties: {},
    },
  }));
}

/**
 * Create an MCP server from an Act SDK instance
 * Handles all MCP protocol details under the hood
 */
export function createMcpServer(actInstance: ActSdkInstance, options: McpServerOptions) {
  const server = new Server(
    {
      name: options.name,
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Handle list_tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const actions = actInstance.list();
    return {
      tools: actionsToMcpTools(actions),
    };
  });

  // Handle call_tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!actInstance.has(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await actInstance.run(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start an MCP server over stdio transport
 */
export async function startMcpServer(actInstance: ActSdkInstance, options: McpServerOptions) {
  const server = createMcpServer(actInstance, options);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}

export type McpServer = ReturnType<typeof createMcpServer>;
