# @mdxld/extract

Bi-directional MDX ↔ Markdown translation. Extract structured data from rendered markdown using MDX templates.

## The Problem

MDX templates combine structured data with content:

```mdx
---
$type: BlogPost
title: Hello World
author: Jane Doe
---

# {data.title}

*By {data.author}*

{data.content}
```

When rendered, this produces markdown. But what if someone edits that markdown? Can we reverse the process to update the structured data?

```
Forward:  MDX Template + Props → Rendered Markdown  (standard MDX)
Reverse:  Rendered Markdown + MDX Template → Props  (this package!)
```

**@mdxld/extract enables that reverse translation.**

## Installation

```bash
pnpm add @mdxld/extract
```

## Quick Start

```typescript
import { extract } from '@mdxld/extract'

const template = `# {data.title}

## Description
{data.description}`

const rendered = `# Hello World

## Description
This is my first document.`

const result = extract({ template, rendered })

console.log(result.data)
// {
//   data: {
//     title: 'Hello World',
//     description: 'This is my first document.'
//   }
// }
```

## Features

- 🔄 **Pattern-based extraction** - Converts templates to regex patterns for fast extraction
- 🧩 **Component extractors** - Define custom render/extract pairs for components
- 📊 **Diff utilities** - Track changes between original and extracted data
- ✅ **Template validation** - Check if templates are extractable before use
- 🤖 **AI-assisted extraction** - Fall back to AI for complex patterns (conditionals, loops)
- 🔌 **mdxdb integration** - Works seamlessly with the mdxdb ecosystem

## Core Concepts

### Templates and Slots

Templates contain **slots** - placeholders for dynamic content:

```mdx
# {data.title}           <!-- Expression slot -->

<Table rows={data.rows} />  <!-- Component slot -->

{show ? "Yes" : "No"}    <!-- Conditional slot -->

{items.map(i => i.name)} <!-- Loop slot -->
```

| Slot Type | Pattern | Extractable |
|-----------|---------|-------------|
| Expression | `{data.title}` | ✅ Yes |
| Component | `<Table />` | ✅ With extractor |
| Conditional | `{x ? y : z}` | 🤖 Needs AI |
| Loop | `{items.map(...)}` | 🤖 Needs AI |

### Extraction Process

1. **Parse template** → Find all slots and their types
2. **Build pattern** → Convert template to regex with named captures
3. **Match content** → Apply pattern to rendered markdown
4. **Extract values** → Reconstruct structured data from matches

## API Reference

### `extract(options): ExtractResult`

Extract structured data from rendered content.

```typescript
interface ExtractOptions {
  template: string                           // MDX template with slots
  rendered: string                           // Rendered markdown
  components?: Record<string, ComponentExtractor>  // Custom extractors
  strict?: boolean                           // Throw on unmatched slots
}

interface ExtractResult<T> {
  data: T                    // Extracted structured data
  confidence: number         // 0-1 confidence score
  unmatched: string[]        // Slots that couldn't be extracted
  aiAssisted: boolean        // Whether AI was used
  debug?: ExtractDebugInfo   // Debug information
}
```

### `roundTripComponent(config): RoundTripComponent`

Create a component that supports both render and extract:

```typescript
const PropertyTable = roundTripComponent({
  render: (props: { properties: Property[] }) => {
    const header = '| Name | Type |\n|---|---|'
    const rows = props.properties.map(p => `| ${p.name} | ${p.type} |`)
    return `${header}\n${rows.join('\n')}`
  },
  extract: (content: string) => {
    const rows = content.split('\n').filter(r =>
      r.startsWith('|') && !r.includes('---')
    ).slice(1) // Skip header
    return {
      properties: rows.map(row => {
        const [, name, type] = row.split('|').map(s => s.trim())
        return { name, type }
      })
    }
  }
})

// Full round-trip
const original = { properties: [{ name: 'id', type: 'string' }] }
const rendered = PropertyTable.render(original)
const extracted = PropertyTable.extract(rendered)
// extracted === original
```

