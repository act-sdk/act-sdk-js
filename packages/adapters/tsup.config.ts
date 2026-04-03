import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'stdio/index': 'src/stdio/index.ts',
    'nextjs/index': 'src/nextjs/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
