# @mdxld/markdown

Bi-directional conversion between Objects and Markdown. Render structured data to readable markdown, extract it back.

## Installation

```bash
pnpm add @mdxld/markdown
```

## Overview

`@mdxld/markdown` provides pure semantic conversion functions:

```typescript
import { toMarkdown, fromMarkdown } from '@mdxld/markdown'

// Object → Markdown
const markdown = toMarkdown(customer)

// Markdown → Object
const customer = fromMarkdown<Customer>(markdown)
```

This is the **data layer** - no styling, just structure. For styled output, see `@mdxui/markdown`.

## Quick Start

```typescript
import { toMarkdown, fromMarkdown, diff } from '@mdxld/markdown'

// 1. Define your data
const storyBrand = {
  name: 'Acme Corp',
  hero: {
    persona: 'Sarah is a 35-year-old VP of Engineering...',
    occupation: 'VP of Engineering',
    company: 'Series B SaaS startup'
  },
  problem: {
    external: 'Hire engineers quickly',
    internal: 'Worried about missing deadlines'
  }
}

// 2. Render to markdown
const markdown = toMarkdown(storyBrand)

// 3. User or AI edits the markdown
const edited = markdown.replace('VP of Engineering', 'CTO')

// 4. Extract back to object
const updated = fromMarkdown<typeof storyBrand>(edited)

// 5. See what changed
const changes = diff(storyBrand, updated)
// { modified: { 'hero.occupation': { from: 'VP of Engineering', to: 'CTO' } } }
```

## API

### toMarkdown(object, options?)

Convert an object to markdown using layout conventions.

```typescript
function toMarkdown<T>(
  object: T,
  options?: ToMarkdownOptions
): string
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layout` | `LayoutConfig` | auto | Custom layout rules |
| `depth` | `number` | `6` | Max heading depth |
| `tableThreshold` | `number` | `6` | Max columns before switching to sections |

**Example:**

```typescript
const markdown = toMarkdown({
  name: 'Customer',
  plural: 'Customers',
  description: 'A person who buys products.',
  properties: [
    { name: 'id', type: 'string', required: true },
    { name: 'email', type: 'string', required: true },
  ]
})
```

**Output:**

```markdown
# Customer (Customers)

A person who buys products.

## Properties

| Property | Type | Required |
|----------|------|----------|
| id | string | ✓ |
| email | string | ✓ |
```

### fromMarkdown(markdown, options?)

Extract an object from markdown.

```typescript
function fromMarkdown<T>(
  markdown: string,
  options?: FromMarkdownOptions
): T
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shape` | `Schema` | inferred | Expected shape/schema |
| `strict` | `boolean` | `false` | Throw on parse errors |
| `normalize` | `boolean` | `true` | Normalize keys (camelCase) |
| `coerce` | `boolean` | `true` | Coerce types (string → number) |

**Example:**

```typescript
const markdown = `
# Customer (Customers)

A person who buys products.

## Properties

| Property | Type | Required |
|----------|------|----------|
| id | string | ✓ |
| email | string | ✓ |
`

const obj = fromMarkdown(markdown)
// {
//   name: 'Customer',
//   plural: 'Customers',
//   description: 'A person who buys products.',
//   properties: [
//     { property: 'id', type: 'string', required: true },
//     { property: 'email', type: 'string', required: true }
//   ]
// }
```

### diff(original, updated)

Compute differences between two objects.

```typescript
function diff<T>(
  original: T,
  updated: T
): Diff<T>

interface Diff<T> {
  added: Record<string, unknown>
  modified: Record<string, { from: unknown; to: unknown }>
  removed: string[]
}
```

### render(template, data)

Render data using an explicit template.

```typescript
function render(
  template: string,
  data: Record<string, unknown>
): string
```

**Example:**

```typescript
const template = `
# {name}

> {tagline}

## Hero

{hero.persona}

**Occupation:** {hero.occupation}
`

const markdown = render(template, storyBrand)
```

### extract(markdown, template)

Extract data from markdown using a template.

```typescript
function extract<T>(
  markdown: string,
  template: string
): T
```

## Layout Conventions

