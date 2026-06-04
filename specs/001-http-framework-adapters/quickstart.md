# Quickstart: HTTP Framework Adapters

Verify Express and Hono adapters after implementation.

## Prerequisites

- Monorepo built: `pnpm build`
- Sample `act-sdk.config` with at least one `act.action` registered
- MCP client or `curl` familiar with Streamable HTTP MCP (or use existing Next.js test flow as reference)

## Express

```bash
cd packages/adapters
pnpm add -D express @types/express
```

```ts
// examples/express-mcp.ts (add during implementation)
import express from 'express';
import { createExpressHandler } from '@act-sdk/adapters/express';
import config from '../path/to/act-sdk.config.js';

const app = express();
app.use('/mcp', createExpressHandler(config));
app.listen(3456, () => console.log('http://localhost:3456/mcp'));
```

**Verify**

1. Start server; MCP GET/POST to `http://localhost:3456/mcp` returns protocol responses (not 404).
2. Enable auth callback returning `null` → 401 with unauthorized JSON.
3. Enable auth returning `{ userId: 'test' }` → tool handler reads `context.authInfo`.

## Hono (Node)

```bash
pnpm add -D hono @hono/node-server
```

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createHonoHandler } from '@act-sdk/adapters/hono';
import config from '../path/to/act-sdk.config.js';

const app = new Hono();
app.use('/mcp/*', createHonoHandler(config));
serve({ fetch: app.fetch, port: 3457 });
```

**Verify**: Same three checks as Express on port 3457.

## Hono (Workers)

Deploy minimal worker with `app.use('/mcp/*', createHonoHandler(config))` per Hono Workers docs.

**Verify**: MCP endpoint responds without Node-only imports in the adapter bundle.

## Negative tests

| Case | Expected |
|------|----------|
| Auth enabled, no `Authorization` header | 401 |
| Wrong mount path | 404 (host app) |
| Valid token / auth context | 200-level MCP response |

## Done checklist

- [ ] `pnpm typecheck` passes in `packages/adapters`
- [ ] README examples match issues #1 and #2
- [ ] Changeset added for `@act-sdk/adapters` minor bump
