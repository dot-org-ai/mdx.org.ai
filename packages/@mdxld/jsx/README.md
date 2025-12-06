# @mdxld/jsx

Universal JSX runtime with pluggable output renderers. Write components once, render to any format.

## Installation

```bash
pnpm add @mdxld/jsx
```

## Overview

`@mdxld/jsx` provides a unified JSX system that can render to multiple output formats:

| Entry Point | Output | Use Case |
|-------------|--------|----------|
| `@mdxld/jsx/html` | HTML string | SSR, static sites, email |
| `@mdxld/jsx/dom` | DOM nodes | Client-side hydration |
| `@mdxld/jsx/react` | React elements | React applications |
| `@mdxld/jsx/preact` | Preact VNodes | Preact applications |
| `@mdxld/jsx/markdown` | Markdown string | Docs, AI editing, content |
| `@mdxld/jsx/json` | JSON object | APIs, data exchange |
| `@mdxld/jsx/jsonld` | JSON-LD | SEO, linked data, Schema.org |

## Quick Start

```tsx
import { Entity, Property } from '@mdxld/jsx/primitives'

function Customer({ name, email, tier }) {
  return (
    <Entity name={name} type="Customer">
      <Property name="email">{email}</Property>
      <Property name="tier" default="free">{tier}</Property>
    </Entity>
  )
}

// Render to any format
import { renderToMarkdown } from '@mdxld/jsx/markdown'
import { renderToJSON } from '@mdxld/jsx/json'
import { renderToHTML } from '@mdxld/jsx/html'

renderToMarkdown(<Customer name="Acme" email="hi@acme.com" tier="pro" />)
// # Acme
// **Email:** hi@acme.com
// **Tier:** pro

renderToJSON(<Customer name="Acme" email="hi@acme.com" tier="pro" />)
// { name: "Acme", type: "Customer", email: "hi@acme.com", tier: "pro" }

renderToHTML(<Customer name="Acme" email="hi@acme.com" tier="pro" />)
// <article><h1>Acme</h1>...</article>
```

## Runtime Configuration

Configure the JSX runtime in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@mdxld/jsx/html"
  }
}
```

Or import directly:

```tsx
import { jsx, Fragment } from '@mdxld/jsx/html'
import { jsx, Fragment } from '@mdxld/jsx/markdown'
import { jsx, Fragment } from '@mdxld/jsx/json'
```

## Output Runtimes

### HTML (SSR)

Wraps `hono/jsx` for HTML string output:

```tsx
import { renderToString } from '@mdxld/jsx/html'

const html = renderToString(<Customer {...data} />)
// <article class="customer"><h1>Acme</h1>...</article>
```

### DOM (Client)

Wraps `hono/jsx/dom` for client-side rendering:

```tsx
import { render } from '@mdxld/jsx/dom'

render(<Customer {...data} />, document.getElementById('root'))
```

### React

Standard React JSX runtime:

```tsx
import { jsx } from '@mdxld/jsx/react'
// Uses react/jsx-runtime
```

### Preact

Preact JSX runtime:

```tsx
import { jsx } from '@mdxld/jsx/preact'
// Uses preact
```

### Markdown

Renders JSX to Markdown strings:

```tsx
import { renderToMarkdown, extractFromMarkdown } from '@mdxld/jsx/markdown'

// Render
const md = renderToMarkdown(<Customer {...data} />)

// Extract (bi-directional)
const obj = extractFromMarkdown(editedMarkdown, Customer)
```

### JSON

Renders JSX to JSON objects:

```tsx
import { renderToJSON, extractFromJSON } from '@mdxld/jsx/json'

const json = renderToJSON(<Customer {...data} />)
const obj = extractFromJSON(jsonData, Customer)
```

### JSON-LD

Renders JSX to JSON-LD with Schema.org context:

```tsx
import { renderToJSONLD } from '@mdxld/jsx/jsonld'

const jsonld = renderToJSONLD(<Customer {...data} />)
// { "@context": "https://schema.org", "@type": "Person", ... }
```

## Semantic Primitives

Core building blocks that know how to render to each format:

```tsx
import {
  // Structural
  Document,    // Root container
  Entity,      // Named thing with properties
  Section,     // Grouped content
  Property,    // Key-value pair
  List,        // Array of items
  Table,       // Tabular data

  // Data Types
  Text,        // Plain text
  Code,        // Code block with language
  Link,        // URL reference

  // Actions/API
  Action,      // Function/method definition
  Argument,    // Parameter
  Returns,     // Return type
  Event,       // Event definition

  // Metadata
  Type,        // Type reference
  Extends,     // Inheritance
} from '@mdxld/jsx/primitives'
```

### Entity Example

```tsx
<Entity name="Customer" plural="Customers" extends="Entity">
  <Property name="id" type="string" required>
    Unique identifier
  </Property>
  <Property name="email" type="string" required>
    Primary email address
  </Property>
  <Action name="upgrade" returns="Customer">
    <Argument name="tier" type="Tier" required />
  </Action>
