import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'stdio/index': 'src/stdio/index.ts',
    'nextjs/index': 'src/nextjs/index.ts',
    'express/index': 'src/express/index.ts',
    'hono/index': 'src/hono/index.ts',
    'shared/web-mcp-handler': 'src/shared/web-mcp-handler.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
