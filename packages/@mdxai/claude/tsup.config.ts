import { defineConfig } from 'tsup'

export default defineConfig([
  // Library builds
  {
    entry: {
      index: 'src/index.ts',
      tools: 'src/tools.ts',
      server: 'src/server.ts',
      types: 'src/types.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['mdxdb', 'mdxe', 'mdxld', '@anthropic-ai/claude-agent-sdk', '@anthropic-ai/sdk', 'zod'],
  },
  // CLI build
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: [
      'mdxdb',
      'mdxe',
      'mdxld',
      '@mdxdb/fs',
      '@anthropic-ai/claude-agent-sdk',
    ],
  },
])
