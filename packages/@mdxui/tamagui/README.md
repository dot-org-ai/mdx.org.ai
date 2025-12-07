# @mdxui/tamagui

Universal React Native & Web components for rendering MDX content with Tamagui's optimized styling system. Write once, render everywhere.

## Installation

```bash
pnpm add @mdxui/tamagui tamagui @tamagui/core @tamagui/config
```

## Usage

### Render MDX Documents

```tsx
import { MDXDocument } from '@mdxui/tamagui'
import { parse } from 'mdxld'

const content = `
---
title: Hello World
---

# Hello World

This is **MDX** content with _formatting_.
`

function ContentScreen() {
  const doc = parse(content)
  return <MDXDocument doc={doc} showFrontmatter />
}
```

### Render Raw Content

```tsx
import { MDXContent } from '@mdxui/tamagui'

function QuickRender() {
  return <MDXContent content="# Hello\n\nMarkdown content here." />
}
```

### Custom Components

Override default Tamagui components:

```tsx
import { MDXDocument, defaultComponents } from '@mdxui/tamagui'
import { CustomHeading } from './components'

function StyledContent({ doc }) {
  return (
    <MDXDocument
      doc={doc}
      components={{
        ...defaultComponents,
        h1: CustomHeading
      }}
    />
  )
}
```

## Themes

Pre-configured themes optimized for reading:

```tsx
import { createMDXTamaguiConfig, themePresets } from '@mdxui/tamagui/themes'

// Use a theme preset
const config = createMDXTamaguiConfig({
  preset: 'docs', // 'default' | 'prose' | 'docs' | 'blog'
})

export default config
```

Available themes:
- **default** - Clean, balanced light/dark themes
- **prose** - Long-form content with optimized typography
- **docs** - Minimal, technical documentation styling
- **blog** - Warmer colors for blog posts

## Styled Primitives

Low-level components for custom layouts:

```tsx
import {
  Prose,
  Article,
  Heading1,
  Paragraph,
  CodeBlock,
  Callout
} from '@mdxui/tamagui/primitives'

function CustomLayout() {
  return (
    <Prose>
      <Article>
        <Heading1>Title</Heading1>
        <Paragraph>Content here</Paragraph>
        <Callout type="info">
          <Text>Important note</Text>
        </Callout>
      </Article>
    </Prose>
  )
}
```

## Component Map

Default MDX components use Tamagui primitives:

- `h1-h6` → Tamagui Headings with semantic spacing
- `p` → Paragraph with optimized line-height
- `a` → Anchor with hover states
- `code` → Inline code with mono font
- `pre` → Code blocks with syntax highlighting support
- `blockquote` → Styled quotes with left border
- `ul/ol/li` → Lists with proper spacing
- `img` → Responsive images
- `hr` → Separator component

## Platform Support

Works on:
- React Native (iOS, Android)
- Web (Next.js, Vite, etc.)
- Electron
- Expo

All with the same MDX source and components.
