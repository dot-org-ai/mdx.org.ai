cd# @mdxld/compile

Fast JSX/TSX compilation for MDXLD documents using esbuild. Transform JSX syntax to plain JavaScript function calls, compile MDX content to executable components, and prepare code for sandbox execution.

## Installation

```bash
npm install @mdxld/compile
# or
pnpm add @mdxld/compile
# or
yarn add @mdxld/compile
```

**Note:** esbuild is a peer dependency and will be installed automatically.

## Features

- **Fast** - Uses esbuild for near-instant transformation
- **JSX/TSX** - Full support for JSX and TypeScript
- **Configurable** - Custom JSX factory, fragment, and target
- **Async & Sync** - Both async and synchronous APIs
- **MDX Support** - Compile full MDX documents with frontmatter
- **Test Ready** - Transform code for sandbox execution

## Quick Start

```typescript
import { transformJSX, compile, containsJSX } from '@mdxld/compile'

// Transform JSX to JavaScript
const result = await transformJSX(`
  const App = () => <div className="app">Hello World</div>
`)
console.log(result.code)
// const App = () => h("div", { className: "app" }, "Hello World");

// Check if code contains JSX
if (containsJSX(code)) {
  const transformed = await transformJSX(code)
}

// Compile full MDX document
const mdxResult = await compile(`
---
title: My Page
---

# Welcome

<Counter initial={5} />
`)
```

## API Reference

### `transformJSX(code, options?)`

Transform JSX/TSX code to plain JavaScript using esbuild.

```typescript
async function transformJSX(
  code: string,
  options?: TransformJSXOptions
): Promise<TransformResult>
```

**Parameters:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `jsxFactory` | `string` | `'h'` | JSX factory function name |
| `jsxFragment` | `string` | `'Fragment'` | JSX fragment factory name |
| `typescript` | `boolean` | `true` | Whether input is TypeScript |
| `sourcefile` | `string` | `'input.tsx'` | Source filename for errors |
| `minify` | `boolean` | `false` | Minify output |
| `target` | `string` | `'esnext'` | Target environment |

**Returns:** `TransformResult`

```typescript
interface TransformResult {
  code: string       // Transformed JavaScript
  map?: string       // Source map (if requested)
  warnings: string[] // Any transformation warnings
}
```

**Examples:**

```typescript
// Basic transformation
const result = await transformJSX(`
  const Button = ({ children }) => (
    <button className="btn">{children}</button>
  )
`)
// Output: const Button = ({ children }) => h("button", { className: "btn" }, children);

// With React factory
const reactResult = await transformJSX(code, {
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment'
})

// With Preact
const preactResult = await transformJSX(code, {
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
})

// Minified output
const minified = await transformJSX(code, { minify: true })
```

### `transformJSXSync(code, options?)`

Synchronous version of `transformJSX`. Same API but blocks the event loop.

```typescript
function transformJSXSync(
  code: string,
  options?: TransformJSXOptions
): TransformResult
```

**Note:** Prefer the async version for better performance. Use sync only when necessary (e.g., in synchronous plugin hooks).

```typescript
import { transformJSXSync } from '@mdxld/compile'

// Synchronous transformation
const result = transformJSXSync(`const App = () => <div>Hello</div>`)
```

### `compile(content, options?)`

Compile MDX content (markdown + JSX) to executable JavaScript.

```typescript
async function compile(
  content: string,
  options?: CompileOptions
): Promise<CompileResult>
```

**Additional Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFormat` | `'function-body' \| 'module'` | `'function-body'` | Output format |
| `includeFrontmatter` | `boolean` | `true` | Include frontmatter in output |

**Returns:** `CompileResult`

```typescript
interface CompileResult extends TransformResult {
  frontmatter?: Record<string, unknown>  // Extracted frontmatter data
}
```

**Examples:**

```typescript
// Basic compilation
const result = await compile(`
---
title: Hello World
published: true
---

# Welcome

This is MDX content with <CustomComponent />.
`)

console.log(result.frontmatter)
// { title: 'Hello World', published: true }

console.log(result.code)
// Compiled JavaScript component

// Module output format
const moduleResult = await compile(content, {
  outputFormat: 'module'
})
// Output includes: export default MDXContent; export const frontmatter = {...};

