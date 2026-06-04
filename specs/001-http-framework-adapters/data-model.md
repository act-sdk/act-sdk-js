# Data Model: HTTP Framework Adapters

**Feature**: `001-http-framework-adapters`

## Entities

### AuthContext

| Field | Type | Notes |
|-------|------|-------|
| `[key: string]` | `unknown` | Extensible bag passed to action handlers as `context.authInfo` |

**Validation**: Auth callback returns non-null object or `null` (triggers 401). No schema enforced by adapter.

**Relationships**: Produced by adapter auth callback; consumed by `@act-sdk/mcp` `createServer` → action `handler` second argument.

---

### ExpressHandlerOptions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `auth` | `(req: express.Request) => Promise<AuthContext \| null>` | No | Mirrors issue #1; uses Express request for header access |

---

### HonoHandlerOptions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `auth` | `(c: Context) => Promise<AuthContext \| null>` | No | Mirrors issue #2; `c.req.header('authorization')` pattern |

---

### AdapterFactoryInputs

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `config` | `ActSdkConfig` | Yes | From `@act-sdk/core`; registry of actions |

---

## State transitions

### MCP HTTP request (per adapter)

```text
[HTTP Request]
    → (optional) auth callback
        → null → 401 Unauthorized JSON
        → AuthContext → createServer({ authInfo })
    → WebStandardStreamableHTTPServerTransport.handleRequest
    → Response to client
```

No persistent session state in adapters v1 (aligned with Next.js `sessionIdGenerator: undefined`).

---

## Package export map (logical)

| Subpath | Factory | Return shape |
|---------|---------|--------------|
| `@act-sdk/adapters/express` | `createExpressHandler` | Express middleware `(req, res, next?)` |
| `@act-sdk/adapters/hono` | `createHonoHandler` | Hono middleware handler |
| `@act-sdk/adapters/nextjs` | `createNextHandler` | `{ GET, POST, DELETE }` (unchanged) |
