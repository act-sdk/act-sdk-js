# @act-sdk/core

Action registry for building MCP-ready apps.

## What is this?

The core registry that lets you define actions with type-safe inputs. Actions can be called directly in your app OR exposed as MCP tools. Your existing functions become both internal logic and AI-accessible tools.

## Installation

```bash
npm install @act-sdk/core zod
```

Works with Zod v3.25+ and v4.

## Quick Start

```typescript
import { createAct, defineConfig } from '@act-sdk/core';
import { z } from 'zod';

// 1. Create action registry
export const act = createAct();

// 2. Register actions — returns the handler function
export const getDoughnuts = act.action({
  id: 'getDoughnuts',
  description: 'Get doughnuts for a user',
  input: z.object({
    userId: z.string(),
    limit: z.number().optional(),
  }),
  handler: async ({ userId, limit }) => {
    return db.doughnuts.findMany({ 
      where: { userId }, 
      take: limit ?? 10 
    });
  },
});

// 3. Use directly in your app
await getDoughnuts({ userId: '123', limit: 5 });

// 4. Export config for MCP adapters
export default defineConfig({
  name: 'my-app',
  description: 'My app MCP server',
  version: '1.0.0',
  act,
});
```

## API

### `createAct()`

Creates an action registry.

```typescript
const act = createAct();
```

### `act.action(def)`

Register an action. **Returns the handler function** so you can call it directly.

```typescript
export const myAction = act.action({
  id: 'myAction',
  description: 'Does something',
  input: z.object({ name: z.string() }),  // optional
  handler: async ({ name }, context) => {
    // context.authInfo available when called via MCP with auth
    return `Hello, ${name}!`;
  },
});

// Call it directly
await myAction({ name: 'Alice' });
```

### `act.getRegistry()`

Access the internal registry.

```typescript
const registry = act.getRegistry();

registry.all();      // Get all registered actions
registry.get(id);    // Get specific action by ID
registry.has(id);    // Check if action exists
registry.size();     // Number of registered actions
```

### `defineConfig(config)`

Create a config object for MCP adapters.

```typescript
export default defineConfig({
  name: 'my-app',
  description: 'My app description',
  version: '1.0.0',
  act,
});
```

## Type Safety

Full TypeScript support with automatic inference:

```typescript
const calculate = act.action({
  id: 'calculate',
  input: z.object({
    amount: z.number(),
    tax: z.number(),
  }),
  handler: async ({ amount, tax }) => {
    // amount and tax are typed as number
    return amount + (amount * tax);
  },
});
```

## Authentication Context

When actions are called via MCP adapters with auth, they receive context:

```typescript
act.action({
  id: 'getProfile',
  description: 'Get user profile',
  handler: async (args, context) => {
    // context.authInfo contains auth data from adapter
    const userId = context?.authInfo?.userId;
    return db.users.findOne({ id: userId });
  },
});
```

## Related Packages

- **@act-sdk/mcp** - Convert actions to MCP server
- **@act-sdk/adapters** - STDIO and Next.js adapters

