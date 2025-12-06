# @mdxui/storybook

Storybook integration for MDXUI components. Preview components across all output formats - HTML, Markdown, JSON, and more.

## Installation

```bash
pnpm add @mdxui/storybook
```

## Overview

`@mdxui/storybook` extends Storybook to display components rendered to **multiple output formats**, not just HTML/DOM.

```
┌─────────────────────────────────────────────────────────┐
│  Component: Customer                                     │
├─────────────────────────────────────────────────────────┤
│  [HTML] [Markdown] [JSON] [JSON-LD] [Schema]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  # Customer (Customers)                                 │
│                                                         │
│  A person who purchases products.                       │
│                                                         │
│  ## Properties                                          │
│                                                         │
│  | Property | Type   | Required |                       │
│  |----------|--------|----------|                       │
│  | id       | string | ✓        |                       │
│  | email    | string | ✓        |                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Features

- **Multi-format preview** - See HTML, Markdown, JSON side-by-side
- **Code panel** - Syntax-highlighted output for non-HTML formats
- **Editor panel** - Edit markdown/JSON and see extraction results
- **Diff view** - Compare original vs extracted data
- **Format tabs** - Switch between output formats
- **Copy button** - Copy rendered output to clipboard

## Quick Start

### Configure Storybook

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  addons: [
    '@mdxui/storybook',
    // ... other addons
  ],
}

export default config
```

### Write Stories

```tsx
// Customer.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Customer } from './Customer'

const meta: Meta<typeof Customer> = {
  component: Customer,
  parameters: {
    mdxui: {
      formats: ['html', 'markdown', 'json', 'jsonld'],
    },
  },
}

export default meta

export const Default: StoryObj<typeof Customer> = {
  args: {
    name: 'Acme Corp',
    email: 'hello@acme.com',
    tier: 'enterprise',
  },
}
```

## Panels

### Code Panel

Displays syntax-highlighted output for any format:

```tsx
parameters: {
  mdxui: {
    formats: ['markdown', 'json', 'jsonld', 'jsonschema', 'openapi'],
    defaultFormat: 'markdown',
  },
}
```

The Code panel shows:
- Syntax highlighting (markdown, json, yaml, graphql)
- Line numbers
- Copy to clipboard
- Download as file

### Editor Panel

Interactive editing with bi-directional extraction:

```tsx
parameters: {
  mdxui: {
    editor: true,
    extractOnChange: true,
  },
}
```

The Editor panel allows:
1. View rendered markdown/JSON
2. Edit the output
3. See extracted data in real-time
4. Compare diff with original

### Schema Panel

View generated schemas:

```tsx
parameters: {
  mdxui: {
    schemas: ['jsonschema', 'openapi', 'graphql', 'mcp'],
  },
}
```

## Components

### `<Code />`

Syntax-highlighted code display:

```tsx
import { Code } from '@mdxui/storybook'

<Code
  language="markdown"
  value={markdownOutput}
  showLineNumbers
  copyButton
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `language` | `string` | `'text'` | Syntax highlighting language |
| `value` | `string` | - | Code content |
| `showLineNumbers` | `boolean` | `false` | Show line numbers |
| `copyButton` | `boolean` | `true` | Show copy button |
| `wrap` | `boolean` | `false` | Wrap long lines |
| `maxHeight` | `string` | `'400px'` | Max height before scroll |

### `<Editor />`

Editable code with extraction:

```tsx
import { Editor } from '@mdxui/storybook'

<Editor
  language="markdown"
  value={markdownOutput}
  onChange={handleChange}
  onExtract={handleExtract}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `language` | `string` | `'markdown'` | Editor language |
| `value` | `string` | - | Initial content |
| `onChange` | `(value: string) => void` | - | Change handler |
| `onExtract` | `(data: object) => void` | - | Extraction handler |
| `schema` | `object` | - | Shape for extraction |
| `readOnly` | `boolean` | `false` | Disable editing |

### `<FormatTabs />`

Tab switcher for output formats:

