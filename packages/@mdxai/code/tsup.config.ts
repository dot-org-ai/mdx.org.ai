import { defineConfig } from 'tsup'

export default defineConfig([
  // Library builds
  {
    entry: {
      index: 'src/index.ts',
      types: 'src/types.ts',
      'runner/index': 'src/runner/index.ts',
      'runner/spawn': 'src/runner/spawn.ts',
      'runner/parser': 'src/runner/parser.ts',
      'runner/reporter': 'src/runner/reporter.ts',
      'auth/index': 'src/auth/index.ts',
      'auth/token': 'src/auth/token.ts',
      'auth/login': 'src/auth/login.ts',
      'client/index': 'src/client/index.ts',
      'client/api': 'src/client/api.ts',
      'client/websocket': 'src/client/websocket.ts',
      'client/hooks': 'src/client/hooks.ts',
      'components/index': 'src/components/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['react', 'commander', 'zod'],
  },
  // CLI build
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
      'cli/run': 'src/cli/run.ts',
      'cli/watch': 'src/cli/watch.ts',
      'cli/list': 'src/cli/list.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: ['commander', 'zod'],
  },
])
