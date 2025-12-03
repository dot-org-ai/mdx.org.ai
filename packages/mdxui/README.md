# mdxui

JSX-agnostic UI component abstractions for MDX. Define type-safe components that work with any JSX runtime including React, Preact, Ink (CLI), Hono JSX, and more.

## Installation

```bash
npm install mdxui
# or
pnpm add mdxui
# or
yarn add mdxui
```

## Features

- **JSX Agnostic** - Works with React, Preact, Ink, Hono, Solid, etc.
- **Type-Safe** - Full TypeScript support with prop validation
- **Component Registry** - Discover and query available components
- **Factory Functions** - Create component implementations for any runtime
- **Pre-defined Types** - Common UI patterns (Hero, Features, Pricing, etc.)
- **Composable** - Merge, pick, and omit component sets

## Quick Start

```typescript
import {
  createComponents,
  getComponentNames,
  getComponentsByCategory
} from 'mdxui'

// Create components for React
import { createElement } from 'react'

const components = createComponents({
  jsx: createElement,
  renderers: {
    Hero: ({ title, subtitle, cta }) => (
      <section className="hero">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {cta && <button>{cta.label}</button>}
      </section>
    ),
    Features: ({ features }) => (
      <div className="features">
        {features.map(f => (
          <div key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </div>
    )
  }
})

// Use in MDX
// <Hero title="Welcome" subtitle="Get started today" />
```

## API Reference

### Component Factory

#### `createComponents(options)`

Create a set of components for a specific JSX runtime.

```typescript
function createComponents(options: CreateComponentsOptions): Components

interface CreateComponentsOptions {
  jsx: JSXFactory                        // JSX factory (createElement)
  jsxs?: JSXFactory                      // Static children factory
  Fragment?: unknown                      // Fragment component
  renderers: Partial<ComponentRenderers>  // Component implementations
  defaults?: Partial<ComponentRenderers>  // Fallback renderers
}
```

**Example:**

```typescript
import { createComponents } from 'mdxui'
import { createElement, Fragment } from 'react'

const components = createComponents({
  jsx: createElement,
  Fragment,
  renderers: {
    Hero: (props) => <HeroImpl {...props} />,
    Card: (props) => <CardImpl {...props} />,
    Button: (props) => <ButtonImpl {...props} />,
  }
})
```

#### `createComponent(name, options)`

Create a single component.

```typescript
function createComponent<N extends ComponentName>(
  name: N,
  options: CreateComponentsOptions
): Component<ComponentProps[N]>
```

#### `createStubComponents(jsx)`

Create stub components that render their name (useful for testing).

```typescript
const stubs = createStubComponents(createElement)
// <Hero /> renders "<Hero />"
```

#### `createValidatedComponents(options)`

Create components with runtime prop validation.

```typescript
const validated = createValidatedComponents({
  jsx: createElement,
  renderers: { ... },
  onValidationError: (name, errors) => {
    console.warn(`Invalid props for ${name}:`, errors)
  }
})
```

### Component Utilities

#### `mergeComponents(...componentSets)`

Merge multiple component sets.

```typescript
import { mergeComponents } from 'mdxui'

const combined = mergeComponents(
  baseComponents,
  themeComponents,
  customComponents
)
```

#### `pickComponents(components, names)`

Pick specific components from a set.

```typescript
import { pickComponents } from 'mdxui'

const landing = pickComponents(components, [
  'Hero', 'Features', 'Pricing', 'CTA'
])
```

#### `omitComponents(components, names)`

Remove specific components from a set.

```typescript
import { omitComponents } from 'mdxui'

const publicComponents = omitComponents(components, [
  'AdminPanel', 'DebugInfo'
])
```

### Component Registry

#### `getComponentNames()`

Get all available component names.

```typescript
import { getComponentNames } from 'mdxui'

const names = getComponentNames()
// ['App', 'Site', 'Page', 'Hero', 'Features', ...]
```

#### `getComponentMeta(name)`

Get metadata for a component.

```typescript
import { getComponentMeta } from 'mdxui'

const meta = getComponentMeta('Hero')
// {
//   name: 'Hero',
//   category: 'landing',
//   description: 'Hero section with title, subtitle, and CTA',
//   props: { title: { type: 'string', required: true }, ... }
// }
```

#### `getComponentsByCategory(category)`

Get components by category.

```typescript
import { getComponentsByCategory, getCategories } from 'mdxui'

const categories = getCategories()
// ['layout', 'landing', 'content', 'form', 'data', 'feedback']

const landingComponents = getComponentsByCategory('landing')
// ['Hero', 'Features', 'Testimonials', 'Pricing', 'FAQ', 'CTA']
```

#### `componentHasChildren(name)`

Check if a component accepts children.

```typescript
import { componentHasChildren } from 'mdxui'

componentHasChildren('Page')    // true
componentHasChildren('Hero')    // false (uses props.cta instead)
```

