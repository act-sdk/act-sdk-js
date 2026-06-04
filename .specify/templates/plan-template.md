# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Summary

[Extract from feature spec]

## Technical Context

**Language/Version**: [e.g., TypeScript 5.7]

**Primary Dependencies**: [e.g., @modelcontextprotocol/sdk]

**Testing**: [e.g., node:test]

**Target Platform**: [e.g., Node 20+, Cloudflare Workers]

**Project Type**: monorepo library

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
packages/adapters/src/
├── nextjs/
├── express/
├── hono/
└── shared/   # if extracted
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
