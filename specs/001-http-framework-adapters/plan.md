# Implementation Plan: HTTP Framework Adapters

**Branch**: `001-http-framework-adapters` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-http-framework-adapters/spec.md`

## Summary

Add Express and Hono HTTP adapters to `@act-sdk/adapters`, closing GitHub issues #1 and #2. Extract shared Web Standard MCP request handling from the existing Next.js adapter, bridge Express `req`/`res` and Hono `Context` to `Request`/`Response`, declare framework peers, and document mount paths `/mcp` and `/mcp/*`.

## Technical Context

**Language/Version**: TypeScript 5.7, Node 20+

**Primary Dependencies**: `@act-sdk/core`, `@act-sdk/mcp`, `@modelcontextprotocol/sdk` (WebStandardStreamableHTTPServerTransport), peer `express`, peer `hono`

**Storage**: N/A

**Testing**: `node:test` smoke tests in `packages/adapters` (mirror `packages/core/test` style); manual MCP verification per [quickstart.md](./quickstart.md)

**Target Platform**: Node servers (Express), Node/Bun/Cloudflare Workers (Hono)

**Project Type**: pnpm monorepo library (`packages/adapters`)

**Performance Goals**: Parity with Next.js adapter (per-request server connect acceptable for v1)

**Constraints**: No bundled Express/Hono; no breaking changes to `@act-sdk/adapters/nextjs` or `./stdio` exports

**Scale/Scope**: Two new subpath exports, one shared internal module, README + CHANGELOG + changeset

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Library-First | PASS | `createExpressHandler`, `createHonoHandler` only |
| II. Mirror Next.js | PASS | Auth + 401 + transport settings aligned |
| III. Framework Peers | PASS | `express`, `hono` as peerDependencies |
| IV. Web Standards | PASS | Shared handler uses `Request`/`Response` transport |
| V. Testable, Documented | PASS | quickstart + contracts + README |

**Post-design re-check**: PASS — no violations requiring Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/001-http-framework-adapters/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── express-adapter.md
│   └── hono-adapter.md
├── checklists/
│   └── requirements.md
└── spec.md
```

### Source Code (repository root)

```text
packages/adapters/
├── src/
│   ├── shared/
│   │   └── web-mcp-handler.ts    # NEW: extract from nextjs
│   ├── nextjs/index.ts           # REFACTOR: delegate to shared
│   ├── express/index.ts          # NEW
│   ├── hono/index.ts             # NEW
│   ├── stdio/index.ts
│   └── index.ts                  # optional re-exports
├── package.json                  # exports + peerDependencies
├── tsup.config.ts                # express + hono entries
└── README.md
```

**Structure Decision**: All adapter code stays in `packages/adapters`; shared module avoids triplicating MCP wiring.

## Phase 0: Research

Completed in [research.md](./research.md). Key decisions: shared `Request` handler, Express bridge library, Hono `c.req.raw`, peer deps, per-request lifecycle.

## Phase 1: Design & Contracts

- [data-model.md](./data-model.md) — AuthContext, options types, request flow
- [contracts/](./contracts/) — public API for Express and Hono
- [quickstart.md](./quickstart.md) — verification steps

## Phase 2: Implementation Tasks

- [x] Extract shared web MCP handler from Next.js (`src/shared/web-mcp-handler.ts`)
- [x] Refactor Next.js adapter (no public API change)
- [x] Implement Express adapter + `express-bridge.ts`
- [x] Implement Hono adapter
- [x] Update `package.json` exports and peer dependencies
- [x] Update `tsup.config.ts` entry points
- [x] Add smoke tests in `packages/adapters/test/adapters.test.mjs`
- [x] Update README, CHANGELOG, changeset
- [x] `pnpm typecheck`, `pnpm build`, `pnpm --filter @act-sdk/adapters test`

## Complexity Tracking

> No constitution violations.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
