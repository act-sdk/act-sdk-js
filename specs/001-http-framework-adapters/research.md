# Research: HTTP Framework Adapters

**Feature**: `001-http-framework-adapters`  
**Date**: 2026-06-04

## Decision: Shared Web Request handler core

**Rationale**: `packages/adapters/src/nextjs/index.ts` already implements the full MCP pipeline: optional auth → `createServer` → `WebStandardStreamableHTTPServerTransport` → `handleRequest(req: Request)`. Express and Hono differ only in how they obtain a `Request` and apply the resulting `Response`.

**Alternatives considered**:

- Duplicate logic in each adapter — rejected (drift risk vs Next.js 401/transport settings).
- Node-specific MCP transport for Express — rejected (constitution: Web Standards at the core; SDK provides `WebStandardStreamableHTTPServerTransport`).

**Implementation note**: Extract `createWebMcpHandler(config, options)` (internal, `packages/adapters/src/shared/` or similar) accepting `(req: Request) => Promise<Response>`. Next.js re-exports thin wrappers; Express/Hono bridge into it.

---

## Decision: Express ↔ Fetch bridge

**Rationale**: Express uses Node `IncomingMessage` / `ServerResponse`. Node 18+ exposes `Request` construction patterns; use a maintained bridge (e.g. `@whatwg-node/server` or Node's undici/fetch utilities) to convert incoming requests and write `Response` back to `res` without reimplementing MCP.

**Alternatives considered**:

- Custom minimal converter — rejected for maintenance and edge-case coverage (headers, body streams).
- Only support Express 5 native Request — rejected (peer range should include Express 4.x per ecosystem).

---

## Decision: Hono uses native Web Request

**Rationale**: Hono's `c.req.raw` is a standard `Request` on Workers and modern runtimes. Handler is middleware: `return createHonoHandler(...)(c)` forwards `c.req.raw` to shared core and returns `Response` via `c.newResponse` or equivalent.

**Alternatives considered**:

- Separate Worker-only export — rejected; one handler works when `raw` is Fetch-compatible.

---

## Decision: Peer dependencies

**Rationale**: Matches constitution III. Declare `express` and `hono` as optional peers with documented version ranges in README.

**Alternatives considered**:

- Bundling frameworks — rejected (bloat, version lock-in for stdio-only consumers).

---

## Decision: Per-request server lifecycle

**Rationale**: Next.js adapter creates `createServer` + transport per request today. New adapters keep that behavior for parity and to avoid session/state bugs until a deliberate performance optimization is specced.

**Alternatives considered**:

- Singleton server across requests — rejected without session model design (transport uses `sessionIdGenerator: undefined` but server registration is still per-call today).

---

## Decision: Mount paths from issues

**Rationale**: Issue #1 documents `app.use('/mcp', ...)`. Issue #2 documents `app.use('/mcp/*', ...)`. Document defaults; allow mount path via user routing (not hardcoded inside factory).

**Alternatives considered**:

- Unified `/mcp` only — rejected (Hono wildcard routing is idiomatic for subpaths).
