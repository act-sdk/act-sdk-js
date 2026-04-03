# @act-sdk/cli

CLI tool for initializing Act SDK projects and scaffolding MCP servers.

## Installation

```bash
npm install -g @act-sdk/cli
# or
npx @act-sdk/cli init
```

## Usage

### Initialize a new project

```bash
act-sdk init
```

This will:
1. Create an `act-sdk.config.ts` file in your project root
2. Scaffold the MCP handler for your chosen framework
3. Install required dependencies

### Framework Options

- **STDIO** - Command-line MCP server (ready)
- **Next.js** - Next.js API route handler (ready)
- **Express** - Express.js handler (coming soon)
- **Hono** - Hono framework handler (coming soon)

## Examples

### STDIO Server

After running `act-sdk init` and selecting STDIO:

1. Edit `act-sdk.config.ts` to add your actions
2. Run: `npx tsx src/mcp-server.ts`
3. Configure in Claude Desktop

### Next.js Server

After running `act-sdk init` and selecting Next.js:

1. Edit `act-sdk.config.ts` to add your actions
2. Your handler is at `app/api/mcp/route.ts`
3. Run: `npm run dev`
4. MCP endpoint: `http://localhost:3000/api/mcp`

## Configuration

The generated `act-sdk.config.ts` includes an example action:

```typescript
import { createAct, defineConfig } from '@act-sdk/core';
import { z } from 'zod';

const act = createAct();

act.action({
  id: 'greet',
  description: 'Greet a user',
  input: z.object({
    name: z.string().describe('The name of the person to greet'),
  }),
  handler: async ({ name }) => {
    return `Hello, ${name}!`;
  },
});

export default defineConfig({
  name: 'my-mcp-server',
  description: 'My MCP server',
  version: '1.0.0',
  act,
});
```

## Options

### `--skip-install`

Skip automatic dependency installation:

```bash
act-sdk init --skip-install
```

## License

MIT
