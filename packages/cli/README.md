# @act-sdk/cli

CLI tools for setting up and working with Act SDK projects.

Use this package to:

- scaffold initial Act SDK files
- add the chat widget UI
- generate `act.manifest.json`
- sync discovered actions and routes to Act Cloud

## Run Without Installing

```bash
npx @act-sdk/cli init
```

## Commands

### `act-sdk init`

Scaffolds:

- `act-sdk.config.ts`
- `providers/act-provider.tsx`

It also installs the base dependencies for using Act SDK in a React app.

During setup you can choose:

- `Act cloud`
- `Self-hosted`

If you choose self-hosted, the CLI links you to:

- `https://act-sdk.dev/docs/self-hosted`

Self-hosted supports all AI SDK-compatible providers.
The React client expects your self-hosted backend at `${endpoint}/api/chat/actions`.
That endpoint should stream responses with `streamText` from the AI SDK, typically using `manifestToTools(manifest, { onToolCall })` from `@act-sdk/core` to build the `ToolSet` from `act.manifest.json`.
Your backend should also send clear system instructions, because the model only sees the definitions your app exposes and the instructions you provide.

```bash
act-sdk init
act-sdk init --skip-install
```

### `act-sdk add chat`

Adds the bundled chat widget component.

```bash
act-sdk add chat
```

### `act-sdk generate-manifest`

Scans your project for `act.action(...)` and `act.route(...)` definitions and writes `act.manifest.json`.

```bash
act-sdk generate-manifest
act-sdk generate-manifest --config ./act-sdk.config.ts --project .
```

### `act-sdk sync`

Scans your project for `act.action(...)` and `act.route(...)` definitions and syncs them to Act Cloud.

```bash
act-sdk sync
act-sdk sync --config ./act-sdk.config.ts --project .
```

`sync` currently supports cloud mode only.

## Discovery Model

The CLI does not require you to import all action files from `act-sdk.config.ts`.

Instead, it scans the project for supported `act.action(...)` and `act.route(...)` definitions when generating the manifest or syncing.

## Related Packages

- `@act-sdk/core` for defining actions, routes, and config
- `@act-sdk/react` for the provider and `useAct()`
