# @mdxui/slides

Abstract slides rendering interface for MDX presentations.

## Overview

This package provides abstract types and utilities for rendering MDXLD documents as presentations/slideshows. It defines the common interface that concrete implementations (like `@mdxe/slidev` and `@mdxe/remotion`) use.

## Installation

```bash
pnpm add @mdxui/slides
```

## Usage

### Extract Slides from MDX

```typescript
import { extractSlides } from '@mdxui/slides'
import { parse } from 'mdxld'

const mdxContent = `
---
title: My Presentation
author: John Doe
theme: default
---

# Welcome

This is the first slide.

---

## Features

- Automatic slide extraction
- Speaker notes support
- Code highlighting

<!-- notes -->
Remember to emphasize this point!

---

## Code Example

\`\`\`typescript
const hello = "world"
\`\`\`
`

const doc = parse(mdxContent)
const presentation = extractSlides(doc)

console.log(presentation.title)       // "My Presentation"
console.log(presentation.slides.length) // 3
console.log(presentation.slides[1].notes) // "Remember to emphasize this point!"
```

### Extraction Options

```typescript
import { extractSlides, type ExtractOptions } from '@mdxui/slides'

const options: ExtractOptions = {
  separator: /^---$/m,        // Slide separator pattern
  splitOnH1: false,           // Also split on h1 headings
  splitOnH2: true,            // Also split on h2 headings
  parseFrontmatter: true,     // Parse slide-level frontmatter
  notesPattern: /<!--\s*notes?\s*-->\s*([\s\S]*?)(?:<!--|$)/i,
}

const presentation = extractSlides(doc, options)
```

### Slide Layouts

Slides support various layouts via frontmatter:

```markdown
---
layout: cover
---

# Title Slide

---
layout: two-cols
---

# Left

::right::

# Right

---
layout: image-right
image: ./diagram.png
---

# With Image
```

Supported layouts:
- `default`, `cover`, `title`, `section`
- `two-cols`, `two-cols-header`
- `image`, `image-left`, `image-right`
- `center`, `quote`, `fact`, `statement`
- `intro`, `end`, `iframe`, `full`

### Create Custom Renderer

```typescript
import { createRenderer, type Presentation, type RenderOptions } from '@mdxui/slides'

const htmlRenderer = createRenderer<string>(
  'html',
  (presentation: Presentation, options?: RenderOptions) => {
    const slides = presentation.slides.map((slide, i) => `
      <section class="slide" data-index="${i}">
        <h2>${slide.title || ''}</h2>
        <div class="content">${slide.content}</div>
      </section>
    `).join('\n')

    return `
      <div class="presentation">
        ${slides}
      </div>
    `
  }
)

const html = htmlRenderer.render(presentation)
```

### Utilities

```typescript
import { getSlideCount, getSlide, estimateDuration, createPresentation } from '@mdxui/slides'

// Get slide count
const count = getSlideCount(doc)

// Get specific slide
const slide = getSlide(doc, 2)

// Estimate duration (2 min per slide default)
const duration = estimateDuration(count) // count * 2 minutes

// Create presentation from slides array
const presentation = createPresentation([
  { title: 'Intro', content: '# Hello' },
  { title: 'Main', content: '## Content' },
], { title: 'My Deck', theme: 'dark' })
```

## Types

### Presentation

```typescript
interface Presentation {
  id?: string
  title?: string
  description?: string
  author?: string
  date?: string
  theme?: string
  aspectRatio?: '16:9' | '4:3' | '16:10' | '1:1'
  meta?: Record<string, unknown>
  slides: Slide[]
  hasSpeakerNotes?: boolean
  duration?: number
}
```

### Slide

```typescript
interface Slide {
  id?: string
  index: number
  title?: string
  content: string
  layout?: SlideLayout
  meta?: Record<string, unknown>
  notes?: string
  hidden?: boolean
  transition?: SlideTransition
  background?: SlideBackground
  codeBlocks?: CodeBlock[]
  clicks?: number
}
```

## Integration with Runtime Packages

This package provides the abstract interface. Use runtime packages for actual rendering:

- `@mdxe/slidev` - Slidev presentation runtime
- `@mdxe/remotion` - Video rendering with Remotion
- `@mdxe/revealjs` - Reveal.js presentations (future)

```typescript
import { extractSlides } from '@mdxui/slides'
import { toSlidev } from '@mdxe/slidev'

const presentation = extractSlides(doc)
const slidevMarkdown = toSlidev(doc)
```

## License

MIT
