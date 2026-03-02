# demo-next

Next.js demo app for local development of the Act SDK packages.

## Run Locally

From the repository root:

```bash
pnpm install
pnpm --filter demo-next dev
```

Or from this directory:

```bash
pnpm dev
```

## Build And Typecheck

```bash
pnpm build
pnpm typecheck
```

## Configuration

The demo uses `act-sdk.config.ts` with:

- `apiKey`
- `projectId`
- `description`
- `endpoint` (currently set to `http://localhost:3000` for local testing)

You can also set environment values in `.env`.
