---
title: "Shapes: Conventions & API"
description: "Terminology, conventions, and API reference for Shapes"
---

# Shapes: Conventions & API

## Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Shape** | TypeScript type / JSON Schema | `type StoryBrand = { hero: {...} }` |
| **Layout** | Rendering rules (auto or explicit) | Headers, tables, lists |
| **project** | Object → Markdown (via conventions) | `project(obj)` |
| **extract** | Markdown → Object (via conventions) | `extract(md, Shape)` |
| **render** | Template + Props → Markdown (MDX) | Standard MDX |
| **invert** | Markdown + Template → Props | `invert(md, template)` |

---

## Two Modes of Operation

### Mode 1: Convention-Based (Automatic)

When you have a **Shape** (TypeScript type), the system automatically:
- **projects** objects to markdown using layout conventions
- **extracts** markdown back to objects using the same conventions

```typescript
import { project, extract } from '@mdxld/shapes'

// Define your shape
type StoryBrand = {
  name: string
  hero: {
    persona: string
    occupation: string
  }
  problem: {
    external: string
    internal: string
  }
}

// Project: Object → Markdown
const markdown = project<StoryBrand>({
  name: 'Acme Corp',
  hero: {
    persona: 'Sarah is a 35-year-old VP...',
    occupation: 'VP of Engineering'
  },
  problem: {
    external: 'Hire engineers quickly',
    internal: 'Worried about missing deadlines'
  }
})

// Result:
// # Acme Corp
//
// ## Hero
//
// ### Persona
// Sarah is a 35-year-old VP...
//
// ### Occupation
// VP of Engineering
//
// ## Problem
//
// ### External
// Hire engineers quickly
//
// ### Internal
// Worried about missing deadlines

// Extract: Markdown → Object
const obj = extract<StoryBrand>(editedMarkdown)
```

### Mode 2: Template-Based (Explicit)

When you need custom layout, use an MDX template:

```typescript
import { render, invert } from '@mdxld/shapes'

// Custom template with explicit layout
const template = `
# {name}

> {tagline}

## The Hero

{hero.persona}

**Works as:** {hero.occupation}

## The Problem

| Type | Description |
|------|-------------|
| External | {problem.external} |
| Internal | {problem.internal} |
`

// Render: Template + Props → Markdown
const markdown = render(template, props)

// Invert: Markdown + Template → Props
const props = invert(markdown, template)
```

---

## Layout Conventions

### Header Hierarchy

Objects map to header levels:

```typescript
{
  name: "Doc"        // # {name}
  section: {         // ## {key}
    title: "..."     // ### {key} or **{Key}:** value
    content: "..."
  }
}
```

| Depth | Markdown |
|-------|----------|
| 0 (root) | Document level |
| 1 | `##` Section |
| 2 | `###` Subsection |
| 3+ | `####` or nested content |

### String Rendering

Strings render based on their role:

| Pattern | Rendering | Example |
|---------|-----------|---------|
| Top-level `name` | `# {name}` | `# Acme Corp` |
| Top-level `description` | Paragraph after title | `A company that...` |
| Nested key with long value | `### {key}\n{value}` | `### Persona\nSarah is...` |
| Nested key with short value | `**{Key}:** {value}` | `**Type:** User` |
| Key suggests code | Fenced code block | `\`\`\`json\n...\n\`\`\`` |

"Short" = single line, under 80 chars
"Long" = multi-line or over 80 chars

### Array Rendering

Arrays render based on item type:

| Array Type | Rendering | Example |
|------------|-----------|---------|
| `string[]` | Bullet list | `- item 1\n- item 2` |
| `string[]` (ordered) | Numbered list | `1. step 1\n2. step 2` |
| `object[]` (simple) | Table | `\| col1 \| col2 \|` |
| `object[]` (complex) | Subsections | `### {item.name}\n...` |

"Simple objects" = flat, all primitives, <5 keys
"Complex objects" = nested, has arrays, >5 keys

```typescript
// Simple → Table
properties: [
  { name: 'id', type: 'string' },
  { name: 'email', type: 'string' }
]
// → | name | type |
//   |------|------|
//   | id | string |
//   | email | string |

// Complex → Subsections
actions: [
  { name: 'create', description: '...', arguments: [...] },
  { name: 'update', description: '...', arguments: [...] }
]
// → ### create
//   ...
//   ### update
//   ...
```

### Boolean Rendering

| Pattern | Rendering |
|---------|-----------|
| In table | `✓` or `-` |
| Standalone | `**{Key}:** Yes/No` |

### Optional Fields

- Missing fields are omitted from output
- `null` renders as `N/A` or `-`
- Empty strings render as empty (or omitted based on config)

### Metadata Fields

Some fields are treated specially:

| Field | Rendering |
|-------|-----------|
| `$type` | YAML frontmatter |
| `$id` | YAML frontmatter |
| `name` | Title (`# {name}`) |
| `title` | Title (if no `name`) |
| `description` | First paragraph |
| `date`, `createdAt`, etc. | `**Date:** {value}` |

---

## Extraction Conventions

The inverse of projection. Markdown structure maps back to objects:

### Header → Object