#### `getRequiredProps(name)`

Get required props for a component.

```typescript
import { getRequiredProps } from 'mdxui'

const required = getRequiredProps('Hero')
// ['title']
```

#### `getDefaultProps(name)`

Get default prop values.

```typescript
import { getDefaultProps } from 'mdxui'

const defaults = getDefaultProps('Pricing')
// { billingPeriod: 'monthly' }
```

#### `getRelatedComponents(name)`

Get related components.

```typescript
import { getRelatedComponents } from 'mdxui'

const related = getRelatedComponents('Hero')
// ['Features', 'CTA', 'LandingPage']
```

## Component Types

### Layout Components

```typescript
// App - Root application wrapper
interface AppProps {
  children: ReactNode
  theme?: 'light' | 'dark' | 'system'
  locale?: string
}

// Site - Site-wide layout
interface SiteProps {
  children: ReactNode
  nav?: NavItem[]
  footer?: { links: NavItem[]; copyright?: string }
  seo?: SEO
}

// Page - Individual page
interface PageProps {
  children: ReactNode
  title?: string
  description?: string
  seo?: SEO
}

// Section - Content section
interface SectionProps {
  children: ReactNode
  id?: string
  className?: string
  background?: 'default' | 'muted' | 'primary'
}

// Container - Content container
interface ContainerProps {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

// Grid - Grid layout
interface GridProps {
  children: ReactNode
  cols?: number | { sm?: number; md?: number; lg?: number }
  gap?: number | string
}

// Stack - Vertical/horizontal stack
interface StackProps {
  children: ReactNode
  direction?: 'vertical' | 'horizontal'
  gap?: number | string
  align?: 'start' | 'center' | 'end' | 'stretch'
}
```

### Landing Page Components

```typescript
// Hero - Hero section
interface HeroProps {
  title: string
  subtitle?: string
  image?: Media
  cta?: Action
  secondaryCta?: Action
  align?: 'left' | 'center' | 'right'
}

// Features - Feature grid
interface FeaturesProps {
  title?: string
  subtitle?: string
  features: Feature[]
  columns?: 2 | 3 | 4
}

interface Feature {
  title: string
  description: string
  icon?: string | ReactNode
  link?: string
}

// Testimonials - Customer testimonials
interface TestimonialsProps {
  title?: string
  testimonials: Testimonial[]
  layout?: 'grid' | 'carousel'
}

interface Testimonial {
  quote: string
  author: Person
  rating?: number
}

// Pricing - Pricing table
interface PricingProps {
  title?: string
  subtitle?: string
  tiers: PricingTier[]
  billingPeriod?: 'monthly' | 'yearly'
}

interface PricingTier {
  name: string
  price: number | string
  description?: string
  features: string[]
  cta: Action
  highlighted?: boolean
}

// FAQ - Frequently asked questions
interface FAQProps {
  title?: string
  items: FAQItem[]
  layout?: 'accordion' | 'list'
}

interface FAQItem {
  question: string
  answer: string
}

// CTA - Call to action
interface CTAProps {
  title: string
  description?: string
  action: Action
  secondaryAction?: Action
  background?: 'default' | 'primary' | 'gradient'
}
```

### Content Components

```typescript
// Blog - Blog listing
interface BlogProps {
  posts: BlogPost[]
  title?: string
  pagination?: { page: number; total: number }
}

// BlogPost - Single post
interface BlogPostProps {
  title: string
  content: ReactNode
  author: Person
  publishedAt: string
  tags?: string[]
  coverImage?: Media
}

// Docs - Documentation layout
interface DocsProps {
  children: ReactNode
  sidebar: NavItem[]
  toc?: Array<{ title: string; slug: string; level: number }>
}

// Card - Content card
interface CardProps {
  title: string
  description?: string
  image?: Media
  action?: Action
  children?: ReactNode
}
```

### Form Components

```typescript
// Form - Form wrapper
interface FormProps {
  children?: ReactNode
  fields?: FormField[]
  onSubmit?: (data: Record<string, unknown>) => void
  submitLabel?: string
}

interface FormField {
  name: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox'
  label?: string
  placeholder?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
}

// Newsletter - Newsletter signup
interface NewsletterProps {
  title?: string
  description?: string
  submitLabel?: string
  onSubmit?: (email: string) => void
}

// Contact - Contact form
interface ContactProps {
  title?: string
  description?: string
  fields?: FormField[]
  submitLabel?: string
}
```

### Data Display Components

```typescript
// Stats - Statistics display
interface StatsProps {
  stats: Stat[]
  layout?: 'row' | 'grid'
}

interface Stat {
  label: string
  value: string | number
  change?: { value: number; trend: 'up' | 'down' }
}

// Table - Data table
interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  sortable?: boolean
  pagination?: { page: number; pageSize: number; total: number }
}

// Timeline - Event timeline
interface TimelineProps {
  items: TimelineItem[]
  layout?: 'vertical' | 'horizontal'
}

interface TimelineItem {
  title: string
  description?: string
  date: string
  icon?: string | ReactNode
}
```

