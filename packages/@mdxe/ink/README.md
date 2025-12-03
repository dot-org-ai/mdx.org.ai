# @mdxe/ink

Terminal rendering for MDX content using Ink and React. Render MDX documents beautifully in the CLI.

## Installation

```bash
npm install @mdxe/ink
# or
pnpm add @mdxe/ink
# or
yarn add @mdxe/ink
```

## Features

- **Terminal Rendering** - Render MDX as styled terminal output
- **React Components** - Use Ink components for rich formatting
- **Markdown Support** - Headings, lists, code blocks, links
- **Color Support** - Automatic color detection and theming
- **Interactive** - Full Ink interactivity support
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { renderToText, MDXDocument } from '@mdxe/ink'
import { parse } from 'mdxld'
import { render } from 'ink'

const doc = parse(`---
title: Hello CLI
---

# Welcome

This is **bold** and *italic* text.

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.log('Hello, World!')
\`\`\`
`)

// Render to string
const text = renderToText(doc)
console.log(text)

// Or render with Ink
render(<MDXDocument doc={doc} />)
```

## API Reference

### `MDXDocument`

React component for rendering an MDXLD document.

```typescript
function MDXDocument(props: MDXDocumentProps): React.ReactElement

interface MDXDocumentProps {
  doc: MDXLDDocument
  options?: RenderOptions
}

interface RenderOptions {
  colors?: boolean          // Enable colors (default: auto-detect)
  width?: number            // Max width (default: terminal width)
  showFrontmatter?: boolean // Show frontmatter (default: false)
  theme?: Theme             // Color theme
}
```

**Example:**

```typescript
import { render } from 'ink'
import { MDXDocument } from '@mdxe/ink'
import { parse } from 'mdxld'

const doc = parse(`---
title: My Document
---

# Hello World

Some content here.`)

render(
  <MDXDocument
    doc={doc}
    options={{
      colors: true,
      width: 80,
      showFrontmatter: true
    }}
  />
)
```

### `MDXContent`

Render just the content portion of an MDX document.

```typescript
function MDXContent(props: MDXContentProps): React.ReactElement

interface MDXContentProps {
  content: string
  options?: RenderOptions
}
```

**Example:**

```typescript
import { render } from 'ink'
import { MDXContent } from '@mdxe/ink'

render(
  <MDXContent
    content="# Hello\n\nThis is **markdown** content."
    options={{ colors: true }}
  />
)
```

### `renderToText(doc, options?)`

Render an MDXLD document to a plain text string.

```typescript
function renderToText(doc: MDXLDDocument, options?: RenderOptions): string
```

**Example:**

```typescript
import { renderToText } from '@mdxe/ink'
import { parse } from 'mdxld'

const doc = parse(`
# Hello

- Item 1
- Item 2
`)

const text = renderToText(doc, { colors: false })
console.log(text)
// Output:
// ╔═══════╗
// ║ Hello ║
// ╚═══════╝
//
// • Item 1
// • Item 2
```

### `renderToText` with Colors

When colors are enabled, the output includes ANSI escape codes:

```typescript
const text = renderToText(doc, { colors: true })
// Output includes ANSI color codes for syntax highlighting
```

## Theming

### Built-in Themes

```typescript
import { themes } from '@mdxe/ink'

const doc = parse(content)

renderToText(doc, { theme: themes.dark })
renderToText(doc, { theme: themes.light })
renderToText(doc, { theme: themes.monokai })
```

### Custom Theme

```typescript
import { renderToText } from '@mdxe/ink'

const customTheme = {
  heading: { color: 'cyan', bold: true },
  text: { color: 'white' },
  bold: { bold: true },
  italic: { italic: true },
  code: { color: 'yellow', backgroundColor: 'gray' },
  codeBlock: { color: 'green' },
  link: { color: 'blue', underline: true },
  listBullet: { color: 'magenta' },
  blockquote: { color: 'gray', italic: true }
}

const text = renderToText(doc, { theme: customTheme })
```

## Markdown Elements

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
```

Rendered with box borders and appropriate sizing:

```
╔═══════════╗
║ Heading 1 ║
╚═══════════╝

── Heading 2 ──

Heading 3
─────────
```

### Lists

```markdown
- Unordered item 1
- Unordered item 2

1. Ordered item 1
2. Ordered item 2
```

Output:

```
• Unordered item 1
• Unordered item 2

1. Ordered item 1
2. Ordered item 2
```

### Code Blocks

