# Act SDK JS

Monorepo for the JavaScript Act SDK:
- `@act-sdk/core`: action registry + config helpers.
- `@act-sdk/react`: React provider and `useAct` hook.
- `@act-sdk/cli`: CLI for `init`, `add`, and `sync`.
- `apps/demo-next`: working Next.js example app.

## Quick Start (Existing App)

Initialize Act SDK files and install required packages:

```bash
npx @act-sdk/cli init
```

Skip auto-install if needed:

```bash
npx @act-sdk/cli init --skip-install
```

Add the bundled Agent UI component:

```bash
npx @act-sdk/cli add agent
```

Sync discovered actions to your backend endpoint:

```bash
npx @act-sdk/cli sync
```

## Clone This Repository

```bash
git clone <your-github-repo-url>
cd act-sdk-js
pnpm install
```

## Local Development

```bash
pnpm typecheck
pnpm build
pnpm dev
```

Workspace scripts:
- `pnpm dev`: run all package/app dev tasks via Turbo.
- `pnpm build`: build all packages and apps.
- `pnpm typecheck`: run type-checking across the workspace.
- `pnpm clean`: clean Turbo outputs.

## Package Usage

### 1) Define actions with `@act-sdk/core`

```ts
import { createAct, defineConfig } from '@act-sdk/core';
import { z } from 'zod';

export const act = createAct();

export const addNumbers = act.action({
  id: 'calculator_add',
  description: 'Add two numbers',
  input: z.object({
    a: z.number(),
    b: z.number(),
  }),
})(async ({ a, b }) => {
  console.log(a + b);
});

export const actSdkConfig = defineConfig({
  apiKey: process.env.NEXT_PUBLIC_ACT_API_KEY!,
  projectId: 'proj_123',
  description: 'My application actions',
  endpoint: 'https://act-sdk.dev',
});
```

### 2) Wrap app with `@act-sdk/react`

```tsx
'use client';

import { ActProvider } from '@act-sdk/react';
import { act, actSdkConfig } from './act-sdk.config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ActProvider act={act} config={actSdkConfig}>
      {children}
    </ActProvider>
  );
}
```

### 3) Use the hook

```tsx
'use client';

import { useAct } from '@act-sdk/react';
import { useState } from 'react';

export function ChatBox() {
  const [prompt, setPrompt] = useState('');
  const { messages, send, status } = useAct();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(prompt);
        setPrompt('');
      }}
    >
      <input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button type="submit" disabled={status === 'streaming' || status === 'submitted'}>
        Send
      </button>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
    </form>
  );
}
```

## CLI Usage

Initialize SDK files in an existing app:

```bash
npx @act-sdk/cli init
```

`init` scaffolds config/action files and installs:
- `@act-sdk/core`
- `@act-sdk/react`
- `zod`

Add the bundled Agent UI component:

```bash
npx @act-sdk/cli add agent
```

Sync discovered actions to your backend endpoint:

```bash
# requires act-sdk.config.ts or custom --config path
npx @act-sdk/cli sync
```

Optional flags:

```bash
npx @act-sdk/cli sync --config ./act-sdk.config.ts --project .
```

## Notes

- The `sync` command supports these config styles:
  - `export default defineConfig({ ... })`
  - `export const actSdkConfig = defineConfig({ ... })`
  - `export const config = { ... }`
- `apiKey` can be a string literal or `process.env.MY_KEY`.

## Release

One-time setup:

```bash
pnpm add -Dw @changesets/cli
npm login
```

Release flow:

```bash
pnpm changeset
pnpm version-packages
pnpm build
pnpm release
```

Notes:
- Publish from `main` after CI is green.
- `.changeset/config.json` already ignores `demo-next`.
