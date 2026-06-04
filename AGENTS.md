# Act SDK JS — Agent Context

<!-- SPECKIT START -->

**Active feature plan**: [specs/001-http-framework-adapters/plan.md](specs/001-http-framework-adapters/plan.md)

**Feature spec**: [specs/001-http-framework-adapters/spec.md](specs/001-http-framework-adapters/spec.md)

**Constitution**: [.specify/memory/constitution.md](.specify/memory/constitution.md)

<!-- SPECKIT END -->

## Repository

- pnpm monorepo; packages: `core`, `mcp`, `adapters`, `cli`
- MCP HTTP adapters use `WebStandardStreamableHTTPServerTransport`
- Existing reference adapter: `packages/adapters/src/nextjs/index.ts`

## Open GitHub work

- [#1 Express adapter](https://github.com/act-sdk/act-sdk-js/issues/1)
- [#2 Hono adapter](https://github.com/act-sdk/act-sdk-js/issues/2)
