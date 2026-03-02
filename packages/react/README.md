# @act-sdk/react

React bindings for Act SDK, including a provider and the `useAct` hook.

## Install

```bash
npm install @act-sdk/react @act-sdk/core ai @ai-sdk/react zod
```

## Setup

Wrap your app with `ActProvider` (alias of `ActSdkProvider`):

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

Use `useAct()` in client components:

```tsx
'use client';

import { useAct } from '@act-sdk/react';

export function Chat() {
  const { messages, status, send, clearMessages } = useAct();

  return (
    <>
      <button onClick={() => send('Add 1 and 2')}>Send</button>
      <button onClick={clearMessages}>Clear</button>
      <div>{status}</div>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
    </>
  );
}
```

## Notes

- Configure endpoint via `config.endpoint`.
- The hook sends requests to `\${endpoint}/api/chat/actions`.
- Required config values: `apiKey`, `projectId`, and `description`.
