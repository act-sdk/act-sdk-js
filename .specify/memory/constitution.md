# Act SDK JS Constitution

## Core Principles

### I. Library-First, Minimal Surface

Every feature ships as a small, typed public API in `packages/*`. Prefer one obvious entry point per runtime (stdio, Next.js, Express, Hono). Avoid breaking changes without a changeset.

### II. Mirror Proven Adapters

New HTTP adapters MUST follow the established Next.js adapter contract: optional auth callback, 401 on failed auth, Streamable HTTP transport, and auth context passed into action handlers.

### III. Framework Peers, Not Bundled Runtimes

Framework packages (Express, Hono) are **peer dependencies**. The adapters package must not force-install a web framework for consumers who only use stdio or Next.js.

### IV. Web Standards at the Core

MCP HTTP handling uses `WebStandardStreamableHTTPServerTransport` and the Fetch `Request` / `Response` APIs. Framework-specific code is limited to bridging into that core.

### V. Testable, Documented Shipping

Public adapters require README examples matching GitHub issues, package `exports` entries, tsup build entries, and at least smoke-level tests or documented manual verification steps in the feature quickstart.

## Governance

- Constitution gates apply to `/speckit-plan` and `/speckit-implement`.
- Violations require explicit justification in the plan Complexity Tracking table.
- Amendments: update this file and bump the version note in the plan.

**Version**: 1.0.0 | **Ratified**: 2026-06-04 | **Last Amended**: 2026-06-04
