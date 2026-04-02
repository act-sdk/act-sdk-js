# Act SDK

Act SDK is an open source alternative to [Crow](https://usecrow.org) for building chat-controlled React apps.

It lets users navigate and operate your app in natural language, while your app stays in control through typed actions and routes.

Ask things like:

- "Where do I find billing?"
- "Update user user@gmail.com to admin"
- "Open the customer settings page"

Act SDK maps those requests to the same app behaviors your UI already uses, so the resulting changes happen as if the user had completed them through the interface directly.

## Self-Hosted

Act SDK supports self-hosted deployments and works with all AI SDK-compatible providers.

For self-hosted setups, the React client sends chat requests to:

- `${endpoint}/api/chat/actions`

So if your config uses:

```ts
defineConfig({
  mode: 'self-hosted',
  endpoint: 'https://your-act-server.example.com',
  description: 'My app actions and routes',
});
```

your backend should expose:

- `https://your-act-server.example.com/api/chat/actions`

That endpoint should return streamed text responses using `streamText` from the AI SDK.

Self-hosted docs:

- https://act-sdk.dev/docs/self-hosted

## How It Works

You register two things:

- `actions` for app mutations or tasks
- `routes` for navigation targets

Then your app exposes those capabilities to chat in a typed way.

The model only sees the definitions your app exposes plus the system instructions you provide on your backend.

Write explicit system instructions so the assistant knows:

- when to navigate
- when to call actions
- how cautious it should be
- what to do when required inputs are missing

## Example

```ts
import { createAct, defineConfig } from '@act-sdk/core';
import { z } from 'zod';

export const act = createAct();

export const updateUserRole = act.action({
  id: 'updateUserRole',
  description: 'Update a user role by email',
  input: z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']),
  }),
})(async ({ email, role }) => {
  // Call the same application logic your UI uses.
  await updateUserInDatabase(email, { role });
});

export const openBilling = act.route({
  id: 'openBilling',
  description: 'Open the billing settings page',
  path: '/settings/billing',
});

export const actSdkConfig = defineConfig({
  mode: 'self-hosted',
  endpoint: 'https://your-act-server.example.com',
  description: 'My app actions and routes',
});
```

If a user says `Update user user@gmail.com to admin`, the assistant can call `updateUserRole` with typed input, and your app performs the same update your normal settings UI would perform.

## React

```tsx
'use client';

import { ActProvider } from '@act-sdk/react';
import { useRouter } from 'next/navigation';
import { act, actSdkConfig } from './act-sdk.config';

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ActProvider act={act} config={actSdkConfig} onNavigate={({ path }) => router.push(path)}>
      {children}
    </ActProvider>
  );
}
```

## Backend

For self-hosted setups, your `/api/chat/actions` endpoint should stream responses back to the client.

Use `streamText` from `ai`, and use `manifestToTools()` to turn `act.manifest.json` into the tool definitions your backend exposes to the model.

```ts
import { streamText } from 'ai';
import { manifestToTools } from '@act-sdk/core';
import manifest from './act.manifest.json';

const tools = manifestToTools(manifest, {
  onToolCall: async ({ type, id, input, route }) => {
    if (type === 'action') {
      return {
        actionId: id,
        success: true,
        payload: input,
      };
    }

    return {
      routeId: id,
      success: true,
      payload: input,
      path: route?.path,
    };
  },
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: yourModel,
    messages,
    tools,
  });

  return result.toUIMessageStreamResponse();
}
```

## CLI

```bash
npx @act-sdk/cli init
npx @act-sdk/cli add chat
npx @act-sdk/cli generate-manifest
```

`generate-manifest` scans your project for `act.action(...)` and `act.route(...)` definitions and writes `act.manifest.json`.

## Packages

- [packages/core/README.md](/home/kupa/Desktop/projects/act-sdk-js/packages/core/README.md)
- [packages/react/README.md](/home/kupa/Desktop/projects/act-sdk-js/packages/react/README.md)
- [packages/cli/README.md](/home/kupa/Desktop/projects/act-sdk-js/packages/cli/README.md)
