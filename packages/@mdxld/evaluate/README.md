# @mdxld/evaluate

Execute and render MDXLD documents. Evaluate compiled MDX code with a JSX runtime, run MDX content directly, execute in isolated sandboxes, and render components to HTML strings.

## Installation

```bash
npm install @mdxld/evaluate @mdxld/compile mdxld
# or
pnpm add @mdxld/evaluate @mdxld/compile mdxld
# or
yarn add @mdxld/evaluate @mdxld/compile mdxld
```

**Optional:** For sandbox execution, install `ai-sandbox`:
```bash
npm install ai-sandbox
```

## Features

- **Evaluate** - Execute compiled MDX code with JSX runtime
- **Run** - Compile and evaluate MDX in one step
- **Sandbox** - Isolated execution for untrusted content
- **Runtime** - Create custom runtimes with components
- **SSR** - Render components to HTML strings
- **Built-in JSX** - Includes `h` and `Fragment` functions

## Quick Start

```typescript
import { run, renderToString } from '@mdxld/evaluate'

// Run MDX content directly
const result = await run(`
# Hello World

Welcome to **MDXLD**!
`)

// Render to HTML
const html = renderToString(result.default({}))
// '<div><h1>Hello World</h1><p>Welcome to <strong>MDXLD</strong>!</p></div>'

console.log(result.frontmatter)
// {}
```

## API Reference

### `evaluate(code, options?)`

Evaluate pre-compiled MDX code (from `@mdxld/compile`).

```typescript
function evaluate(code: string, options?: EvaluateOptions): EvaluateResult
```

**Parameters:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `jsx` | `Function` | `h` | JSX factory function |
| `jsxs` | `Function` | `jsx` | JSX factory for static children |
| `Fragment` | `unknown` | `Fragment` | Fragment component |
| `scope` | `Record<string, unknown>` | `{}` | Variables available during evaluation |
| `compile` | `CompileOptions` | `{}` | Options passed to compiler |

**Returns:** `EvaluateResult`

```typescript
interface EvaluateResult {
  default: unknown                    // The MDX component
  frontmatter: Record<string, unknown> // Extracted frontmatter
  [key: string]: unknown              // Any named exports
}
```

**Example:**

```typescript
import { compile } from '@mdxld/compile'
import { evaluate, h, Fragment } from '@mdxld/evaluate'

// Pre-compile MDX
const { code } = await compile(`
---
title: My Page
---

# Hello World
`)

// Evaluate with built-in JSX runtime
const result = evaluate(code, { jsx: h, Fragment })

// Call the component
const element = result.default({})
console.log(result.frontmatter) // { title: 'My Page' }
```

### `run(content, options?)`

Compile and evaluate MDX content in one step.

```typescript
async function run(
  content: string,
  options?: EvaluateOptions
): Promise<EvaluateResult>
```

**Example:**

```typescript
import { run } from '@mdxld/evaluate'

const result = await run(`
---
title: Quick Start
author: Jane Doe
---

# Getting Started

Welcome to the **quick start** guide!

<Alert type="info">This is a tip!</Alert>
`, {
  scope: {
    Alert: ({ type, children }) => ({
      type: 'div',
      props: { className: `alert alert-${type}`, children }
    })
  }
})

console.log(result.frontmatter)
// { title: 'Quick Start', author: 'Jane Doe' }
```

### `evaluateInSandbox(content, options?)`

Execute MDX content in an isolated sandbox environment using `ai-sandbox`. Ideal for untrusted content or when you need execution isolation.

```typescript
async function evaluateInSandbox(
  content: string,
  options?: SandboxOptions
): Promise<SandboxResult>
```

**Additional Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | `number` | `5000` | Timeout in milliseconds |
| `allowNetwork` | `boolean` | `false` | Allow network access |

**Returns:** `SandboxResult`

```typescript
interface SandboxResult {
  success: boolean
  value?: unknown
  error?: string
  logs: Array<{ level: string; message: string }>
  duration: number
}
```

**Example:**

```typescript
import { evaluateInSandbox } from '@mdxld/evaluate'

const result = await evaluateInSandbox(`
# User Content

<Counter initial={5} />

<script>
  // This runs in isolation
  console.log('Hello from sandbox!')
</script>
`, {
  timeout: 10000
})

if (result.success) {
  console.log('Executed in', result.duration, 'ms')
  console.log('Logs:', result.logs)
} else {
  console.error('Sandbox error:', result.error)
}
```

### `createRuntime(components?, options?)`

Create a reusable MDX runtime with pre-configured components.

```typescript
function createRuntime(
  components?: Record<string, unknown>,
  options?: EvaluateOptions
): {
  evaluate: (code: string) => EvaluateResult
  run: (content: string) => Promise<EvaluateResult>
  components: Record<string, unknown>
}
```

**Example:**

```typescript
import { createRuntime } from '@mdxld/evaluate'

// Create runtime with custom components
const runtime = createRuntime({
  Button: ({ children, onClick }) => ({
    type: 'button',
    props: { onClick, children }
  }),
  Card: ({ title, children }) => ({
    type: 'div',
    props: {
      className: 'card',
      children: [
        { type: 'h3', props: { children: title } },
        { type: 'div', props: { children } }
      ]
    }
  }),
  Alert: ({ type, children }) => ({
    type: 'div',
    props: { className: `alert-${type}`, children }
  })
})

// Use the runtime
const result = await runtime.run(`
# My Page

<Card title="Welcome">
  <Button>Click Me</Button>
  <Alert type="success">It works!</Alert>
</Card>
`)
```

### `renderToString(element)`

Render a component/element tree to an HTML string (server-side rendering).

