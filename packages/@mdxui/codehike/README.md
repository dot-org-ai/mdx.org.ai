# @mdxui/codehike

Code Hike components for annotated code walkthroughs in MDX.

## Overview

This package provides:
- Code Hike component re-exports
- Abstract Code interface with variants (block, scrolly, spotlight)
- Custom annotation handlers
- Type-safe props for all variants

## Installation

```bash
pnpm add @mdxui/codehike
```

## Code Variants

The abstract Code interface supports three main variants:

| Variant | Description | Use Case |
|---------|-------------|----------|
| `block` | Standard syntax-highlighted code | Single code snippet |
| `scrolly` | Scrollytelling with steps | Code walkthroughs, tutorials |
| `spotlight` | Focus/highlight regions | Explanations, annotations |

Variants can be auto-inferred from props:
- Has `steps` array → `scrolly`
- Has `regions` array → `spotlight`
- Otherwise → `block`

## Usage

### Basic Setup

```tsx
import { MDXProvider } from '@mdx-js/react'
import { MDXComponents } from '@mdxui/codehike'
import '@mdxui/codehike/styles.css'

function App({ children }) {
  return (
    <MDXProvider components={MDXComponents}>
      {children}
    </MDXProvider>
  )
}
```

### Block Variant (Standard)

```tsx
import { Pre, highlight, type CodeBlockProps } from '@mdxui/codehike'

const props: CodeBlockProps = {
  variant: 'block',
  code: 'const x = 1',
  language: 'typescript',
  lineNumbers: true,
  highlights: '1',
}
```

In MDX:
```mdx
```js
// !mark[/const/]
const greeting = "Hello"

// !focus
console.log(greeting)
```
```

### Scrolly Variant (Scrollytelling)

For multi-step code walkthroughs:

```tsx
import { type CodeScrollyProps, createStep } from '@mdxui/codehike'

const props: CodeScrollyProps = {
  variant: 'scrolly',
  language: 'typescript',
  steps: [
    createStep('const x = 1', {
      title: 'Step 1',
      description: 'Declare a constant',
      focus: '1',
    }),
    createStep('const x = 1\nconst y = 2', {
      title: 'Step 2',
      description: 'Add another variable',
      focus: '2',
    }),
    createStep('const x = 1\nconst y = 2\nconst z = x + y', {
      title: 'Step 3',
      description: 'Compute the sum',
      focus: '3',
    }),
  ],
  progressStyle: 'dots',
  stickyPosition: 'right',
  onStepChange: (step) => console.log('Step:', step),
}
```

### Spotlight Variant

For highlighting specific code regions:

```tsx
import { type CodeSpotlightProps, createSpotlight } from '@mdxui/codehike'

const props: CodeSpotlightProps = {
  variant: 'spotlight',
  code: `function greet(name: string) {
  const message = \`Hello, \${name}!\`
  console.log(message)
  return message
}`,
  language: 'typescript',
  regions: [
    createSpotlight('1', {
      label: 'Function signature',
      callout: 'Takes a name parameter',
    }),
    createSpotlight('2', {
      label: 'Template literal',
      callout: 'Creates the greeting message',
    }),
    createSpotlight('3-4', {
      label: 'Output',
      callout: 'Logs and returns the message',
    }),
  ],
  dimOpacity: 0.3,
  navigation: true,
}
```

### Variant Inference

```tsx
import { inferVariant, isScrollyProps, isSpotlightProps } from '@mdxui/codehike'

// Auto-detect variant from props
const variant = inferVariant(props) // 'block' | 'scrolly' | 'spotlight'

// Type guards
if (isScrollyProps(props)) {
  // props.steps is available
}
if (isSpotlightProps(props)) {
  // props.regions is available
}
```

### Parse Highlights

```tsx
import { parseHighlights } from '@mdxui/codehike'

parseHighlights('1,3-5,10') // [1, 3, 4, 5, 10]
```

## Available Annotations

| Annotation | Description |
|------------|-------------|
| `!mark` | Highlight inline tokens |
| `!focus` | Focus specific lines (dim others) |
| `!diff +` | Show line as addition |
| `!diff -` | Show line as deletion |
| `!callout` | Add explanatory callout |

## API

### Components

- `Pre` - Code block component
- `Code` - Inline code component
- `Block` - Structured content block

### Utilities

- `highlight(code, lang)` - Syntax highlight code
- `MDXComponents` - Pre-configured MDX component overrides
- `inferVariant(props)` - Auto-detect code variant
- `createStep(code, options)` - Create scrolly step
- `createSpotlight(lines, options)` - Create spotlight region
- `parseHighlights(str)` - Parse highlight string to line numbers

### Annotation Handlers

- `defaultHandlers` - All built-in handlers
- `mark` - Token highlighting
- `focus` - Line focus
- `diff` - Diff styling
- `callout` - Explanatory notes

### Types

```typescript
// Variants
type CodeVariant = 'block' | 'scrolly' | 'spotlight' | 'inline'

// Props
type CodeProps = CodeBlockProps | CodeScrollyProps | CodeSpotlightProps | CodeInlineProps

// Step for scrollytelling
interface CodeStep {
  code: string
  language?: string
  title?: string
  description?: string
  focus?: string
  annotations?: CodeAnnotation[]
}

// Region for spotlight
interface SpotlightRegion {
  id?: string
  lines?: string
  pattern?: RegExp | string
  label?: string
  callout?: string
}
```

## Styling

Import the default styles:

```tsx
import '@mdxui/codehike/styles.css'
```

Or use CSS variables to customize:

```css
:root {
  --ch-mark-background: rgba(250, 204, 21, 0.3);
  --ch-focus-opacity: 0.5;
}
```

## Themes

Built-in themes:
- `github-dark`, `github-light`
- `dracula`, `one-dark-pro`
- `nord`, `night-owl`, `monokai`
- `solarized-dark`, `solarized-light`
- `vitesse-dark`, `vitesse-light`

## License

MIT
