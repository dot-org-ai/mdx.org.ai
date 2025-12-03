# @mdxui/fumadocs

Next.js integration for MDX with Fumadocs. Utilities and components for building documentation sites.

## Installation

```bash
npm install @mdxui/fumadocs
# or
pnpm add @mdxui/fumadocs
# or
yarn add @mdxui/fumadocs
```

## Features

- **Table of Contents** - Extract and nest headings from MDX
- **Breadcrumbs** - Page navigation trail generation
- **Search Index** - Generate search indexes from content
- **Page Navigation** - Previous/next page links
- **Static Params** - Generate static params for Next.js
- **Type Filtering** - Filter pages by MDXLD $type
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
// app/docs/[[...slug]]/page.tsx
import { getTableOfContents, getBreadcrumbs } from '@mdxui/fumadocs'
import { createSource } from '@mdxdb/fumadocs'

const source = loader({ source: createSource(documents) })

export default async function Page({ params }) {
  const page = source.getPage(params.slug)
  const toc = getTableOfContents(page.data.content)
  const breadcrumbs = getBreadcrumbs(params.slug, source.getPages())

  return (
    <article>
      <Breadcrumbs items={breadcrumbs} />
      <TableOfContents items={toc} />
      <Content />
    </article>
  )
}
```

## API Reference

### `getTableOfContents(doc)`

Extract table of contents from an MDXLD document.

```typescript
function getTableOfContents(doc: MDXLDDocument | string): TOCItem[]

interface TOCItem {
  title: string      // Heading text
  url: string        // URL fragment (e.g., #heading-slug)
  depth: number      // Heading depth (1-6)
  items?: TOCItem[]  // Nested items (when using nestTableOfContents)
}
```

**Example:**

```typescript
import { getTableOfContents } from '@mdxui/fumadocs'

const doc = `
# Introduction

## Getting Started

### Installation

## Configuration

### Basic Setup

### Advanced Options
`

const toc = getTableOfContents(doc)
// [
//   { title: 'Getting Started', url: '#getting-started', depth: 2 },
//   { title: 'Installation', url: '#installation', depth: 3 },
//   { title: 'Configuration', url: '#configuration', depth: 2 },
//   { title: 'Basic Setup', url: '#basic-setup', depth: 3 },
//   { title: 'Advanced Options', url: '#advanced-options', depth: 3 }
// ]
```

### `nestTableOfContents(items)`

Convert flat TOC items into a nested structure.

```typescript
function nestTableOfContents(items: TOCItem[]): TOCItem[]
```

**Example:**

```typescript
import { getTableOfContents, nestTableOfContents } from '@mdxui/fumadocs'

const flatToc = getTableOfContents(content)
const nestedToc = nestTableOfContents(flatToc)
// [
//   {
//     title: 'Getting Started',
//     url: '#getting-started',
//     depth: 2,
//     items: [
//       { title: 'Installation', url: '#installation', depth: 3 }
//     ]
//   },
//   {
//     title: 'Configuration',
//     url: '#configuration',
//     depth: 2,
//     items: [
//       { title: 'Basic Setup', url: '#basic-setup', depth: 3 },
//       { title: 'Advanced Options', url: '#advanced-options', depth: 3 }
//     ]
//   }
// ]
```

### `generateParams(pages, options?)`

Generate static params for Next.js dynamic routes.

```typescript
function generateParams<T extends { slugs: string[] }>(
  pages: T[],
  options?: { slugParam?: string }
): Array<Record<string, string[]>>
```

**Example:**

```typescript
// app/docs/[[...slug]]/page.tsx
import { generateParams } from '@mdxui/fumadocs'

