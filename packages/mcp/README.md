# @act-sdk/mcp

Translate Act SDK actions into MCP tools.

## What is this?

Converts your Act SDK action registry into an MCP server. Usually used via adapters, not directly.

## Installation

```bash
npm install @act-sdk/mcp @act-sdk/core
```

## Usage

```typescript
import { createServer, registerTools } from '@act-sdk/mcp';
import config from './act-sdk.config';

// Create MCP server from config
const server = createServer(config);

// Or register tools on existing server
const server = new McpServer({ 
  name: 'my-app', 
  description: 'My server' 
});
registerTools(server, config);
```

## With Authentication Context

Pass auth context to all tool handlers:

```typescript
import { createServer } from '@act-sdk/mcp';

// Static context
const server = createServer(config, { 
  authInfo: { userId: '123' } 
});

// Dynamic context (called per request)
const server = createServer(config, () => ({ 
  authInfo: getCurrentUser() 
}));
```

## API

### `createServer(config, contextOrProvider?)`

Create an MCP server from your Act SDK config.

**Parameters:**
- `config` - ActSdkConfig with your action registry
- `contextOrProvider` - Optional auth context or provider function

**Returns:** `McpServer` instance

### `registerTools(server, config, contextOrProvider?)`

Register actions as MCP tools on an existing server.

**Parameters:**
- `server` - Existing MCP server instance
- `config` - ActSdkConfig with your action registry
- `contextOrProvider` - Optional auth context or provider function

## How It Works

Each registered action becomes an MCP tool:
- Action `id` → tool name
- Action `description` → tool description
- Action `input` schema → tool input schema
- Validates input with Zod before calling handler
- Passes context to handler for auth/request data

## Direct Usage Not Recommended

Most users should use **@act-sdk/adapters** instead:
- `@act-sdk/adapters/stdio` - For CLI tools
- `@act-sdk/adapters/nextjs` - For Next.js apps

These adapters call `createServer()` internally with proper transport setup.

## License

MIT
