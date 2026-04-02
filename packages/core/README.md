# @act-sdk/core

Simple action registry for building extensible applications.

## Overview

`@act-sdk/core` provides a lightweight registry pattern for defining and executing actions with type-safe input validation using Zod schemas.

## Install

```bash
npm install @act-sdk/core zod
```

Supports Zod v3.25+ and Zod v4.

## Example

```ts
import { createAct } from '@act-sdk/core';
import { z } from 'zod';

const act = createAct();

// Register an action
act.action(
  {
    id: 'updateUserRole',
    description: 'Update a user role by email',
    input: z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'member']),
    }),
  },
  async ({ email, role }) => {
    await updateUserInDatabase(email, { role });
    return { success: true };
  }
);

// Execute an action
await act.run('updateUserRole', {
  email: 'user@example.com',
  role: 'admin',
});

// List all registered actions
const actions = act.list();
console.log(actions); // [{ id: 'updateUserRole', description: '...', ... }]

// Check if an action exists
if (act.has('updateUserRole')) {
  // ...
}
```

## API

### `createAct()`

Creates a new Act SDK instance with an action registry.

**Returns:** `ActSdkInstance` with the following methods:

#### `action(meta, handler)`

Register a new action.

- `meta`: Action metadata including `id`, `description`, and optional `input` schema
- `handler`: Async function that receives validated input and returns a result

**Returns:** Object with `id` and `meta`

#### `run(actionId, payload)`

Execute a registered action by ID with the given payload.

- `actionId`: The ID of the action to execute
- `payload`: Input data (will be validated against the action's input schema)

**Returns:** Promise resolving to the action's return value

#### `list()`

List all registered actions with their manifests.

**Returns:** Array of `ActionManifest` objects

#### `has(actionId)`

Check if an action is registered.

- `actionId`: The ID to check

**Returns:** Boolean

#### `clear()`

Clear all registered actions.

## Type Safety

The SDK provides full TypeScript support with type inference from Zod schemas:

```ts
const greetAction = act.action(
  {
    id: 'greet',
    description: 'Greet a user',
    input: z.object({
      name: z.string(),
    }),
  },
  async ({ name }) => {
    // `name` is typed as string
    return `Hello, ${name}!`;
  }
);
```

## Related Packages

- `@act-sdk/mcp` - Convert actions to MCP tools
- `@act-sdk/cli` - CLI for development and tooling