### `diff(original, extracted): ExtractDiff`

Compute the diff between original and extracted data:

```typescript
const original = { title: 'Hello', author: 'Jane' }
const extracted = { title: 'Updated', author: 'Jane', tags: ['new'] }

const changes = diff(original, extracted)
// {
//   added: { tags: ['new'] },
//   modified: { title: { from: 'Hello', to: 'Updated' } },
//   removed: [],
//   hasChanges: true
// }
```

### `applyExtract(original, extracted, options): T`

Apply extracted data to original document:

```typescript
const original = { title: 'Hello', content: 'Original' }
const extracted = { title: 'Updated' }

const merged = applyExtract(original, extracted)
// { title: 'Updated', content: 'Original' }

// With array merge strategies
applyExtract(
  { tags: ['a', 'b'] },
  { tags: ['c'] },
  { arrayMerge: 'append' }
)
// { tags: ['a', 'b', 'c'] }
```

### `validateTemplate(template): ValidationResult`

Check if a template can be used for extraction:

```typescript
const result = validateTemplate(`
# {data.title}
<Table rows={data.rows} />
{show ? "A" : "B"}
`)

console.log(result)
// {
//   valid: false,
//   extractable: ['data.title'],
//   needsAI: ['<Table />', 'show ? "A" : "B"'],
//   warnings: ['Component <Table /> requires a custom extractor', ...]
// }
```

### `parseTemplateSlots(template): TemplateSlot[]`

Parse a template to get all slots:

```typescript
const slots = parseTemplateSlots('# {data.title}\n\n<Hero />')
// [
//   { path: 'data.title', type: 'expression', start: 2, end: 14 },
//   { path: 'Hero', type: 'component', componentName: 'Hero', ... }
// ]
```

## Use Cases

### 1. Headless CMS

Edit rendered content in a rich text editor, sync changes back to structured frontmatter:

```typescript
// User edits the rendered markdown in WYSIWYG editor
const editedContent = `# Updated Title

## Description
New description with user changes.`

// Extract changes back to structured data
const result = extract({ template, rendered: editedContent })

// Merge with original document
const updated = applyExtract(originalDoc, result.data)

// Save to mdxdb
await db.BlogPost.update(id, updated)
```

### 2. AI Content Editing

Let AI improve content, then extract the changes:

```typescript
// AI improves the rendered markdown
const improved = await ai.improve(renderedMarkdown, 'Make it more engaging')

// Extract what changed
const result = extract({ template, rendered: improved })
const changes = diff(original, result.data)

// Review changes before applying
console.log('AI changed:', Object.keys(changes.modified))

// Apply approved changes
const final = applyExtract(original, result.data, {
  paths: ['data.title', 'data.description'] // Only these fields
})
```

### 3. Schema.org Types

Extract type information from rendered schema documentation:

```typescript
const schemaTemplate = `# {type.label}

## Description
{type.comment}

## Parent Type
{type.subClassOf}

## Properties
<PropertyTable properties={type.properties} />`

const rendered = `# Person

## Description
A person (alive, dead, undead, or fictional).

## Parent Type
Thing

## Properties
| Name | Type | Description |
|---|---|---|
| givenName | Text | First name |
| familyName | Text | Last name |`

const result = extract({
  template: schemaTemplate,
  rendered,
  components: { PropertyTable: PropertyTable.extractor }
})

console.log(result.data.type)
// {
//   label: 'Person',
//   comment: 'A person...',
//   subClassOf: 'Thing',
//   properties: [{ name: 'givenName', ... }, ...]
// }
```

### 4. mdxdb Integration

Full bi-directional sync with mdxdb:

