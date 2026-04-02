# @act-sdk/mcp

MCP (Model Context Protocol) adapter for Act SDK.

## Overview

This package provides utilities to convert Act SDK actions into MCP tools, enabling seamless integration with MCP-compatible systems.

## Installation

```bash
pnpm add @act-sdk/mcp @act-sdk/core
```

## Usage

```typescript
import { createAct } from '@act-sdk/core';
import { actToMcp } from '@act-sdk/mcp';
import { z } from 'zod';

// Create and register actions
const act = createAct();

act.action(
  {
    id: 'greet',
    description: 'Greet a user',
    input: z.object({
      name: z.string(),
    }),
  },
  async ({ name }) => {
    return `Hello, ${name}!`;
  }
);

// Convert to MCP
const mcp = actToMcp(act);

// Use MCP tools
console.log(mcp.tools); // List of MCP tool definitions
await mcp.callTool('greet', { name: 'World' }); // Call a tool
```

## API

### `actToMcp(actInstance: ActSdkInstance)`

Converts an Act SDK instance to an MCP adapter.

**Returns:** `McpAdapter` with:
- `tools`: Array of MCP tool definitions
- `callTool(name: string, args: unknown)`: Function to execute a tool

## License

MIT