````markdown
```javascript
const greeting = 'Hello'
console.log(greeting)
```
````

Output with syntax highlighting:

```
┌─ javascript ────────────────┐
│ const greeting = 'Hello'    │
│ console.log(greeting)       │
└─────────────────────────────┘
```

### Inline Elements

```markdown
**bold text** and *italic text* and `inline code`
```

### Links

```markdown
[Link text](https://example.com)
```

Output:

```
Link text (https://example.com)
```

### Blockquotes

```markdown
> This is a quote
> with multiple lines
```

Output:

```
│ This is a quote
│ with multiple lines
```

## Examples

### CLI Documentation Viewer

```typescript
#!/usr/bin/env node
import { renderToText } from '@mdxe/ink'
import { parse } from 'mdxld'
import { readFileSync } from 'fs'

const file = process.argv[2]
const content = readFileSync(file, 'utf-8')
const doc = parse(content)

console.log(renderToText(doc, {
  colors: process.stdout.isTTY,
  width: process.stdout.columns || 80
}))
```

### Interactive Document Browser

```typescript
import { render, Box, Text, useInput } from 'ink'
import { MDXDocument } from '@mdxe/ink'
import { useState } from 'react'

function DocBrowser({ docs }) {
  const [index, setIndex] = useState(0)

  useInput((input, key) => {
    if (key.leftArrow) setIndex(i => Math.max(0, i - 1))
    if (key.rightArrow) setIndex(i => Math.min(docs.length - 1, i + 1))
    if (input === 'q') process.exit(0)
  })

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          Document {index + 1} of {docs.length} (← → to navigate, q to quit)
        </Text>
      </Box>
      <MDXDocument doc={docs[index]} />
    </Box>
  )
}

render(<DocBrowser docs={documents} />)
```

### Help Command

```typescript
import { renderToText } from '@mdxe/ink'
import { parse } from 'mdxld'

function showHelp() {
  const helpDoc = parse(`
# My CLI Tool

A powerful command-line utility.

## Usage

\`\`\`bash
mycli <command> [options]
\`\`\`

## Commands

- **init** - Initialize a new project
- **build** - Build the project
- **deploy** - Deploy to production

## Options

- \`--help, -h\` - Show help
- \`--version, -v\` - Show version
- \`--verbose\` - Enable verbose output

## Examples

\`\`\`bash
mycli init my-project
mycli build --verbose
mycli deploy --production
\`\`\`
`)

  console.log(renderToText(helpDoc, { colors: true }))
}
```

### Progress Display with MDX

```typescript
import { render, Box } from 'ink'
import { MDXContent } from '@mdxe/ink'
import { useState, useEffect } from 'react'

function ProgressDisplay() {
  const [step, setStep] = useState(0)

  const steps = [
    '## Step 1\n\nInstalling dependencies...',
    '## Step 2\n\nBuilding project...',
    '## Step 3\n\n**Complete!** ✓'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1))
    }, 2000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Box flexDirection="column">
      <MDXContent content={steps[step]} />
    </Box>
  )
}

render(<ProgressDisplay />)
```

## Integration

### With Commander.js

```typescript
import { Command } from 'commander'
import { renderToText } from '@mdxe/ink'
import { parse } from 'mdxld'

const program = new Command()

program
  .command('docs <topic>')
  .description('Show documentation')
  .action(async (topic) => {
    const content = await fetchDocs(topic)
    const doc = parse(content)
    console.log(renderToText(doc, { colors: true }))
  })

program.parse()
```

### With Inquirer

```typescript
import inquirer from 'inquirer'
import { renderToText } from '@mdxe/ink'

const docs = await loadAllDocs()

const { selected } = await inquirer.prompt([{
  type: 'list',
  name: 'selected',
  message: 'Select a document:',
  choices: docs.map(d => ({ name: d.data.title, value: d }))
}])

console.log(renderToText(selected, { colors: true }))
```

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument<TData = Record<string, unknown>> {
  data: TData & {
    title?: string
    [key: string]: unknown
  }
  content: string
}
```

### `Theme`

```typescript
interface Theme {
  heading?: TextStyle
  text?: TextStyle
  bold?: TextStyle
  italic?: TextStyle
  code?: TextStyle
  codeBlock?: TextStyle
  link?: TextStyle
  listBullet?: TextStyle
  blockquote?: TextStyle
}

interface TextStyle {
  color?: string
  backgroundColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [ink](https://www.npmjs.com/package/ink) | React for CLI |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation |

## License

MIT
