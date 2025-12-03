import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dynamic import to load the plugin after build or use the source directly
const { mdxTestPlugin } = await import('./packages/@mdxe/vitest/src/index.ts')

export default defineConfig({
  plugins: [mdxTestPlugin()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.mdx', 'tests/**/*.mdx'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 60000,
    server: {
      deps: {
        inline: [
          'mdxld',
          'mdxe',
          'mdxdb',
          'mdxui',
          'mdxai',
          '@mdxe/hono',
          '@mdxe/vitest',
          '@mdxui/markdown',
          '@mdxdb/fs',
          '@mdxai/claude',
          '@mdxld/ast',
          '@mdxld/compile',
          '@mdxld/evaluate',
          '@mdxld/validate',
          'ai-sandbox',
        ],
      },
    },
  },
  resolve: {
    alias: {
      // Core packages
      'mdxld': path.resolve(__dirname, 'packages/mdxld/src/index.ts'),
      'mdxe': path.resolve(__dirname, 'packages/mdxe/src/index.ts'),
      'mdxdb': path.resolve(__dirname, 'packages/mdxdb/src/index.ts'),
      'mdxui': path.resolve(__dirname, 'packages/mdxui/src/index.ts'),
      'mdxai': path.resolve(__dirname, 'packages/mdxai/src/index.ts'),

      // @mdxe packages
      '@mdxe/hono': path.resolve(__dirname, 'packages/@mdxe/hono/src/index.ts'),
      '@mdxe/ink': path.resolve(__dirname, 'packages/@mdxe/ink/src/index.ts'),
      '@mdxe/vitest': path.resolve(__dirname, 'packages/@mdxe/vitest/src/index.ts'),

      // @mdxui packages
      '@mdxui/markdown': path.resolve(__dirname, 'packages/@mdxui/markdown/src/index.ts'),

      // @mdxdb packages
      '@mdxdb/fs': path.resolve(__dirname, 'packages/@mdxdb/fs/src/index.ts'),
      '@mdxdb/sqlite': path.resolve(__dirname, 'packages/@mdxdb/sqlite/src/index.ts'),
      '@mdxdb/api': path.resolve(__dirname, 'packages/@mdxdb/api/src/index.ts'),

      // @mdxai packages
      '@mdxai/claude': path.resolve(__dirname, 'packages/@mdxai/claude/src/index.ts'),

      // @mdxld packages
      '@mdxld/ast': path.resolve(__dirname, 'packages/@mdxld/ast/src/index.ts'),
      '@mdxld/compile': path.resolve(__dirname, 'packages/@mdxld/compile/src/index.ts'),
      '@mdxld/evaluate': path.resolve(__dirname, 'packages/@mdxld/evaluate/src/index.ts'),
      '@mdxld/validate': path.resolve(__dirname, 'packages/@mdxld/validate/src/index.ts'),

      // Primitives packages
      'ai-sandbox': path.resolve(__dirname, 'primitives/packages/ai-sandbox/src/index.ts'),
    },
  },
})
