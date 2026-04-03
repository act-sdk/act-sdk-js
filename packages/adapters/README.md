# @act-sdk/adapters

MCP adapters for STDIO and Next.js.

## What is this?

Adapters that run your Act SDK actions as MCP servers in different environments. Choose the adapter that matches where your app runs.

## Installation

```bash
npm install @act-sdk/adapters
```

## STDIO Adapter

For CLI tools and terminal applications.

```typescript
import { createStdioServer } from '@act-sdk/adapters/stdio';
import config from './act-sdk.config';

createStdioServer(config);
```

**When to use:** Building MCP servers that communicate over stdin/stdout (most common for desktop AI apps like Claude Desktop).

**Example:** `server.ts`
```typescript
import { createStdioServer } from '@act-sdk/adapters/stdio';
import config from './act-sdk.config';

createStdioServer(config);
```

Then in your Claude Desktop config:
```json
{
  "mcpServers": {
    "my-app": {
      "command": "node",
      "args": ["./dist/server.js"]
    }
  }
}
```

## Next.js Adapter

For Next.js App Router applications.

```typescript
import { createNextHandler } from '@act-sdk/adapters/nextjs';
import config from '@/act-sdk.config';

export const { GET, POST, DELETE } = createNextHandler(config, {
  auth: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;
    
    const user = await verifyToken(token);
    return { userId: user.id };
  },
});
```

**When to use:** Exposing MCP tools via HTTP in Next.js apps.

**Example:** `app/api/mcp/route.ts`
```typescript
import { createNextHandler } from '@act-sdk/adapters/nextjs';
import config from '@/act-sdk.config';

export const { GET, POST, DELETE } = createNextHandler(config, {
  auth: async (req) => {
    // Extract and verify auth token
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;
    
    // Return auth context (passed to action handlers)
    return verifyJWT(token);
  },
});
```

### Authentication

The `auth` function:
- Runs on every request
- Returns auth context or `null`
- If `null`, returns 401 Unauthorized
- Auth context is passed to action handlers as `context.authInfo`

```typescript
// In your action
export const getProfile = act.action({
  id: 'getProfile',
  description: 'Get user profile',
  handler: async (args, context) => {
    const userId = context?.authInfo?.userId;
    return db.users.findOne({ id: userId });
  },
});
```

## API

### `createStdioServer(config, options?)`

Creates an MCP server on stdio.

**Parameters:**
- `config` - Your Act SDK config
- `options` - (Future use)

**Returns:** `Promise<void>`

### `createNextHandler(config, options?)`

Creates Next.js route handlers.

**Parameters:**
- `config` - Your Act SDK config
- `options.auth?` - Auth function `(req: Request) => Promise<AuthContext | null>`

**Returns:** `{ GET, POST, DELETE }` route handlers

## Coming Soon

Express, Hono, and Fastify adapters are on the roadmap.

## License

MIT