```tsx
import { FormatTabs } from '@mdxui/storybook'

<FormatTabs
  formats={['html', 'markdown', 'json']}
  active="markdown"
  onChange={setFormat}
/>
```

### `<DiffView />`

Side-by-side diff comparison:

```tsx
import { DiffView } from '@mdxui/storybook'

<DiffView
  original={originalData}
  extracted={extractedData}
  format="json"
/>
```

## Decorators

### `withMultiFormat`

Wrap stories to enable multi-format rendering:

```tsx
import { withMultiFormat } from '@mdxui/storybook'

export default {
  decorators: [withMultiFormat],
  parameters: {
    mdxui: {
      formats: ['html', 'markdown', 'json'],
    },
  },
}
```

### `withExtraction`

Enable bi-directional editing:

```tsx
import { withExtraction } from '@mdxui/storybook'

export default {
  decorators: [withExtraction],
  parameters: {
    mdxui: {
      editor: true,
    },
  },
}
```

## Configuration

### Global Configuration

```ts
// .storybook/preview.ts
import { withMultiFormat } from '@mdxui/storybook'

export default {
  decorators: [withMultiFormat],
  parameters: {
    mdxui: {
      // Default formats for all stories
      formats: ['html', 'markdown', 'json'],

      // Default format to show
      defaultFormat: 'html',

      // Enable editor panel
      editor: false,

      // Theme for code blocks
      codeTheme: 'github-dark',

      // Show line numbers
      lineNumbers: true,
    },
  },
}
```

### Per-Story Configuration

```tsx
export const WithAllFormats: StoryObj = {
  parameters: {
    mdxui: {
      formats: ['html', 'markdown', 'json', 'jsonld', 'jsonschema', 'openapi', 'graphql', 'mcp'],
      editor: true,
    },
  },
}
```

## Format Renderers

Register custom format renderers:

```tsx
// .storybook/preview.ts
import { registerFormat } from '@mdxui/storybook'
import { toYAML } from 'my-yaml-lib'

registerFormat({
  name: 'yaml',
  label: 'YAML',
  language: 'yaml',
  render: (component, props) => toYAML(props),
})
```

## Example: Full Component Story

```tsx
// StoryBrand.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { StoryBrand } from './StoryBrand'

const meta: Meta<typeof StoryBrand> = {
  component: StoryBrand,
  parameters: {
    mdxui: {
      formats: ['html', 'markdown', 'json'],
      editor: true,
      schemas: ['jsonschema'],
    },
  },
}

export default meta

export const AcmeCorp: StoryObj<typeof StoryBrand> = {
  args: {
    name: 'Acme Corp',
    hero: {
      persona: 'Sarah is a 35-year-old VP of Engineering...',
      occupation: 'VP of Engineering',
      company: 'Series B SaaS startup',
    },
    problem: {
      external: 'Hire engineers quickly',
      internal: 'Worried about missing deadlines',
      philosophical: 'Growing shouldn\'t mean sacrificing quality',
    },
  },
}

export const EditableMarkdown: StoryObj<typeof StoryBrand> = {
  parameters: {
    mdxui: {
      defaultFormat: 'markdown',
      editor: true,
      extractOnChange: true,
    },
  },
  args: {
    // ... same args
  },
}
```

## Integration with @mdxld

The addon uses `@mdxld/*` packages for rendering:

```tsx
import { toMarkdown } from '@mdxld/markdown'
import { toJSON, toJSONLD, toJSONSchema } from '@mdxld/json'
import { toHTML } from '@mdxld/html'

// Automatically renders component to each format
const outputs = {
  html: toHTML(props),
  markdown: toMarkdown(props),
  json: toJSON(props),
  jsonld: toJSONLD(props),
  jsonschema: toJSONSchema(ComponentType),
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/markdown`](../../../@mdxld/markdown) | `toMarkdown()` / `fromMarkdown()` |
| [`@mdxld/json`](../../../@mdxld/json) | `toJSON()` / `toJSONLD()` |
| [`@mdxld/html`](../../../@mdxld/html) | `toHTML()` / `fromHTML()` |
| [`@mdxui/editor`](../editor) | Standalone editor component |

## License

MIT
