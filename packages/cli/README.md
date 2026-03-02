# @act-sdk/cli

Command-line tools for scaffolding and syncing Act SDK projects.

## Use Without Installing

```bash
npx @act-sdk/cli init
```

This only works after `@act-sdk/cli` has been published to npm.

## Local Development

```bash
pnpm --filter @act-sdk/cli run build
node packages/cli/dist/index.js init
```

If you want a global command locally:

```bash
cd packages/cli
npm link
act-sdk init
```

## Install Globally (Optional)

```bash
npm install -g @act-sdk/cli
act-sdk --help
```

## Commands

### `act-sdk init`

Scaffolds Act SDK files into your project and installs required dependencies.

```bash
act-sdk init
act-sdk init --skip-install
```

### `act-sdk add <component>`

Adds UI components (currently `agent`).

```bash
act-sdk add agent
```

### `act-sdk sync`

Extracts action definitions from your project and syncs them to your endpoint.

```bash
act-sdk sync
act-sdk sync --config ./act-sdk.config.ts --project .
```

## Required Config

`act-sdk sync` expects an `act-sdk.config.ts` (or `--config`) containing:

- `apiKey`
- `projectId`
- `description`
- optional `endpoint` (defaults to `https://act-sdk.dev`)
