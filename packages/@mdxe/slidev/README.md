# @mdxe/slidev

Slidev presentation runtime for rendering MDX content as slides.

## Installation

```bash
pnpm add @mdxe/slidev
```

## Usage

### Convert MDX to Slidev

```typescript
import { toSlidev } from '@mdxe/slidev'
import { parse } from 'mdxld'
import { writeFileSync } from 'fs'

const mdxContent = `
---
title: My Presentation
author: John Doe
---

# Introduction

Welcome to my presentation!

---

## Features

- Slide separators with ---
- Code highlighting
- Speaker notes

---

## Code Example

\`\`\`typescript
const hello = "world"
\`\`\`

<!-- notes -->
Remember to explain the code here.
`

const doc = parse(mdxContent)
const slidev = toSlidev(doc, { theme: 'seriph' })

writeFileSync('slides.md', slidev.markdown)
```

### Run Presentation

```typescript
import { getSlidevCommand } from '@mdxe/slidev'
import { exec } from 'child_process'

const cmd = getSlidevCommand('slides.md', {
  port: 3030,
  open: true,
})

exec(cmd) // npx slidev slides.md --port 3030 --open
```

### Export to PDF

```typescript
import { getSlidevExportCommand } from '@mdxe/slidev'

const cmd = getSlidevExportCommand('slides.md', 'presentation.pdf', 'pdf')
exec(cmd) // npx slidev export slides.md --output presentation.pdf --format pdf
```

### Configuration

```typescript
import { toSlidev, type SlidevConfig } from '@mdxe/slidev'

const config: SlidevConfig = {
  theme: 'seriph',           // Slidev theme
  highlighter: 'shiki',      // Code highlighter
  lineNumbers: true,         // Show line numbers
  transition: 'slide-left',  // Slide transition
  drawings: {
    enabled: true,           // Enable drawing mode
    persist: false,          // Persist drawings
  },
}

const slidev = toSlidev(doc, config)
```

## API

### Functions

- `toSlidev(doc, config)` - Convert MDXLD to Slidev markdown
- `fromSlidev(markdown)` - Convert Slidev back to MDXLD
- `extractSlides(doc)` - Extract slide data
- `getSlidevCommand(path, options)` - Generate dev command
- `getSlidevExportCommand(path, output, format)` - Generate export command
- `getSlidevBuildCommand(path, outDir)` - Generate build command

### Types

```typescript
interface SlidevConfig {
  theme?: string
  highlighter?: 'shiki' | 'prism'
  lineNumbers?: boolean
  drawings?: { enabled?: boolean; persist?: boolean }
  transition?: string
  css?: string
  title?: string
}

interface SlidevOutput {
  markdown: string
  slides: Slide[]
  frontmatter: Record<string, unknown>
}

interface Slide {
  content: string
  frontmatter?: Record<string, unknown>
  notes?: string
  layout?: string
}
```

## Slide Layouts

Slidev supports various layouts via frontmatter:

```markdown
---
layout: cover
---

# Cover Slide

---
layout: two-cols
---

# Left Column

::right::

# Right Column

---
layout: image-right
image: ./image.png
---

# With Image
```

## Speaker Notes

Add speaker notes with HTML comments:

```markdown
# My Slide

Content here.

<!-- notes -->
These are my speaker notes.
They won't be shown on the slide.
```

## License

MIT