```typescript
import { DB } from 'ai-database'
import { extract, diff, applyExtract } from '@mdxld/extract'

const db = DB({
  BlogPost: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts'
  }
})

// Get document
const post = await db.BlogPost.get('hello-world')

// Render to markdown (via MDX evaluation)
const rendered = await renderMDX(post, template)

// User/AI edits the markdown...
const edited = await editor.edit(rendered)

// Extract changes
const result = extract({ template, rendered: edited })
const changes = diff(post, result.data)

if (changes.hasChanges) {
  // Apply and save
  const updated = applyExtract(post, result.data)
  await db.BlogPost.update('hello-world', updated)
}
```

## Architecture

`@mdxld/extract` is the **template-based** extraction layer. For **convention-based** extraction, see the format packages:

```
┌─────────────────────────────────────────────────────────────┐
│                    Bi-directional Conversion                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Convention-based (auto layout):                            │
│  ┌─────────────────┐       ┌─────────────────┐             │
│  │ @mdxld/markdown │  ↔    │    toMarkdown   │             │
│  │ @mdxld/json     │  ↔    │    fromMarkdown │             │
│  │ @mdxld/html     │       │    etc.         │             │
│  └─────────────────┘       └─────────────────┘             │
│                                                             │
│  Template-based (explicit layout):                          │
│  ┌─────────────────┐       ┌─────────────────┐             │
│  │ @mdxld/extract  │  ↔    │    extract()    │  ← this pkg │
│  │                 │       │    render()     │             │
│  └─────────────────┘       └─────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Approach | Package | Use Case |
|----------|---------|----------|
| **Convention** | `@mdxld/markdown` | Auto layout based on object shape |
| **Template** | `@mdxld/extract` | Explicit MDX template with slots |

### When to Use Each

**Use `@mdxld/markdown`** (convention-based):
- Automatic rendering from object structure
- Standard layouts (entities, tables, sections)
- No custom template needed

```typescript
import { toMarkdown, fromMarkdown } from '@mdxld/markdown'

const md = toMarkdown(customer)      // Auto layout
const obj = fromMarkdown(md)         // Extract back
```

**Use `@mdxld/extract`** (template-based):
- Custom MDX templates with specific layouts
- Complex component extraction
- Precise control over rendering

```typescript
import { extract, render } from '@mdxld/extract'

const md = render(template, props)   // Explicit template
const obj = extract({ template, rendered: md })
```

## Integration with @mdxld Ecosystem

```
@mdxld/extract integrates with:

@mdxld/markdown
├── Convention-based toMarkdown/fromMarkdown
└── @mdxld/extract adds template-based extraction

@mdxld/jsx
├── Universal JSX runtime
├── Semantic primitives (Entity, Property, etc.)
└── @mdxld/extract for template extraction

mdxdb (storage)
├── Store source MDX
├── Query documents
└── Update with extracted changes