export async function generateStaticParams() {
  const pages = source.getPages()
  return generateParams(pages)
  // [
  //   { slug: ['getting-started'] },
  //   { slug: ['api', 'reference'] },
  //   { slug: ['examples', 'basic'] }
  // ]
}
```

### `getBreadcrumbs(slugs, pages)`

Get breadcrumbs for a page.

```typescript
function getBreadcrumbs<T extends { slugs: string[]; data: { title: string } }>(
  slugs: string[],
  pages: T[]
): Array<{ title: string; href: string }>
```

**Example:**

```typescript
import { getBreadcrumbs } from '@mdxui/fumadocs'

const breadcrumbs = getBreadcrumbs(
  ['api', 'reference', 'database'],
  pages
)
// [
//   { title: 'API', href: '/api' },
//   { title: 'Reference', href: '/api/reference' },
//   { title: 'Database', href: '/api/reference/database' }
// ]
```

### `generateSearchIndex(pages, options?)`

Generate a search index from pages.

```typescript
function generateSearchIndex<T extends {
  slugs: string[]
  data: { title: string; description?: string; content: string }
}>(
  pages: T[],
  options?: {
    baseUrl?: string
    stripMarkdown?: boolean
  }
): SearchIndexEntry[]

interface SearchIndexEntry {
  id: string
  title: string
  description?: string
  url: string
  content: string
  section?: string
}
```

**Example:**

```typescript
import { generateSearchIndex } from '@mdxui/fumadocs'

const pages = source.getPages()
const index = generateSearchIndex(pages, {
  baseUrl: '/docs',
  stripMarkdown: true
})
// [
//   {
//     id: 'getting-started',
//     title: 'Getting Started',
//     description: 'Learn the basics',
//     url: '/docs/getting-started',
//     content: 'Clean text content without markdown syntax...'
//   }
// ]

// Export for search service
await Bun.write('./search-index.json', JSON.stringify(index))
```

### `getPageNavigation(currentSlugs, pages)`

Get previous and next pages for navigation.

```typescript
function getPageNavigation<T extends { slugs: string[]; data: { title: string } }>(
  currentSlugs: string[],
  pages: T[]
): { previous?: T; next?: T }
```

**Example:**

```typescript
import { getPageNavigation } from '@mdxui/fumadocs'

const { previous, next } = getPageNavigation(
  ['api', 'reference'],
  pages
)

// Render navigation links
<nav>
  {previous && <a href={`/${previous.slugs.join('/')}`}>← {previous.data.title}</a>}
  {next && <a href={`/${next.slugs.join('/')}`}>{next.data.title} →</a>}
</nav>
```

### `filterByType(pages, type)`

Filter pages by MDXLD $type.

```typescript
function filterByType<T extends { data: { doc: MDXLDDocument } }>(
  pages: T[],
  type: string
): T[]
```

**Example:**

```typescript
import { filterByType } from '@mdxui/fumadocs'

// Get only API reference pages
const apiDocs = filterByType(pages, 'ApiReference')

// Get only guides
const guides = filterByType(pages, 'Guide')
```

### `groupPages(pages, field)`

Group pages by a field value.

```typescript
function groupPages<T extends { data: Record<string, unknown> }>(
  pages: T[],
  field: string
): Map<string, T[]>
```

**Example:**

```typescript
import { groupPages } from '@mdxui/fumadocs'

// Group by category
const byCategory = groupPages(pages, 'category')
// Map {
//   'Getting Started' => [page1, page2],
//   'API Reference' => [page3, page4],
//   'Examples' => [page5]
// }

// Group by author
const byAuthor = groupPages(pages, 'author')
```

## Re-exports

The package re-exports utilities from `@mdxdb/fumadocs`:

```typescript
import {
  createSource,
  createDynamicSource,
  queryToSource,
  isPage,
  isMeta
} from '@mdxui/fumadocs'
```

And from `mdxld`:

```typescript
import { parse, stringify, toAst } from '@mdxui/fumadocs'
```

## Examples

### Complete Documentation Page

```typescript
// app/docs/[[...slug]]/page.tsx
import {
  getTableOfContents,
  nestTableOfContents,
  getBreadcrumbs,
  getPageNavigation
} from '@mdxui/fumadocs'
import { notFound } from 'next/navigation'