// Function body format (for eval/Function constructor)
const fnResult = await compile(content, {
  outputFormat: 'function-body'
})
// Output includes: return { default: MDXContent, frontmatter: {...} };
```

### `containsJSX(code)`

Check if a string contains JSX syntax that needs transformation.

```typescript
function containsJSX(code: string): boolean
```

Detects:
- Opening tags: `<Component>` or `<div>`
- Self-closing tags: `<Component />` or `<br />`
- Fragments: `<>` and `</>`
- Return statements with JSX: `return <div>`

```typescript
import { containsJSX } from '@mdxld/compile'

containsJSX('<div>Hello</div>')           // true
containsJSX('<CustomComponent />')         // true
containsJSX('<>Fragment</>') // true
containsJSX('return <App />')              // true
containsJSX('const x = 1')                 // false
containsJSX('a < b && c > d')              // false (comparison operators)
```

### `transformTestCode(code, options?)`

Transform test code containing JSX for sandbox execution. Pre-configured for ai-sandbox compatibility.

```typescript
async function transformTestCode(
  code: string,
  options?: TransformJSXOptions
): Promise<string>
```

Uses `h` and `Fragment` as defaults to match ai-sandbox's built-in JSX support.

```typescript
import { transformTestCode } from '@mdxld/compile'

const testCode = `
  const Counter = () => <div>0</div>
  app.get('/', (c) => c.html(<Counter />))

  const response = await app.request('/')
  expect(response.status).toBe(200)
`

const transformed = await transformTestCode(testCode)
// Ready for ai-sandbox execution
```

## Output Formats

### Function Body (default)

Designed for use with `Function` constructor or `eval`. Returns an object with the component and frontmatter.

```typescript
const result = await compile(content, { outputFormat: 'function-body' })

// Use with Function constructor
const fn = new Function('h', 'Fragment', result.code)
const { default: Component, frontmatter } = fn(h, Fragment)
```

### Module

Standard ES module format with exports.

```typescript
const result = await compile(content, { outputFormat: 'module' })

// Output:
// const MDXContent = (props) => { ... }
// export default MDXContent;
// export const frontmatter = { ... };
```

## JSX Factory Configuration

Different frameworks use different JSX factory functions:

```typescript
// React
await transformJSX(code, {
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment'
})

// Preact
await transformJSX(code, {
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
})

// Vue JSX
await transformJSX(code, {
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
})

// Custom (e.g., ai-sandbox)
await transformJSX(code, {
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
})
```

## Error Handling

Transformation errors include helpful context:

```typescript
try {
  await transformJSX('const x = <div')
} catch (error) {
  console.error(error.message)
  // "JSX transformation failed: Unexpected end of file"
}
```

## TypeScript Support

TypeScript is fully supported and enabled by default:

```typescript
// TypeScript with types
const result = await transformJSX(`
  interface Props {
    name: string
    count: number
  }

  const Component = ({ name, count }: Props) => (
    <div>
      <span>{name}</span>
      <span>{count}</span>
    </div>
  )
`)

// Types are stripped, JSX is transformed
```

To disable TypeScript processing:

```typescript
const result = await transformJSX(code, { typescript: false })
```

## Integration Examples

### With @mdxld/evaluate

```typescript
import { compile } from '@mdxld/compile'
import { evaluate, h, Fragment } from '@mdxld/evaluate'

const { code, frontmatter } = await compile(mdxContent)
const result = evaluate(code, { jsx: h, Fragment })
```

### With ai-sandbox

```typescript
import { transformTestCode } from '@mdxld/compile'
import { evaluate } from 'ai-sandbox'

const transformedTests = await transformTestCode(testCode)
const result = await evaluate({ tests: transformedTests })
```

### Build Pipeline

```typescript
import { compile, containsJSX } from '@mdxld/compile'
import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'

const mdxFiles = await glob('content/**/*.mdx')

for (const file of mdxFiles) {
  const content = await readFile(file, 'utf-8')
  const { code, frontmatter } = await compile(content, {
    outputFormat: 'module',
    minify: true
  })

  const outPath = file.replace('.mdx', '.js')
  await writeFile(outPath, code)
}
```

## Performance

esbuild provides extremely fast transformation:

- ~1ms for small files
- ~10ms for large files with many components
- Parallel processing for multiple files

```typescript
import { transformJSX } from '@mdxld/compile'

// Transform many files in parallel
const results = await Promise.all(
  files.map(content => transformJSX(content))
)
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | Core parser and stringifier |
| [@mdxld/ast](https://www.npmjs.com/package/@mdxld/ast) | AST manipulation |
| [@mdxld/evaluate](https://www.npmjs.com/package/@mdxld/evaluate) | MDX execution |
| [@mdxld/validate](https://www.npmjs.com/package/@mdxld/validate) | Schema validation |

## License

MIT
