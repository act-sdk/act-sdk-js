# @act-sdk/core

Core primitives for defining and running Act SDK actions.

## Install

```bash
npm install @act-sdk/core zod
```

## What It Exports

- `createAct()`: creates an action registry.
- `defineConfig()`: defines and types your SDK config.
- `DEFAULT_ACT_SDK_API_ENDPOINT`: default API endpoint.

## Quick Example

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

export const config = defineConfig({
  apiKey: process.env.ACT_API_KEY!,
  projectId: 'proj_123',
  description: 'My Act actions',
  endpoint: 'https://www.act-sdk.dev',
});
```

## Config Shape

```ts
type ActSdkConfig = {
  apiKey: string;
  projectId: string;
  description: string;
  endpoint?: string;
};
```

If `endpoint` is omitted, the SDK uses `https://www.act-sdk.dev`.