@mdxe/* (execution)
├── Render MDX to markdown
├── Evaluate templates
└── @mdxld/extract ← Reverse the rendering
```

## Entity Components for Relationships

The package includes pre-built components for rendering and extracting entity relationships. These are designed for views like `[Posts].mdx` and `[Tags].mdx` that render related entities.

### Simple Syntax

Entity components use the entity type as the component name:

```tsx
// Just works - auto-detects columns from entity data
<Tags />

// Optional column override
<Tags columns={['name', 'slug']} />

// Optional filter props
<Posts published={true} />

// List format instead of table
<Authors format="list" />
```

### `createEntityComponent(type, options?)`

Create a round-trip component for an entity type:

```typescript
import { createEntityComponent } from '@mdxld/extract'

const Tags = createEntityComponent('Tag')

// Render to markdown table
const rendered = Tags.render({
  items: [
    { $id: 'js', name: 'JavaScript', count: 5 },
    { $id: 'ts', name: 'TypeScript', count: 3 },
  ],
  columns: ['name', 'count'],
})
// | name | count |
// |---|---|
// | JavaScript | 5 |
// | TypeScript | 3 |

// Extract back from markdown
const extracted = Tags.extract(rendered)
// { items: [{ $id: '0', name: 'JavaScript', count: '5', $type: 'Tag' }, ...], columns: ['name', 'count'] }
```

### `getEntityComponent(name, options?)`

Get or create a cached entity component. Handles pluralization automatically:

```typescript
import { getEntityComponent } from '@mdxld/extract'

const Tags = getEntityComponent('Tags')     // type = 'Tag'
const Posts = getEntityComponent('Posts')   // type = 'Post'
const Categories = getEntityComponent('Categories')  // type = 'Category'

// Components are cached - same instance returned
getEntityComponent('Tags') === getEntityComponent('Tags')  // true
```

### `createEntityExtractors(template)`

Auto-discover entity components in a template and create extractors:

```typescript
import { createEntityExtractors } from '@mdxld/extract'

const template = `# {name}

## Posts
<Posts />

## Related Tags
<Tags published={true} />
`

const extractors = createEntityExtractors(template)
// { Posts: PostsExtractor, Tags: TagsExtractor }

// Use with extract()
const result = extract({
  template,
  rendered: editedMarkdown,
  components: extractors,
})
```

### `diffEntities(before, after)`

Track changes between two entity lists:

```typescript
import { diffEntities } from '@mdxld/extract'

const before = [
  { $id: 'js', name: 'JavaScript' },
  { $id: 'ts', name: 'TypeScript' },
]

const after = [
  { $id: 'js', name: 'JavaScript (Updated)' },
  { $id: 'go', name: 'Go' },
]

const changes = diffEntities(before, after)
// [
//   { type: 'add', entityId: 'go', data: { $id: 'go', name: 'Go' } },
//   { type: 'remove', entityId: 'ts', previousData: { $id: 'ts', name: 'TypeScript' } },
//   { type: 'update', entityId: 'js', data: { ... }, previousData: { ... } }
// ]
```

### Render Formats

Entity components support multiple output formats:

```typescript
// Table format (default)
<Posts />
// | title | date |
// |---|---|
// | Hello | 2024-01-01 |

// List format
<Posts format="list" />
// - Hello
// - World

// List with links
const Posts = createEntityComponent('Post', {
  format: 'list',
  linkPattern: '/posts/{$id}'
})
// - [Hello](/posts/hello)
// - [World](/posts/world)
```

### Integration with mdxdb Views

Entity components are designed to work with mdxdb's ViewManager for bi-directional relationship sync:

```typescript
import { createFsViewManager } from '@mdxdb/fs'

const views = createFsViewManager(config, provider)

// Render: Entity → Markdown with related entities as tables
const { markdown, entities } = await views.render('[Tag]', {
  entityUrl: 'https://localhost/Tag/javascript'
})

// Sync: Markdown → Relationship mutations
const { mutations, created } = await views.sync('[Tag]', {
  entityUrl: 'https://localhost/Tag/javascript'
}, editedMarkdown)

// mutations = [{ type: 'add', predicate: 'posts', from: '...', to: '...' }]
```

## Limitations

### What Works Well

- ✅ Simple interpolation: `{data.title}`
- ✅ Nested paths: `{user.profile.name}`
- ✅ Section patterns: Headers create natural boundaries
- ✅ Components with extractors

### What Needs AI

- 🤖 Conditionals: `{show ? "A" : "B"}`
- 🤖 Loops: `{items.map(i => ...)}`
- 🤖 Complex expressions with logic
- 🤖 Heavily edited content that doesn't match template

### Best Practices

1. **Design extractable templates** - Use clear section headers as boundaries
2. **Prefer simple slots** - `{data.title}` over `{data.title.toUpperCase()}`
3. **Create component extractors** - For any custom components
4. **Validate templates** - Use `validateTemplate()` to check extractability
5. **Handle partial matches** - Check `confidence` score before applying changes

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.
