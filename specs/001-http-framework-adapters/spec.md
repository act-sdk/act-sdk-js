# Feature Specification: HTTP Framework Adapters (Express & Hono)

**Feature Branch**: `001-http-framework-adapters`

**Created**: 2026-06-04

**Status**: Draft

**Input**: GitHub issues [#1 Add Express adapter](https://github.com/act-sdk/act-sdk-js/issues/1) and [#2 Add Hono adapter](https://github.com/act-sdk/act-sdk-js/issues/2)

**Tracking**: Closes act-sdk/act-sdk-js#1, act-sdk/act-sdk-js#2

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Express MCP endpoint (Priority: P1)

An Express developer mounts Act SDK on an existing Node server so MCP clients can call registered actions over Streamable HTTP without running a separate MCP process.

**Why this priority**: Issue #1 is the first open enhancement; Express remains the most common Node HTTP stack for existing backends.

**Independent Test**: A minimal Express app with `app.use('/mcp', createExpressHandler(config, { auth }))` responds to MCP GET/POST/DELETE with tool listing and invocation when auth succeeds, and returns 401 when auth fails.

**Acceptance Scenarios**:

1. **Given** an Express app with a valid Act config and optional auth returning user context, **When** an MCP client sends an authenticated Streamable HTTP request to `/mcp`, **Then** the handler routes the request through MCP transport and action handlers receive `context.authInfo`.
2. **Given** auth is configured and returns `null`, **When** any MCP request hits the mount path, **Then** the response is 401 with the same unauthorized JSON shape as the Next.js adapter.
3. **Given** auth is omitted, **When** MCP requests arrive, **Then** tools run without auth context (same semantics as Next.js).

---

### User Story 2 - Hono MCP endpoint (Priority: P2)

A Hono developer mounts Act SDK on `app.use('/mcp/*', ...)` for Node, Bun, or Cloudflare Workers so the same actions are MCP-accessible at the edge or on a lightweight server.

**Why this priority**: Issue #2 extends reach to edge/worker deployments; API mirrors Express for consistency.

**Independent Test**: A Hono app using `createHonoHandler` on `/mcp/*` serves MCP over Streamable HTTP on Node and documents worker usage; auth and 401 behavior match Express/Next.js.

**Acceptance Scenarios**:

1. **Given** a Hono app with `createHonoHandler(config, { auth: async (c) => ... })`, **When** MCP traffic hits `/mcp/*`, **Then** requests are handled via Web Standard transport and auth context is passed to actions.
2. **Given** deployment on Cloudflare Workers or Bun, **When** the handler is mounted per quickstart, **Then** no Node-only APIs are required in the Hono adapter path (bridge uses `Request`/`Response`).
3. **Given** invalid or missing credentials when auth is enabled, **When** a request is processed, **Then** the client receives 401 with consistent error JSON.

---

### User Story 3 - Documentation parity (Priority: P3)

A developer reading `@act-sdk/adapters` documentation finds Express and Hono sections with copy-paste examples aligned with GitHub issues and the existing Next.js section.

**Why this priority**: Adapters are developer-facing; incomplete docs block adoption even if code ships.

**Independent Test**: README lists Express and Hono with install peers, mount paths, and auth examples; "Coming Soon" no longer lists these frameworks.

**Acceptance Scenarios**:

1. **Given** the adapters README, **When** a developer follows the Express example, **Then** import path `@act-sdk/adapters/express` and mount path `/mcp` match issue #1.
2. **Given** the adapters README, **When** a developer follows the Hono example, **Then** import path `@act-sdk/adapters/hono` and mount path `/mcp/*` match issue #2.

---

### Edge Cases

- Non-MCP HTTP methods or paths outside the mount should fall through (Express `next()`, Hono not matched) without breaking the host app.
- Large MCP payloads and streaming responses must not buffer entire bodies in memory beyond what the Web Standard transport already requires.
- Concurrent requests must each receive an isolated server/transport lifecycle consistent with the Next.js adapter (per-request `createServer` + connect + handle).
- Missing or malformed `Authorization` header when auth is enabled yields 401, not 500.
- Framework version skew: document supported Express 4+/5 and Hono 4+ as peers; incompatible versions fail at install/typecheck, not runtime surprises.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The package MUST export `createExpressHandler` from `@act-sdk/adapters/express` accepting `ActSdkConfig` and optional `{ auth?: (req) => Promise<AuthContext | null> }`.
- **FR-002**: Express integration MUST support mounting at a configurable path (default documented as `/mcp`) and handle GET, POST, and DELETE for Streamable HTTP MCP.
- **FR-003**: The package MUST export `createHonoHandler` from `@act-sdk/adapters/hono` accepting `ActSdkConfig` and optional `{ auth?: (c) => Promise<AuthContext | null> }` where `c` is Hono context.
- **FR-004**: Hono integration MUST support `/mcp/*` routing and Streamable HTTP MCP on Node, Bun, and Workers.
- **FR-005**: Both adapters MUST use `WebStandardStreamableHTTPServerTransport` with `enableJsonResponse: true` and the same session settings as the Next.js adapter unless research documents a required divergence.
- **FR-006**: Both adapters MUST pass resolved auth context into `createServer(config, { authInfo })` identically to Next.js.
- **FR-007**: Failed auth MUST return HTTP 401 with JSON `{ error: 'unauthorized', message: 'Provide a valid Authorization: Bearer <token>.' }`.
- **FR-008**: `express` and `hono` MUST be peer dependencies of `@act-sdk/adapters`, not bundled dependencies.
- **FR-009**: Package `exports`, tsup entries, and types MUST include `./express` and `./hono` subpaths.
- **FR-010**: CHANGELOG and adapters README MUST be updated for the new public APIs.

### Key Entities

- **AuthContext**: Extensible key-value auth payload attached to action handlers (same as Next.js).
- **Adapter handler options**: Optional `auth` callback; framework-specific request/context type.
- **Mounted MCP route**: HTTP surface where Streamable MCP is served (`/mcp` Express, `/mcp/*` Hono per issues).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can expose all registered Act actions over MCP on Express in under 15 minutes using only README/quickstart steps (install, mount, optional auth).
- **SC-002**: A developer can expose the same actions on Hono in under 15 minutes on Node and Workers using documented examples.
- **SC-003**: Auth-enabled deployments reject unauthenticated MCP calls with 401 in 100% of manual negative tests described in quickstart.
- **SC-004**: Published `@act-sdk/adapters` tarball includes `express` and `hono` entry points with TypeScript declarations verified by `pnpm typecheck` in the monorepo.
- **SC-005**: GitHub issues #1 and #2 acceptance examples compile against published types without modification beyond imports.

## Assumptions

- One feature delivers both adapters in a single release slice (shared HTTP core, one changeset on `@act-sdk/adapters`).
- Express auth callback receives Node `IncomingMessage` (or Express `Request`) as in issue #1; Hono auth receives Hono `Context` as in issue #2.
- No Fastify adapter in this feature (README may still mention Fastify as future work).
- Automated tests may be smoke-level (Node test runner) if full MCP client integration is heavy; quickstart documents manual MCP client verification.
- Internal extraction of shared request-handling logic from Next.js is allowed if it reduces duplication without changing the public Next.js API.
