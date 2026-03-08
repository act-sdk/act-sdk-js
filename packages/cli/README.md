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

Scaffolds `act-sdk.config.ts` and `providers/act-provider.tsx` into your project and installs required dependencies.

The generated config:
- exports `act` and `actSdkConfig`
- includes an explicit `endpoint`
- uses `process.env.NEXT_PUBLIC_ACT_SDK_API_KEY`

You can define actions anywhere in your app by importing `act` from `act-sdk.config.ts`.
The generated provider file imports `act` and `actSdkConfig` and wraps your app with `@act-sdk/react`.

```bash
act-sdk init
act-sdk init --skip-install
```

### `act-sdk add <component>`

Adds UI components (currently `command` for the Act command bar).

```bash
act-sdk add command
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
- optional `endpoint` (defaults to `https://www.act-sdk.dev`)

## Example: wiring the Act command bar

After running:

```bash
npx @act-sdk/cli init
npx @act-sdk/cli add command
```

you’ll have:

- `act-sdk.config.ts` exporting `act` and `actSdkConfig`
- `providers/act-provider.tsx` exporting `ActSdkProvider`
- `components/act-sdk/command.tsx` exporting `ActCommand`

Wrap your app once with the provider (for example in a Next.js root layout):

```tsx
'use client';

import type { ReactNode } from 'react';
import { ActSdkProvider } from '@/providers/act-provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ActSdkProvider>{children}</ActSdkProvider>
      </body>
    </html>
  );
}
```

Then mount the command bar so users can type natural-language intents (e.g. “delete user [email protected]”):

```tsx
import { ActCommand } from '@/components/act-sdk/command';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ActSdkProvider>
          {children}
          <ActCommand /> {/* ⌘K / Ctrl+K opens the command bar */}
        </ActSdkProvider>
      </body>
    </html>
  );
}
```

`ActCommand` internally uses `useAct()` from `@act-sdk/react`, so anything a user types (or selects from suggestions) is sent as an intent that can call your typed actions.