### Feedback Components

```typescript
// Alert - Alert message
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  dismissible?: boolean
}

// Badge - Status badge
interface BadgeProps {
  label: string
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
}

// Progress - Progress indicator
interface ProgressProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  variant?: 'default' | 'primary' | 'success'
}
```

## Runtime Examples

### React

```typescript
import { createComponents } from 'mdxui'
import { createElement, Fragment } from 'react'

const components = createComponents({
  jsx: createElement,
  Fragment,
  renderers: {
    Hero: ({ title, subtitle, cta }) => (
      <section className="hero">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {cta && <a href={cta.href}>{cta.label}</a>}
      </section>
    )
  }
})
```

### Preact

```typescript
import { createComponents } from 'mdxui'
import { h, Fragment } from 'preact'

const components = createComponents({
  jsx: h,
  Fragment,
  renderers: { ... }
})
```

### Hono JSX

```typescript
import { createComponents } from 'mdxui'
import { jsx, Fragment } from 'hono/jsx'

const components = createComponents({
  jsx,
  Fragment,
  renderers: { ... }
})
```

### Ink (CLI)

```typescript
import { createComponents } from 'mdxui'
import { createElement } from 'ink'
import { Box, Text } from 'ink'

const components = createComponents({
  jsx: createElement,
  renderers: {
    Hero: ({ title, subtitle }) => (
      <Box flexDirection="column">
        <Text bold>{title}</Text>
        {subtitle && <Text dimColor>{subtitle}</Text>}
      </Box>
    ),
    Features: ({ features }) => (
      <Box flexDirection="column">
        {features.map(f => (
          <Box key={f.title}>
            <Text>• {f.title}: </Text>
            <Text dimColor>{f.description}</Text>
          </Box>
        ))}
      </Box>
    )
  }
})
```

### MDX Provider

```typescript
import { MDXProvider } from '@mdx-js/react'
import { createComponents } from 'mdxui'
import { createElement } from 'react'

const components = createComponents({
  jsx: createElement,
  renderers: { ... }
})

function App({ children }) {
  return (
    <MDXProvider components={components}>
      {children}
    </MDXProvider>
  )
}
```

## Types

### `ComponentName`

Union of all component names.

```typescript
type ComponentName =
  | 'App' | 'Site' | 'Page' | 'Section' | 'Container' | 'Grid' | 'Stack'
  | 'LandingPage' | 'Hero' | 'Features' | 'Testimonials' | 'Pricing' | 'FAQ' | 'CTA'
  | 'Blog' | 'BlogPost' | 'Docs' | 'Card'
  | 'Form' | 'Newsletter' | 'Contact'
  | 'Stats' | 'Table' | 'Timeline'
  | 'API'
  | 'Alert' | 'Badge' | 'Progress'
```

### `ComponentCategory`

```typescript
type ComponentCategory =
  | 'layout'
  | 'landing'
  | 'content'
  | 'form'
  | 'data'
  | 'feedback'
  | 'api'
```

### `ComponentMeta`

```typescript
interface ComponentMeta {
  name: ComponentName
  category: ComponentCategory
  description: string
  hasChildren: boolean
  props: Record<string, {
    type: string
    required: boolean
    description?: string
    default?: unknown
  }>
  related?: ComponentName[]
}
```

## Related Packages

### Rendering Packages

| Package | Output Format | Description |
|---------|--------------|-------------|
| [@mdxui/html](https://www.npmjs.com/package/@mdxui/html) | HTML | Server-side HTML rendering |
| [@mdxui/markdown](https://www.npmjs.com/package/@mdxui/markdown) | Markdown | Markdown string output |
| [@mdxui/json](https://www.npmjs.com/package/@mdxui/json) | JSON/JSON-LD | JSON serialization and schemas |
| [@mdxui/email](https://www.npmjs.com/package/@mdxui/email) | Email HTML | React Email integration |
| [@mdxui/slack](https://www.npmjs.com/package/@mdxui/slack) | Slack Blocks | Slack Block Kit format |
| [@mdxui/shadcn](https://www.npmjs.com/package/@mdxui/shadcn) | React | shadcn/ui components |
| [@mdxui/fumadocs](https://www.npmjs.com/package/@mdxui/fumadocs) | Docs | Fumadocs utilities |
| [@mdxui/widgets](https://www.npmjs.com/package/@mdxui/widgets) | React | Chat, Editor, Search widgets |

> **Note:** CLI/terminal rendering uses [@mdxe/ink](https://www.npmjs.com/package/@mdxe/ink) since Ink output is coupled to the Ink runtime.

### Core Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [mdxe](https://www.npmjs.com/package/mdxe) | MDX execution and deployment |
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction |
| [mdxai](https://www.npmjs.com/package/mdxai) | AI integrations |

## License

MIT
