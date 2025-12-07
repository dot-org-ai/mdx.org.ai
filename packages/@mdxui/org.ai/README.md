# @mdxui/org.ai

Ontology UI components for rendering Schema.org-style documentation with detail views, directory listings, and semantic layouts.

## Installation

```bash
pnpm add @mdxui/org.ai
```

## Usage

### Thing - Entity Detail View

Renders a single ontology entity with its properties, relationships, searches, actions, and events:

```tsx
import { Thing } from '@mdxui/org.ai'

function PersonDocs() {
  return (
    <Thing
      name="Person"
      description="An individual human being"
      properties={[
        { name: 'name', type: 'string', description: 'Full name' },
        { name: 'email', type: 'string', description: 'Email address' }
      ]}
      relationships={[
        { name: 'posts', target: 'Post', description: 'Blog posts authored' }
      ]}
      actions={[
        { name: 'CreatePost', object: 'Post', result: 'Post', description: 'Create a new post' }
      ]}
    />
  )
}
```

### Things - Entity Directory

Displays a categorized directory of multiple entities:

```tsx
import { Things } from '@mdxui/org.ai'

function Ontology() {
  return (
    <Things
      title="Schema"
      categories={[
        {
          name: 'People',
          entities: [
            { name: 'Person', description: 'An individual' },
            { name: 'Author', description: 'Content creator' }
          ]
        }
      ]}
    />
  )
}
```

### Layout - Full Documentation Page

Complete page layout with navigation sidebar and table of contents:

```tsx
import { Layout } from '@mdxui/org.ai'

function DocsPage() {
  return (
    <Layout
      logo={{ src: '/logo.svg', alt: 'Logo' }}
      nav={[
        { label: 'Entities', href: '/entities' },
        { label: 'Actions', href: '/actions' }
      ]}
      toc={[
        { label: 'Overview', href: '#overview' },
        { label: 'Properties', href: '#properties' }
      ]}
    >
      <Thing name="..." description="..." />
    </Layout>
  )
}
```

## Components

- **Thing** - Detail view with semantic tables for properties, relationships, actions, and events
- **Things** - Card-based directory with category grouping
- **Layout** - Full-page layout with sidebar navigation and TOC

## Styles

Import the ontology stylesheet:

```tsx
import '@mdxui/org.ai/styles'
```
