# @mdxui/payload

Custom Payload CMS UI components for editing MDX-LD content. **All JSON fields automatically become MDXLD editors** - no manual configuration needed.

## Installation

```bash
pnpm add @mdxui/payload
```

## Quick Start

Just add the plugin to your Payload config - that's it:

```typescript
// payload.config.ts
import { buildConfig } from 'payload'
import { mdxldPlugin } from '@mdxui/payload'

export default buildConfig({
  plugins: [mdxldPlugin()],
  collections: [
    {
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'content', type: 'json' }, // Automatically uses MDXLD editor!
      ],
    },
  ],
})
```

Every JSON field in your collections and globals will now use the MDXLD editor with:
- Split view for YAML frontmatter and MDX content
- Real-time validation
- JSON-LD metadata support
- Syntax highlighting

## Plugin Options

```typescript
mdxldPlugin({
  // Only convert fields with custom.mdxld = true
  optIn: false, // default: false (convert ALL JSON fields)

  // Default editor mode for all fields
  defaultMode: 'split', // 'split' | 'yaml' | 'mdx' | 'json'

  // Exclude specific fields by name
  exclude: ['settings', 'rawConfig'],

  // Exclude entire collections
  excludeCollections: ['system-logs'],

  // Exclude globals
  excludeGlobals: ['site-settings'],

  // Enable debug logging
  debug: false,
})
```

## Opt-Out Specific Fields

If you want to keep the default JSON editor for specific fields:

```typescript
{
  name: 'rawData',
  type: 'json',
  custom: { mdxld: false }, // Uses default JSON editor
}
```

## Opt-In Mode

If you prefer to explicitly enable MDXLD for specific fields:

```typescript
// Plugin config
mdxldPlugin({ optIn: true })

// In your collection
{
  name: 'content',
  type: 'json',
  custom: { mdxld: true }, // Explicitly enable MDXLD
}
```

## Editor Modes

| Mode | Description |
|------|-------------|
| `split` | Side-by-side YAML frontmatter and MDX content (default) |
| `yaml` | Only YAML frontmatter editing |
| `mdx` | Only MDX content editing |
| `json` | Raw MDX-LD source editing |

Set per-field mode:

```typescript
{
  name: 'content',
  type: 'json',
  custom: { editorMode: 'yaml' },
}
```

## MDX-LD Format

The editor works with MDX-LD documents that combine YAML-LD frontmatter with MDX content:

```mdx
---
$type: Article
$id: https://example.com/posts/hello
title: Hello World
author: John Doe
publishedAt: 2024-01-15
tags:
  - hello
  - world
---

# Hello World

This is my first post written in **MDX**.

<CustomComponent />
```

## Standalone Editor Component

Use the editor component directly in custom views:

```tsx
import { MDXLDEditor } from '@mdxui/payload'

function ContentEditor() {
  const [content, setContent] = useState('')

  return (
    <MDXLDEditor
      value={content}
      onChange={setContent}
      mode="split"
      theme="dark"
      minHeight={400}
    />
  )
}
```

## Card/Table View Toggle

Add a view toggle to all collections - switch between table and card views:

```typescript
import { buildConfig } from 'payload'
import { viewsPlugin } from '@mdxui/payload'

export default buildConfig({
  plugins: [viewsPlugin()],
  collections: [...],
})
```

### Auto-Select Default View

The plugin automatically selects the best view based on field count:
- **Table view**: Collections with 5 or fewer columns
- **Card view**: Collections with more than 5 columns

Configure the threshold:

```typescript
viewsPlugin({
  defaults: {
    cardThreshold: 4, // Switch to card if > 4 columns
    defaultMode: 'auto', // 'auto' | 'table' | 'card'
  },
})
```

### Card View Configuration

Customize how cards are rendered:

```typescript
viewsPlugin({
  cardDefaults: {
    titleField: 'name',      // Field for card title
    subtitleField: 'description', // Field for subtitle
    imageField: 'thumbnail', // Field for card image
    metaFields: ['status', 'createdAt'], // Additional metadata
    size: 'medium',          // 'small' | 'medium' | 'large'
  },
})
```

### Per-Collection Configuration

```typescript
viewsPlugin({
  collections: {
    media: {
      toggle: { defaultMode: 'card' },
      card: { imageField: 'url', size: 'large' },
    },
    posts: {
      card: {
        titleField: 'title',
        subtitleField: 'excerpt',
        imageField: 'featuredImage',
      },
    },
    users: { disabled: true }, // Keep default table view
  },
})
```

### User Preferences

View preferences are persisted per-collection in localStorage, so users keep their preferred view across sessions.

## Using Both Plugins

Use both plugins together for the full experience:

```typescript
import { buildConfig } from 'payload'
import { mdxldPlugin, viewsPlugin } from '@mdxui/payload'

export default buildConfig({
  plugins: [
    mdxldPlugin(),  // MDXLD editor for JSON fields
    viewsPlugin(),  // Card/table toggle for lists
  ],
  collections: [...],
})
```

## Related Packages

- `mdxld` - Parse and stringify MDX-LD documents
- `@mdxdb/payload` - Database adapter for Payload CMS
- `@mdxe/payload` - Run Payload on Cloudflare Workers

## License

MIT
