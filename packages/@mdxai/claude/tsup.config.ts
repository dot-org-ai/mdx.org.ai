import { defineConfig } from 'tsup'

export default defineConfig({
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
  external: ['mdxdb', 'mdxe', 'mdxld', '@anthropic-ai/claude-agent-sdk', 'zod'],
})
