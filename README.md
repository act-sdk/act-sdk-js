# Act SDK

**The fastest way to add MCP to TypeScript apps.**

Act SDK is the simplest way to bring MCP into your application. It gives you everything you need to go from existing logic to a working MCP server in minutes. Expose existing functions as tools, integrate with frameworks like Next.js, Express, Hono, etc., and ship without building servers from scratch.

> Built on top of the [official Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk).

```ts
// your existing function
async function getDoughnuts({ userId, limit }: { userId: string; limit?: number }) {
  return db.doughnuts.findMany({ where: { userId }, take: limit ?? 10 });
}

// register it — now MCP-ready
export const getDoughnuts = act.action({
  id: 'getDoughnuts',
  description: 'Get doughnuts for a user',
  input: z.object({
    userId: z.string(),
    limit: z.number().optional(),
  }),
  handler: async ({ userId, limit }) => {
    return db.doughnuts.findMany({ where: { userId }, take: limit ?? 10 });
  },
});

// your app
await getDoughnuts({ userId: '123', limit: 5 });

// an MCP agent
// → calls getDoughnuts with { userId: '123', limit: 5 }
```

No new server. No separate process. No MCP knowledge required.

---

## Install

```bash
npx @act-sdk/cli init
```

Or manually:

```bash
npm install @act-sdk/core @act-sdk/mcp @act-sdk/adapters zod
```

## Next.js

**1. Wrap your existing logic** (`lib/actions/doughnuts.ts`):

```ts
import { z } from 'zod';
import { act } from '@/act-sdk.config';

export const getDoughnuts = act.action({
  id: 'getDoughnuts',
  description: 'Get doughnuts for the authenticated user',
  input: z.object({ limit: z.number().optional() }),
  handler: async ({ limit }, context) => {
    return db.doughnuts.findMany({
      where: { userId: context?.authInfo.userId },
      take: limit ?? 10,
    });
  },
});

export const orderDoughnut = act.action({
  id: 'orderDoughnut',
  description: 'Order a doughnut for the authenticated user',
  input: z.object({ flavour: z.string() }),
  handler: async ({ flavour }, context) => {
    return db.orders.create({
      data: { flavour, userId: context?.authInfo.userId },
    });
  },
});
```

**2. Config File** (`act-sdk.config.ts`):

```ts
import { createAct, defineConfig } from '@act-sdk/core';

export const act = createAct();

export default defineConfig({
  name: 'my-app',
  description: 'My app MCP server',
  version: '1.0.0',
  act,
});
```

**3. Add the route** (`app/api/mcp/route.ts`):

```ts
import { createNextHandler } from '@act-sdk/adapters/nextjs';
import config from '@/act-sdk.config';

export const { GET, POST, DELETE } = createNextHandler(config, {
  auth: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;
    return verifyJWT(token);
  },
});
```

## STDIO

```ts
import { createStdioServer } from '@act-sdk/adapters/stdio';
import config from './act-sdk.config.js';

createStdioServer(config);
```

---

## Packages

| Package             | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `@act-sdk/core`     | Action registry, `createAct()`, `defineConfig()` |
| `@act-sdk/mcp`      | Translates actions into MCP tools                |
| `@act-sdk/adapters` | Next.js and STDIO adapters                       |

---

## Coming Soon

Express, Hono, and Fastify adapters are on the roadmap. If you need one sooner, [open an issue](https://github.com/act-sdk/act-sdk-js/issues) and let us know — we prioritize based on demand.

---

MIT
