# @mdxe/bun

Bun runtime for MDX. Fast, native MDX compilation and serving with Bun.

## Installation

```bash
bun add @mdxe/bun
```

## Features

- **Native Bun** - Optimized for Bun's fast runtime
- **Hot Reload** - Built-in file watching and hot reload
- **Fast Compilation** - Bun's native bundler for MDX
- **Server Mode** - Serve MDX files with zero config
- **CLI** - Command-line tool for development
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { serve } from '@mdxe/bun'

// Start MDX server
serve({
  port: 3000,
  root: './content'
})
```

Or use the CLI:

```bash
bunx @mdxe/bun serve --port 3000 --root ./content
```

## API Reference

### `serve(options)`

Start an MDX development server.

```typescript
function serve(options: ServeOptions): Server

interface ServeOptions {
  port?: number              // Server port (default: 3000)
  root?: string              // Content root directory
  watch?: boolean            // Enable hot reload (default: true)
  transform?: TransformFn    // Custom MDX transform
}
```

**Example:**

```typescript
import { serve } from '@mdxe/bun'

const server = serve({
  port: 3000,
  root: './docs',
  watch: true,
  transform: (doc) => ({
    ...doc,
    data: {
      ...doc.data,
      generatedAt: new Date().toISOString()
    }
  })
})

console.log(`Server running at http://localhost:${server.port}`)
```

### `compile(file)`

Compile an MDX file.

```typescript
async function compile(file: string): Promise<CompiledMDX>

interface CompiledMDX {
  code: string               // Compiled JavaScript
  data: Record<string, unknown>  // Frontmatter data
  exports: string[]          // Exported names
}
```

**Example:**

```typescript
import { compile } from '@mdxe/bun'

const result = await compile('./docs/intro.mdx')
console.log(result.data.title)
console.log(result.exports)
```

### `build(options)`

Build MDX files for production.

```typescript
async function build(options: BuildOptions): Promise<BuildResult>

interface BuildOptions {
  input: string | string[]   // Input glob patterns
  outdir: string             // Output directory
  minify?: boolean           // Minify output (default: true)
  sourcemap?: boolean        // Generate source maps
}

interface BuildResult {
  files: string[]            // Output file paths
  size: number               // Total size in bytes
  time: number               // Build time in ms
}
```

**Example:**

```typescript
import { build } from '@mdxe/bun'

const result = await build({
  input: './content/**/*.mdx',
  outdir: './dist',
  minify: true,
  sourcemap: true
})

console.log(`Built ${result.files.length} files in ${result.time}ms`)
```

## CLI Usage

### Development Server

```bash
# Start dev server
bunx @mdxe/bun serve

# With options
bunx @mdxe/bun serve --port 8080 --root ./docs
```

### Build

```bash
# Build for production
bunx @mdxe/bun build --input "./content/**/*.mdx" --outdir ./dist

# With minification disabled
bunx @mdxe/bun build --no-minify
```

### Compile Single File

```bash
# Compile and output to stdout
bunx @mdxe/bun compile ./docs/intro.mdx

# Compile to file
bunx @mdxe/bun compile ./docs/intro.mdx -o ./dist/intro.js
```

## Examples

### Documentation Site

```typescript
// server.ts
import { serve } from '@mdxe/bun'
import { join } from 'path'

serve({
  port: 3000,
  root: './docs',
  watch: true
})
```

Run with:

```bash
bun run server.ts
```

### Build Script

```typescript
// build.ts
import { build } from '@mdxe/bun'
import { rm } from 'fs/promises'

// Clean output directory
await rm('./dist', { recursive: true, force: true })

// Build all MDX files
const result = await build({
  input: ['./content/**/*.mdx', './blog/**/*.mdx'],
  outdir: './dist',
  minify: true,
  sourcemap: true
})

console.log(`
Build complete!
Files: ${result.files.length}
Size: ${(result.size / 1024).toFixed(2)} KB
Time: ${result.time}ms
`)
```

### Custom Server

```typescript
import { compile } from '@mdxe/bun'

Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url)
    const path = url.pathname

    if (path.endsWith('.mdx')) {
      const file = `./content${path}`
      const result = await compile(file)

      return new Response(result.code, {
        headers: { 'Content-Type': 'application/javascript' }
      })
    }

    return new Response('Not found', { status: 404 })
  }
})
```

### Watch Mode with Custom Handler

```typescript
import { watch } from 'fs'
import { compile } from '@mdxe/bun'

const contentDir = './content'

// Initial compile
const files = new Bun.Glob('**/*.mdx').scan(contentDir)
for await (const file of files) {
  const result = await compile(`${contentDir}/${file}`)
  await Bun.write(`./dist/${file.replace('.mdx', '.js')}`, result.code)
}

// Watch for changes
watch(contentDir, { recursive: true }, async (event, filename) => {
  if (filename?.endsWith('.mdx')) {
    console.log(`Recompiling ${filename}...`)
    const result = await compile(`${contentDir}/${filename}`)
    await Bun.write(
      `./dist/${filename.replace('.mdx', '.js')}`,
      result.code
    )
  }
})

console.log('Watching for changes...')
```

## Integration

### With Hono

```typescript
import { Hono } from 'hono'
import { compile } from '@mdxe/bun'

const app = new Hono()

app.get('/docs/*', async (c) => {
  const path = c.req.path.replace('/docs/', '')
  const file = `./content/${path}.mdx`

  try {
    const result = await compile(file)
    return c.json({
      title: result.data.title,
      content: result.code,
      exports: result.exports
    })
  } catch {
    return c.notFound()
  }
})

export default app
```

### With Elysia

```typescript
import { Elysia } from 'elysia'
import { compile } from '@mdxe/bun'

const app = new Elysia()
  .get('/api/docs/:slug', async ({ params }) => {
    const result = await compile(`./docs/${params.slug}.mdx`)
    return {
      ...result.data,
      code: result.code
    }
  })
  .listen(3000)
```

## Configuration

### `bun.config.ts`

```typescript
// bun.config.ts
export default {
  mdxe: {
    root: './content',
    extensions: ['.mdx', '.md'],
    remarkPlugins: [],
    rehypePlugins: []
  }
}
```

### Environment Variables

```bash
MDXE_ROOT=./content
MDXE_PORT=3000
MDXE_WATCH=true
```

## Types

### `ServeOptions`

```typescript
interface ServeOptions {
  port?: number
  root?: string
  watch?: boolean
  transform?: (doc: MDXLDDocument) => MDXLDDocument
}
```

### `BuildOptions`

```typescript
interface BuildOptions {
  input: string | string[]
  outdir: string
  minify?: boolean
  sourcemap?: boolean
}
```

### `CompiledMDX`

```typescript
interface CompiledMDX {
  code: string
  data: Record<string, unknown>
  exports: string[]
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation |
| [@mdxe/hono](https://www.npmjs.com/package/@mdxe/hono) | Hono middleware |
| [bun](https://bun.sh) | JavaScript runtime |

## License

MIT