```markdown
## Hero

### Persona
Sarah is...
```

→

```typescript
{
  hero: {
    persona: 'Sarah is...'
  }
}
```

### Table → Array of Objects

```markdown
| Property | Type | Required |
|----------|------|----------|
| id | string | ✓ |
| email | string | ✓ |
```

→

```typescript
{
  properties: [
    { property: 'id', type: 'string', required: true },
    { property: 'email', type: 'string', required: true }
  ]
}
```

**Note:** Column headers become keys. Header normalization:
- `Required` → `required`
- `User ID` → `userId` (camelCase)
- `✓`/`Yes`/`true` → `true`
- `-`/`No`/`false`/empty → `false`

### List → Array of Strings

```markdown
### Consequences
- Miss deadlines
- Burn out team
- Hire wrong people
```

→

```typescript
{
  consequences: [
    'Miss deadlines',
    'Burn out team',
    'Hire wrong people'
  ]
}
```

### Bold Key Pattern → Property

```markdown
**Type:** User
**Role:** authenticated
```

→

```typescript
{
  type: 'User',
  role: 'authenticated'
}
```

---

## Shape Hints (Annotations)

For cases where convention isn't enough, add hints to the shape:

```typescript
type Noun = {
  name: string
  plural: string

  /** @layout table */
  properties: Property[]

  /** @layout sections */
  actions: Action[]

  /** @render inline */
  extends: string
}
```

Or via a layout object:

```typescript
const NounLayout = {
  properties: { as: 'table', columns: ['name', 'type', 'description'] },
  actions: { as: 'sections', titleKey: 'name' },
  extends: { as: 'inline', prefix: 'Extends:' }
}

project(noun, { layout: NounLayout })
```

---

## API Design

```typescript
// @mdxld/shapes

// Convention-based (automatic)
export function project<T>(
  object: T,
  options?: ProjectOptions
): string

export function extract<T>(
  markdown: string,
  shape?: T | Schema,
  options?: ExtractOptions
): T

// Template-based (explicit)
export function render(
  template: string,
  props: Record<string, unknown>
): string

export function invert<T>(
  markdown: string,
  template: string,
  options?: InvertOptions
): T

// Utilities
export function diff<T>(
  original: T,
  extracted: T
): Diff<T>

export function validate(
  markdown: string,
  shape: Schema
): ValidationResult

// Options
interface ProjectOptions {
  layout?: LayoutConfig
  depth?: number          // Max header depth
  tableThreshold?: number // Max columns before switching to sections
}

interface ExtractOptions {
  strict?: boolean        // Throw on unmatched
  normalize?: boolean     // Normalize keys (camelCase, etc.)
  coerce?: boolean        // Coerce types (string → number, etc.)
}
```

---

## Package Structure

```
@mdxld/shapes/
├── src/
│   ├── project.ts      # Object → Markdown
│   ├── extract.ts      # Markdown → Object
│   ├── render.ts       # Template + Props → Markdown
│   ├── invert.ts       # Markdown + Template → Props
│   ├── conventions.ts  # Layout conventions
│   ├── schema.ts       # Shape/Schema utilities
│   ├── diff.ts         # Change detection
│   └── index.ts        # Public API
├── README.md
└── package.json
```

Or extend `@mdxld/extract` with these capabilities?

---

## Relationship to Existing Packages

| Package | Role |
|---------|------|
| `mdxld` | Core parsing: YAML frontmatter + Markdown body |
| `@mdxld/extract` | Template-based extraction (invert) |
| `@mdxld/shapes` | Convention-based projection/extraction |
| `@mdxld/compile` | MDX → JavaScript compilation |

`@mdxld/shapes` could either:
1. Be a new package that builds on `@mdxld/extract`
2. Be merged into `@mdxld/extract` with expanded scope

---

## Example: Full Round-Trip

```typescript
import { project, extract, diff } from '@mdxld/shapes'

// 1. Start with structured data
const original: StoryBrand = {
  name: 'Acme Corp',
  hero: { persona: 'Sarah is...', occupation: 'VP Engineering' },
  problem: { external: 'Hire fast', internal: 'Worried about deadlines' }
}

// 2. Project to markdown for editing
const markdown = project(original)

// 3. User/AI edits the markdown
const edited = markdown.replace(
  'Sarah is...',
  'Sarah is a 35-year-old engineering leader...'
)

// 4. Extract back to object
const updated = extract<StoryBrand>(edited)

// 5. See what changed
const changes = diff(original, updated)
// { modified: { 'hero.persona': { from: 'Sarah is...', to: '...' } } }

// 6. Apply or review changes
```

---

## Open Questions

1. **Naming**: Is `project`/`extract` the right pair? Alternatives:
   - `expand`/`collapse`
   - `serialize`/`deserialize`
   - `toMarkdown`/`fromMarkdown`
   - `render`/`parse`

2. **Package scope**: New `@mdxld/shapes` or expand `@mdxld/extract`?

3. **Schema source**: TypeScript types, JSON Schema, Zod, or all?

4. **Layout inference**: How smart should auto-layout be? ML-based?

5. **Ambiguity**: What when markdown could match multiple shapes?
