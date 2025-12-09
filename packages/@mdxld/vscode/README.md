# MDXLD Language Support for VSCode

Enhanced MDX editing support with YAML-LD frontmatter, GFM syntax highlighting, embedded languages, mermaid diagram preview, and TypeScript type visualization.

## Features

### Syntax Highlighting

Full syntax highlighting for MDXLD files (`.mdx`) including:

- **YAML-LD Frontmatter** - JSON-LD properties (`$type`, `$id`, `$context`) in YAML frontmatter
- **GFM Markdown** - GitHub Flavored Markdown with task lists, tables, strikethrough
- **JSX Components** - React/JSX component syntax highlighting
- **Import/Export** - ES module imports and exports with TypeScript support

### Embedded Language Support

Syntax highlighting for code blocks:

```mdx
\`\`\`typescript {title="example.ts"}
interface User {
  name: string
}
\`\`\`

\`\`\`sql
SELECT * FROM users WHERE active = true
\`\`\`

\`\`\`mermaid
flowchart TD
    A[Start] --> B[End]
\`\`\`
```

Supported languages: TypeScript, JavaScript, SQL, YAML, JSON, Mermaid

### Inline Tagged Templates

Syntax highlighting for inline tagged template literals:

```mdx
const config = yaml`
  key: value
  nested:
    a: 1
`

const query = sql`SELECT * FROM users`

const data = csv`name,age
Alice,30
Bob,25`
```

Supported tags: `yaml`, `sql`, `csv`, `tsv`, `json`

### Mermaid Diagram Preview

Preview mermaid diagrams directly in VSCode:

1. Open an MDX file containing mermaid code blocks
2. Run command: **MDXLD: Preview Mermaid Diagram** (Cmd+Shift+P)
3. A side panel opens with rendered diagrams

Supported diagram types:
- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- Entity relationship diagrams
- Gantt charts
- And more...

### TypeScript Type Visualization

Hover over import/export statements to see type information:

- **Type imports** - Shows which imports are type-only (stripped at runtime)
- **Value imports** - Shows which imports are kept for runtime
- **Type exports** - Identifies type-only exports

Run **MDXLD: Show TypeScript Type Information** to see a full analysis in the output panel.

### Diagnostics

Real-time validation for:
- Mermaid diagram syntax errors
- Invalid diagram references

## Commands

| Command | Description |
|---------|-------------|
| `mdxld.previewMermaid` | Preview Mermaid Diagram |
| `mdxld.extractTypeInfo` | Show TypeScript Type Information |
| `mdxld.formatDocument` | Format MDXLD Document |

## Configuration

```json
{
  "mdxld.format.onSave": true,
  "mdxld.validate.enabled": true,
  "mdxld.mermaid.preview": true,
  "mdxld.typescript.stripTypes": true
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `mdxld.format.onSave` | `true` | Format MDXLD files on save |
| `mdxld.validate.enabled` | `true` | Enable MDXLD validation |
| `mdxld.mermaid.preview` | `true` | Enable mermaid diagram preview |
| `mdxld.typescript.stripTypes` | `true` | Strip TypeScript types in compiled output |

## Installation

### From VSIX (Local)

```bash
code --install-extension mdxld-vscode-1.9.0.vsix
```

Or in VSCode:
1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Run **Extensions: Install from VSIX...**
3. Select the `.vsix` file

### From Marketplace

```bash
code --install-extension mdxld.mdxld-vscode
```

## File Associations

The extension automatically associates `.mdx` files with the `mdxld` language. Files are recognized with:

- YAML-LD frontmatter (`$type`, `$id`, `$context`)
- MDX component syntax
- ES module imports/exports

## Example MDXLD Document

```mdx
---
$type: BlogPost
$id: https://example.com/posts/hello-world
title: Hello World
author: Jane Doe
publishedAt: 2024-01-15
---

import { Card, Button } from '@/components'
import type { ComponentProps } from 'react'

export const metadata = {
  description: 'My first blog post',
}

# Hello World

Welcome to my **first** blog post!

<Card title="Featured">
  <Button>Click me</Button>
</Card>

## Architecture

\`\`\`mermaid
flowchart LR
    User --> App
    App --> API
    API --> Database
\`\`\`

## Code Example

\`\`\`typescript
interface Post {
  title: string
  content: string
}
\`\`\`
```

## Development

### Build

```bash
pnpm build
```

### Test

```bash
# Unit tests
pnpm test

# Integration tests (requires VSCode)
pnpm test:integration
```

### Package

```bash
pnpm package
```

## Related Packages

- [@mdxld/remark](../remark) - Remark plugin for MDXLD processing
- [@mdxld/jsx](../jsx) - MDX compilation with JSX support
- [mdxld](../../mdxld) - Core MDXLD parsing library

## License

MIT