```typescript
function renderToString(element: unknown): string
```

Handles:
- Primitive values (strings, numbers)
- Arrays of elements
- Fragment components
- Function components
- HTML elements with props

**Example:**

```typescript
import { run, renderToString } from '@mdxld/evaluate'

const { default: MDXContent } = await run(`
# Hello World

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3
`)

const html = renderToString(MDXContent({}))
// <div><h1>Hello World</h1><p>This is <strong>bold</strong> and <em>italic</em> text.</p>...</div>
```

### `h(type, props, ...children)`

Built-in JSX factory function. Creates element objects compatible with `renderToString`.

```typescript
function h(
  type: string | Function,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): { type: string | Function; props: Record<string, unknown> }
```

**Example:**

```typescript
import { h, Fragment, renderToString } from '@mdxld/evaluate'

// Create elements directly
const element = h('div', { className: 'container' },
  h('h1', null, 'Hello'),
  h('p', null, 'World')
)

const html = renderToString(element)
// <div class="container"><h1>Hello</h1><p>World</p></div>

// With Fragment
const fragment = h(Fragment, null,
  h('span', null, 'One'),
  h('span', null, 'Two')
)
```

### `Fragment`

Built-in Fragment symbol for JSX fragments.

```typescript
const Fragment: symbol = Symbol.for('Fragment')
```

## Custom JSX Runtimes

You can use any JSX runtime (React, Preact, etc.):

```typescript
import { evaluate } from '@mdxld/evaluate'
import { compile } from '@mdxld/compile'
import React from 'react'

const { code } = await compile(content, {
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment'
})

const result = evaluate(code, {
  jsx: React.createElement,
  jsxs: React.createElement,
  Fragment: React.Fragment,
  scope: { React }
})
```

## Security Considerations

### Trusted Content

For trusted content (your own MDX files), use `evaluate` or `run`:

```typescript
import { run } from '@mdxld/evaluate'

const result = await run(trustedContent)
```

### Untrusted Content

For user-generated or untrusted content, use `evaluateInSandbox`:

```typescript
import { evaluateInSandbox } from '@mdxld/evaluate'

const result = await evaluateInSandbox(userContent, {
  timeout: 5000,
  allowNetwork: false
})
```

The sandbox provides:
- Isolated execution environment
- Timeout protection
- No access to Node.js APIs
- Optional network restriction

## Examples

### Blog Post Renderer

```typescript
import { run, renderToString } from '@mdxld/evaluate'

async function renderBlogPost(mdxContent: string): Promise<{
  html: string
  title: string
  date: string
}> {
  const { default: Content, frontmatter } = await run(mdxContent)

  return {
    html: renderToString(Content({})),
    title: frontmatter.title as string,
    date: frontmatter.date as string
  }
}

const post = await renderBlogPost(`
---
title: My First Post
date: 2024-01-15
---

# My First Post

Hello, world!
`)
```

### Component Library

```typescript
import { createRuntime, renderToString } from '@mdxld/evaluate'

// Define your component library
const components = {
  Button: ({ variant = 'primary', children }) => ({
    type: 'button',
    props: { className: `btn btn-${variant}`, children }
  }),
  Input: ({ label, name, type = 'text' }) => ({
    type: 'div',
    props: {
      className: 'form-group',
      children: [
        { type: 'label', props: { htmlFor: name, children: label } },
        { type: 'input', props: { id: name, name, type } }
      ]
    }
  }),
  Form: ({ action, children }) => ({
    type: 'form',
    props: { action, method: 'POST', children }
  })
}

const runtime = createRuntime(components)

const { default: FormPage } = await runtime.run(`
# Contact Us

<Form action="/contact">
  <Input label="Name" name="name" />
  <Input label="Email" name="email" type="email" />
  <Button variant="primary">Submit</Button>
</Form>
`)

const html = renderToString(FormPage({}))
```

### Static Site Generation

```typescript
import { run, renderToString } from '@mdxld/evaluate'
import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'

async function buildSite() {
  const mdxFiles = await glob('content/**/*.mdx')

  for (const file of mdxFiles) {
    const content = await readFile(file, 'utf-8')
    const { default: Component, frontmatter } = await run(content)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${frontmatter.title}</title>
</head>
<body>
  ${renderToString(Component({}))}
</body>
</html>
`

    const outPath = file.replace('content/', 'dist/').replace('.mdx', '.html')
    await writeFile(outPath, html)
  }
}
```

## Types

### `EvaluateOptions`

```typescript
interface EvaluateOptions {
  jsx?: (type: unknown, props: unknown, key?: string) => unknown
  jsxs?: (type: unknown, props: unknown, key?: string) => unknown
  Fragment?: unknown
  scope?: Record<string, unknown>
  compile?: CompileOptions
}
```

### `EvaluateResult`

```typescript
interface EvaluateResult {
  default: unknown
  frontmatter: Record<string, unknown>
  [key: string]: unknown
}
```

### `SandboxOptions`

```typescript
interface SandboxOptions extends EvaluateOptions {
  timeout?: number      // Default: 5000
  allowNetwork?: boolean // Default: false
}
```

### `SandboxResult`

```typescript
interface SandboxResult {
  success: boolean
  value?: unknown
  error?: string
  logs: Array<{ level: string; message: string }>
  duration: number
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | Core parser and stringifier |
| [@mdxld/ast](https://www.npmjs.com/package/@mdxld/ast) | AST manipulation |
| [@mdxld/compile](https://www.npmjs.com/package/@mdxld/compile) | JSX compilation |
| [@mdxld/validate](https://www.npmjs.com/package/@mdxld/validate) | Schema validation |

## License

MIT
