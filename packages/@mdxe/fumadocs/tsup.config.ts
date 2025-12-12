import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/detect.ts',
    'src/scaffold.ts',
    'src/dev.ts',
    'src/build.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: [
    'mdxld',
    'fumadocs-core',
    'fumadocs-mdx',
    'fumadocs-ui',
    '@opennextjs/cloudflare',
    'next',
  ],
})
