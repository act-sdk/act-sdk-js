import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ActSdkConfig } from '@act-sdk/core';
import { createServer } from '@act-sdk/mcp';

export interface StdioOptions {
  // Future options can go here
}

export async function createStdioServer(
  config: ActSdkConfig,
  options: StdioOptions = {},
): Promise<void> {
  const server = createServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error(`${config.name} MCP server running on stdio`);
}
