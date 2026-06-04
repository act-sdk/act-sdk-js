# @act-sdk/adapters

## Unreleased

### Minor Changes

- Add `@act-sdk/adapters/express` with `createExpressHandler` for Streamable HTTP MCP on Express
- Add `@act-sdk/adapters/hono` with `createHonoHandler` for Streamable HTTP MCP on Hono (Node, Bun, Workers)
- Extract shared Web Standard MCP handler used by Next.js, Express, and Hono adapters

## 3.0.1

### Patch Changes

- fix the trasnport issue in nextjs adapter
- Updated dependencies
  - @act-sdk/core@3.0.1
  - @act-sdk/mcp@3.0.1

## 3.0.0

### Major Changes

- this release is the initial release for mcp support and migration from react support

### Patch Changes

- Updated dependencies
  - @act-sdk/core@3.0.0
  - @act-sdk/mcp@3.0.0
