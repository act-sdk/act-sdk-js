# Contract: `@act-sdk/adapters/hono`

## `createHonoHandler(config, options?)`

### Parameters

- `config: ActSdkConfig` — Act SDK configuration with registered actions.
- `options?: { auth?: (c: Context) => Promise<Record<string, unknown> | null> }`

### Returns

Hono-compatible handler for `app.use('/mcp/*', handler)` (or equivalent route registration).

### Behavior

- Accepts MCP Streamable HTTP via Web Standard `Request` (`c.req.raw`).
- Auth, 401 JSON, and `authInfo` propagation identical to Express/Next.js contracts.
- Must run on Node, Bun, and Cloudflare Workers when Hono is configured for those runtimes.

### Example (from issue #2)

```ts
import { Hono } from 'hono';
import { createHonoHandler } from '@act-sdk/adapters/hono';
import config from './act-sdk.config.js';

const app = new Hono();

app.use(
  '/mcp/*',
  createHonoHandler(config, {
    auth: async (c) => {
      const token = c.req.header('authorization')?.split(' ')[1];
      if (!token) return null;
      return verifyJWT(token);
    },
  }),
);

export default app;
```

### Peer dependency

- `hono`: `^4.0.0` (exact range to be set in `package.json` during implementation)