Objects render to markdown following these rules:

| Shape Pattern | Markdown Output |
|---------------|-----------------|
| `name` (top-level) | `# {name}` |
| `name` + `plural` | `# {name} ({plural})` |
| `description` | Paragraph after title |
| Scalar metadata | `**{Key}:** {value}` |
| Nested object | `## {Key}` section |
| Nested property (long) | `### {key}\n{value}` |
| Nested property (short) | `**{Key}:** {value}` |
| `string[]` | Bullet list |
| `object[]` (flat, ≤5 keys) | Table |
| `object[]` (complex) | `### {name}` subsections |

### Short vs Long Values

- **Short**: Single line, under 80 characters → `**Key:** value`
- **Long**: Multi-line or over 80 characters → `### Key\n\nvalue`

### Array Rendering

```typescript
// string[] → bullet list
tags: ['api', 'rest', 'http']
// - api
// - rest
// - http

// object[] with flat structure → table
properties: [
  { name: 'id', type: 'string' },
  { name: 'email', type: 'string' }
]
// | name | type |
// |------|------|
// | id | string |
// | email | string |

// object[] with complex structure → subsections
actions: [
  { name: 'create', description: '...', arguments: [...] },
  { name: 'update', description: '...', arguments: [...] }
]
// ### create
// ...
// ### update
// ...
```

## Extraction Conventions

Markdown parses back to objects following these rules:

| Markdown Pattern | Object Output |
|------------------|---------------|
| `# Title` | `{ name: "Title" }` |
| `# Name (Plural)` | `{ name: "Name", plural: "Plural" }` |
| First paragraph | `{ description: "..." }` |
| `**Key:** value` | `{ key: "value" }` |
| `## Section` | `{ section: { ... } }` |
| `### Property\ncontent` | `{ property: "content" }` |
| Bullet list | `string[]` |
| Table | `object[]` with column headers as keys |
| Fenced code block | Preserved as string |

### Table Header Normalization

| Markdown Header | Object Key |
|-----------------|------------|
| `Property` | `property` |
| `User ID` | `userId` |
| `Required` | `required` |

### Boolean Coercion

| Markdown Value | Object Value |
|----------------|--------------|
| `✓`, `Yes`, `true` | `true` |
| `-`, `No`, `false`, empty | `false` |

## Custom Layouts

Override conventions with explicit layout configuration:

```typescript
const layout: LayoutConfig = {
  properties: {
    as: 'table',
    columns: ['name', 'type', 'required', 'description']
  },
  actions: {
    as: 'sections',
    titleKey: 'name'
  },
  extends: {
    as: 'inline',
    prefix: 'Extends:'
  }
}

const markdown = toMarkdown(entity, { layout })
```

## Use Cases

### Documentation Generation

```typescript
// Generate API docs from schema
const apiDocs = toMarkdown(openApiSpec)
```

### Headless CMS

```typescript
// Render content for editing
const content = toMarkdown(blogPost)

// User edits in markdown editor
const edited = await editor.edit(content)

// Extract changes back
const updated = fromMarkdown(edited)
await db.update(blogPost.id, updated)
```

### AI Content Editing

```typescript
// Let AI improve content
const improved = await ai.improve(toMarkdown(content))

// Extract and review changes
const updated = fromMarkdown(improved)
const changes = diff(content, updated)

// Apply if approved
if (await user.approve(changes)) {
  await db.update(content.id, updated)
}
```

### Round-trip Sync

```typescript
// Bidirectional sync between MDX and markdown
const markdown = toMarkdown(frontmatter)
// ... user edits ...
const newFrontmatter = fromMarkdown(editedMarkdown)
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/jsx/markdown`](../jsx) | JSX runtime for markdown output |
| [`@mdxui/markdown`](../../@mdxui/markdown) | Styled markdown output |
| [`@mdxld/extract`](../extract) | Template-based extraction |
| [`@mdxld/json`](../json) | Object ↔ JSON conversion |

## Dependency Graph

```
@mdxld/markdown (this package)
       ↓
    mdxdb (uses for extraction, relationships)
       ↓
    mdxui (adds styling on top)
```

## License

MIT
