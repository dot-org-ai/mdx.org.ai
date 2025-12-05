# @mdxld/jsx

MDX compilation and build tooling with support for multiple JSX runtimes (React, Preact, Hono/JSX).

## Installation

```bash
pnpm add @mdxld/jsx
```

## Features

- Compile MDX files to JavaScript
- Support for React, Preact, and Hono/JSX via automatic JSX runtime
- Build plugins for esbuild, tsup, Vite, and Rollup
- TypeScript type generation from MDX frontmatter
- YAML-LD frontmatter extraction with `$type`, `$id`, `$context` support

## Basic Usage

```ts
import { compileMDX } from '@mdxld/jsx'

const mdxContent = `---
$type: BlogPost
title: Hello World
---

# Hello World

This is my first post.
`

const result = await compileMDX(mdxContent)
console.log(result.code)        // Compiled JavaScript
console.log(result.frontmatter) // { $type: 'BlogPost', title: 'Hello World' }
```

## JSX Runtimes

### React (default)

```ts
const result = await compileMDX(content)
// or explicitly:
const result = await compileMDX(content, { jsx: 'react' })
```

### Preact

```ts
const result = await compileMDX(content, { jsx: 'preact' })
```

### Hono/JSX

```ts
// Server-side rendering
const result = await compileMDX(content, { jsx: 'hono' })

// Client-side rendering (smaller bundle: 2.8KB vs React's 47.8KB)
const result = await compileMDX(content, { jsx: 'hono-dom' })
```

### Custom Runtime

```ts
const result = await compileMDX(content, {
  jsx: {
    importSource: 'my-jsx-lib',
    development: false,
  }
})
```

## Build Plugins

### esbuild

```ts
import { mdxPlugin } from '@mdxld/jsx/esbuild'

await esbuild.build({
  entryPoints: ['src/index.tsx'],
  plugins: [mdxPlugin()],
})
```

### tsup

```ts
import { defineConfig } from 'tsup'
import { mdxTsupPlugin } from '@mdxld/jsx/plugin'

export default defineConfig({
  entry: ['src/index.ts'],
  esbuildPlugins: [mdxTsupPlugin()],
})
```

### Vite

```ts
import { defineConfig } from 'vite'
import { mdxVitePlugin } from '@mdxld/jsx/plugin'

export default defineConfig({
  plugins: [mdxVitePlugin()],
})
```

### Rollup

```ts
import { mdxRollupPlugin } from '@mdxld/jsx/plugin'

export default {
  input: 'src/index.js',
  plugins: [mdxRollupPlugin()],
}
```

## Runtime-Specific Plugins

For convenience, pre-configured plugins are available for each runtime:

```ts
import {
  mdxReactPlugin,   // React
  mdxPreactPlugin,  // Preact
  mdxHonoPlugin,    // Hono/JSX
} from '@mdxld/jsx/plugin'
```

## Options

### CompileMDXOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `jsx` | `JSXRuntime \| JSXPreset` | `'react'` | JSX runtime configuration |
| `outputFormat` | `'esm' \| 'cjs' \| 'function-body'` | `'esm'` | Output format |
| `exportFrontmatter` | `boolean` | `true` | Include frontmatter export |
| `filepath` | `string` | - | Source file path for error messages |
| `remarkPlugins` | `unknown[]` | `[]` | Remark plugins to apply |
| `rehypePlugins` | `unknown[]` | `[]` | Rehype plugins to apply |
| `generateTypes` | `boolean` | `false` | Generate TypeScript declarations |

### JSX Presets

Available presets: `react`, `react-dev`, `preact`, `hono`, `hono-dom`, `classic`

```ts
import { JSX_PRESETS } from '@mdxld/jsx'

// Use a preset
const result = await compileMDX(content, { jsx: 'hono' })

// Or access preset config directly
console.log(JSX_PRESETS.hono)
// { importSource: 'hono/jsx', development: false }
```

## Batch Compilation

Compile multiple MDX files in parallel:

```ts
import { compileMDXBatch } from '@mdxld/jsx'

const files = [
  { path: 'posts/hello.mdx', content: '...' },
  { path: 'posts/world.mdx', content: '...' },
]

const results = await compileMDXBatch(files)
// Map<string, CompileMDXResult>
```

## TypeScript Support

Generate TypeScript declarations from MDX frontmatter:

```ts
const result = await compileMDX(content, { generateTypes: true })
console.log(result.types) // TypeScript declaration file content
```

## Exports

The package provides multiple entry points:

- `@mdxld/jsx` - Core compiler and types
- `@mdxld/jsx/plugin` - Rollup/Vite/tsup plugins
- `@mdxld/jsx/esbuild` - esbuild plugin

## Related Packages

- [`mdxld`](../mdxld) - Core MDX + Linked Data parser
- [`@mdxld/compile`](../compile) - Full MDX compilation pipeline
- [`@mdxld/evaluate`](../evaluate) - Runtime MDX evaluation

## License

MIT
