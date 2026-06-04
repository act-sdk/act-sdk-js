# Contract: `@act-sdk/adapters/express`

## `createExpressHandler(config, options?)`

### Parameters

- `config: ActSdkConfig` — Act SDK configuration with registered actions.
- `options?: { auth?: (req: express.Request) => Promise<Record<string, unknown> | null> }`

### Returns

Express middleware function compatible with `app.use(path, handler)`.

### Behavior

- Handles **GET**, **POST**, and **DELETE** for MCP Streamable HTTP on the mounted path.
- When `options.auth` is provided and resolves to `null`, responds with **401** and body:

```json
{
  "error": "unauthorized",
  "message": "Provide a valid Authorization: Bearer <token>."
}
```

- When auth succeeds, `authInfo` is available on action handlers via MCP context.
- Uses Streamable HTTP transport with JSON response mode enabled (same as Next.js adapter).

### Example (from issue #1)

```ts
import express from 'express';
import { createExpressHandler } from '@act-sdk/adapters/express';
import config from './act-sdk.config.js';

const app = express();

app.use(
  '/mcp',
  createExpressHandler(config, {
    auth: async (req) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return null;
      return verifyJWT(token);
    },
  }),
);

app.listen(3000);
```

### Peer dependency

- `express`: `^4.21.0 || ^5.0.0` (exact range to be set in `package.json` during implementation)