</Entity>
```

**→ Markdown:**
```markdown
# Customer (Customers)

**Extends:** Entity

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | ✓ | Unique identifier |
| email | string | ✓ | Primary email address |

## Actions

### upgrade

**Returns:** `Customer`

| Argument | Type | Required |
|----------|------|----------|
| tier | Tier | ✓ |
```

**→ JSON:**
```json
{
  "name": "Customer",
  "plural": "Customers",
  "extends": "Entity",
  "properties": [
    { "name": "id", "type": "string", "required": true, "description": "Unique identifier" }
  ],
  "actions": [
    { "name": "upgrade", "returns": "Customer", "arguments": [{ "name": "tier", "type": "Tier", "required": true }] }
  ]
}
```

**→ JSON-LD:**
```json
{
  "@context": "https://schema.org",
  "@type": "Class",
  "name": "Customer",
  "subClassOf": { "@id": "Entity" }
}
```

## Composition

Templates compose like React components:

```tsx
function StoryBrand({ name, hero, problem, guide }) {
  return (
    <Document name={name}>
      <Hero {...hero} />
      <Problem {...problem} />
      <Guide {...guide} />
    </Document>
  )
}

function Hero({ persona, occupation, company }) {
  return (
    <Section name="hero" title="Hero">
      <Property name="persona">{persona}</Property>
      <Property name="occupation">{occupation}</Property>
      <Property name="company">{company}</Property>
    </Section>
  )
}
```

## Bi-directional Extraction

Components define both rendering AND extraction:

```tsx
import { renderToMarkdown, extractFromMarkdown } from '@mdxld/jsx/markdown'

// 1. Render to markdown
const markdown = renderToMarkdown(<Customer {...data} />)

// 2. User/AI edits the markdown
const edited = markdown.replace('pro', 'enterprise')

// 3. Extract back to object
const updated = extractFromMarkdown(edited, Customer)
```

The component structure serves as the extraction schema.

## MDX Compilation

Compile MDX files with JSX runtime support:

```ts
import { compileMDX } from '@mdxld/jsx'

const result = await compileMDX(mdxContent, {
  jsx: 'html',  // or 'react', 'preact', 'markdown', 'json'
})
```

### Build Plugins

```ts
// esbuild
import { mdxPlugin } from '@mdxld/jsx/esbuild'

// Vite
import { mdxVitePlugin } from '@mdxld/jsx/plugin'

// Rollup
import { mdxRollupPlugin } from '@mdxld/jsx/plugin'

// tsup
import { mdxTsupPlugin } from '@mdxld/jsx/plugin'
```

### JSX Presets

```ts
import { compileMDX, JSX_PRESETS } from '@mdxld/jsx'

// Use preset name
await compileMDX(content, { jsx: 'html' })
await compileMDX(content, { jsx: 'react' })
await compileMDX(content, { jsx: 'preact' })
await compileMDX(content, { jsx: 'markdown' })

// Or custom config
await compileMDX(content, {
  jsx: { importSource: '@mdxld/jsx/html' }
})
```

## Exports

| Entry Point | Description |
|-------------|-------------|
| `@mdxld/jsx` | Core compiler, types, presets |
| `@mdxld/jsx/html` | HTML string renderer (hono/jsx) |
| `@mdxld/jsx/dom` | DOM renderer (hono/jsx/dom) |
| `@mdxld/jsx/react` | React JSX runtime |
| `@mdxld/jsx/preact` | Preact JSX runtime |
| `@mdxld/jsx/markdown` | Markdown renderer + extractor |
| `@mdxld/jsx/json` | JSON renderer + extractor |
| `@mdxld/jsx/jsonld` | JSON-LD renderer |
| `@mdxld/jsx/primitives` | Semantic primitive components |
| `@mdxld/jsx/plugin` | Vite/Rollup/tsup plugins |
| `@mdxld/jsx/esbuild` | esbuild plugin |

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/markdown`](../markdown) | Standalone toMarkdown/fromMarkdown |
| [`@mdxld/json`](../json) | Standalone toJSON/fromJSON/toJSONLD |
| [`@mdxld/html`](../html) | Standalone toHTML/fromHTML |
| [`mdxld`](../../mdxld) | Core MDX + Linked Data parser |
| [`@mdxld/extract`](../extract) | Template-based extraction |

## License

MIT
