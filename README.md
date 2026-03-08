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

Add the bundled Act command bar:

```bash
npx @act-sdk/cli add command
```

Sync discovered actions to your backend endpoint:

```bash
npx @act-sdk/cli sync
```

## Clone This Repository

```bash
git clone https://github.com/act-sdk/act-sdk-js
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

export const deleteUser = act.action({
  id: 'delete_user',
  description: 'Delete a user by email',
  input: z.object({
    email: z.string().email(),
  }),
})(async ({ email }) => {
  // Replace with your own deletion logic
  console.log('Deleting user', email);
});

export const actSdkConfig = defineConfig({
  apiKey: process.env.NEXT_PUBLIC_ACT_API_KEY!,
  projectId: 'proj_123',
  description: 'My application actions',
  endpoint: 'https://www.act-sdk.dev',
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

### 3) Use the hook in a command bar

```tsx
'use client';

import { useAct } from '@act-sdk/react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useEffect, useRef, useState } from 'react';

const EXAMPLE_PROMPTS = [
  'Delete user [email protected]',
  'Refund the last payment',
  'Suspend user [email protected]',
];

export function ActCommand() {
  const { messages, send, status } = useAct();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const commandRef = useRef<HTMLDivElement>(null);
  const loading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open) {
      const inputEl = commandRef.current?.querySelector<HTMLInputElement>('input');
      setTimeout(() => inputEl?.focus(), 150);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || loading) return;
    send(value);
    setInput('');
  }

  function handleSuggestionClick(prompt: string) {
    if (loading) return;
    send(prompt);
  }

  return (
    <>
      {/* Your dialog/shell here if desired */}
      <div ref={commandRef}>
        <Command>
          <form onSubmit={handleSubmit}>
            <CommandInput
              value={input}
              onValueChange={setInput}
              placeholder="Type what you want to do..."
              aria-label="Ask in natural language"
              disabled={loading}
            />
          </form>
          <CommandList>
            <CommandEmpty>Type what you want to do…</CommandEmpty>
            <CommandGroup heading="Suggestions">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <CommandItem
                  key={prompt}
                  onSelect={() => handleSuggestionClick(prompt)}
                >
                  <span>{prompt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </>
  );
}
```

## CLI Usage

Initialize SDK files in an existing app:

```bash
npx @act-sdk/cli init
```

`init` scaffolds `act-sdk.config.ts` and `providers/act-provider.tsx`, then installs:

- `@act-sdk/core`
- `@act-sdk/react`
- `zod`

The generated config exports both `act` and `actSdkConfig`, includes `endpoint`, and uses `process.env.NEXT_PUBLIC_ACT_SDK_API_KEY`.
Define your actions anywhere in your app by importing `act` from `act-sdk.config.ts`.

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
pnpm release:dry-run
pnpm release
```

Notes:

- Publish from `main` after CI is green.
- `.changeset/config.json` already ignores `demo-next`.
- `pnpm changeset` is the step where you pick which packages to bump and whether each one is a `patch`, `minor`, or `major`.
- `pnpm version-packages` applies the version bump to `package.json`, updates changelogs, and refreshes `pnpm-lock.yaml`.
- `pnpm release` publishes in dependency order: `@act-sdk/core`, then `@act-sdk/react`, then `@act-sdk/cli`.