export default async function DocsPage({ params }) {
  const slugs = params.slug || []
  const page = source.getPage(slugs)

  if (!page) notFound()

  const pages = source.getPages()
  const toc = nestTableOfContents(getTableOfContents(page.data.content))
  const breadcrumbs = getBreadcrumbs(slugs, pages)
  const { previous, next } = getPageNavigation(slugs, pages)

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="w-64">
        <Navigation pages={pages} current={slugs} />
      </aside>

      {/* Main content */}
      <main className="flex-1 max-w-3xl">
        <Breadcrumbs items={breadcrumbs} />

        <article className="prose">
          <h1>{page.data.title}</h1>
          <MDXContent content={page.data.content} />
        </article>

        <PageNavigation previous={previous} next={next} />
      </main>

      {/* Table of contents */}
      <aside className="w-48">
        <TableOfContents items={toc} />
      </aside>
    </div>
  )
}
```

### Search API Route

```typescript
// app/api/search/route.ts
import { generateSearchIndex } from '@mdxui/fumadocs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.toLowerCase() || ''

  const pages = source.getPages()
  const index = generateSearchIndex(pages, {
    baseUrl: '/docs',
    stripMarkdown: true
  })

  const results = index.filter((entry) =>
    entry.title.toLowerCase().includes(query) ||
    entry.content.toLowerCase().includes(query)
  )

  return Response.json(results.slice(0, 10))
}
```

### Category Pages

```typescript
// app/docs/category/[category]/page.tsx
import { groupPages } from '@mdxui/fumadocs'

export async function generateStaticParams() {
  const pages = source.getPages()
  const categories = groupPages(pages, 'category')
  return Array.from(categories.keys()).map((category) => ({ category }))
}

export default async function CategoryPage({ params }) {
  const pages = source.getPages()
  const categories = groupPages(pages, 'category')
  const categoryPages = categories.get(params.category) || []

  return (
    <div>
      <h1>{params.category}</h1>
      <ul>
        {categoryPages.map((page) => (
          <li key={page.slugs.join('/')}>
            <a href={`/docs/${page.slugs.join('/')}`}>
              {page.data.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Build-time Search Index

```typescript
// scripts/build-search.ts
import { generateSearchIndex } from '@mdxui/fumadocs'
import { createFsDatabase } from '@mdxdb/fs'
import { createSource } from '@mdxdb/fumadocs'
import { loader } from 'fumadocs-core/source'

async function buildSearchIndex() {
  const db = createFsDatabase({ root: './content' })
  const { documents } = await db.list()

  const docTuples = documents.map(doc => [doc.id, doc] as const)
  const fumadocsSource = createSource(docTuples)
  const source = loader({ source: fumadocsSource, baseUrl: '/docs' })

  const index = generateSearchIndex(source.getPages(), {
    baseUrl: '/docs',
    stripMarkdown: true
  })

  await Bun.write('./public/search-index.json', JSON.stringify(index))
  console.log(`Built search index with ${index.length} entries`)
}

buildSearchIndex()
```

## Types

### `TOCItem`

```typescript
interface TOCItem {
  title: string
  url: string
  depth: number
  items?: TOCItem[]
}
```

### `SearchIndexEntry`

```typescript
interface SearchIndexEntry {
  id: string
  title: string
  description?: string
  url: string
  content: string
  section?: string
}
```

### `DocumentPageProps`

```typescript
interface DocumentPageProps {
  slug: string[]
  locale?: string
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [@mdxdb/fumadocs](https://www.npmjs.com/package/@mdxdb/fumadocs) | Content source adapter |
| [fumadocs-core](https://www.npmjs.com/package/fumadocs-core) | Fumadocs core library |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [next](https://www.npmjs.com/package/next) | React framework |

## License

MIT
