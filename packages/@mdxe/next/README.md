# @mdxe/next

Next.js integration for MDX with App Router support, route handlers, and automatic metadata generation.

## Installation

```bash
npm install @mdxe/next
# or
pnpm add @mdxe/next
# or
yarn add @mdxe/next
```

## Features

- **App Router Support** - Full Next.js 13+ App Router integration
- **Route Handlers** - Create MDX API routes easily
- **Metadata Generation** - Automatic SEO metadata from frontmatter
- **Config Wrapper** - Enhance Next.js config for MDX
- **Server Components** - Works with React Server Components
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
// next.config.js
import { withMDXE } from '@mdxe/next'

export default withMDXE({
  // Your Next.js config
})
```

```typescript
// app/docs/[slug]/page.tsx
import { createMDXRouteHandler, generateMDXMetadata } from '@mdxe/next'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content/docs' })

export async function generateMetadata({ params }) {
  const doc = await db.get(params.slug)
  return generateMDXMetadata(doc)
}

export default async function Page({ params }) {
  const doc = await db.get(params.slug)
  return <article dangerouslySetInnerHTML={{ __html: doc.content }} />
}
```

## API Reference

### `withMDXE(nextConfig, mdxeConfig?)`

Enhance Next.js configuration for MDX support.

```typescript
function withMDXE<T extends NextConfig>(
  nextConfig: T,
  mdxeConfig?: MDXENextConfig
): T

interface MDXENextConfig {
  extension?: RegExp     // MDX file extension pattern
  options?: CompileOptions  // MDX compile options
}
```

**Example:**

```typescript
// next.config.js
import { withMDXE } from '@mdxe/next'

export default withMDXE({
  reactStrictMode: true,
  images: {
    domains: ['example.com']
  }
}, {
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: []
  }
})
```

### `createMDXRouteHandler(options)`

Create a Next.js route handler for serving MDX content.

```typescript
function createMDXRouteHandler<TData>(
  options: MDXRouteHandlerOptions<TData>
): {
  GET: (request: Request, context: { params: Params }) => Promise<Response>
}

interface MDXRouteHandlerOptions<TData> {
  getDocument: (params: Params) => Promise<MDXLDDocument<TData> | null>
  render?: RenderOptions
  cache?: CacheOptions
}

interface RenderOptions {
  format?: 'html' | 'json'
  styles?: string[]
  scripts?: string[]
}

interface CacheOptions {
  revalidate?: number | false
  tags?: string[]
}
```

**Example:**

```typescript
// app/api/docs/[slug]/route.ts
import { createMDXRouteHandler } from '@mdxe/next'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content' })

export const { GET } = createMDXRouteHandler({
  getDocument: async ({ slug }) => {
    return db.get(slug)
  },
  render: {
    format: 'html',
    styles: ['/styles/docs.css']
  },
  cache: {
    revalidate: 3600,
    tags: ['docs']
  }
})
```

### `generateMDXMetadata(doc, options?)`

Generate Next.js Metadata from an MDXLD document.

```typescript
function generateMDXMetadata<TData>(
  doc: MDXLDDocument<TData> | null,
  options?: MetadataOptions
): Metadata

interface MetadataOptions {
  titleTemplate?: string     // Title template (default: '%s')
  defaultTitle?: string      // Fallback title
  siteName?: string          // Site name for OG
  baseUrl?: string           // Base URL for canonical
  twitterHandle?: string     // Twitter handle
  defaults?: Partial<Metadata>  // Default metadata values
}
```

**Example:**

```typescript
// app/blog/[slug]/page.tsx
import { generateMDXMetadata } from '@mdxe/next'
import type { Metadata } from 'next'

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)

  return generateMDXMetadata(post, {
    titleTemplate: '%s | My Blog',
    siteName: 'My Blog',
    baseUrl: 'https://example.com',
    twitterHandle: '@myblog',
    defaults: {
      robots: { index: true, follow: true }
    }
  })
}
```

### Generated Metadata

From this frontmatter:

```yaml
---
title: Getting Started
description: Learn how to get started with our platform
$type: Article
author: Jane Doe
image: /images/hero.jpg
publishedAt: 2024-01-15
---
```

`generateMDXMetadata` produces:

```typescript
{
  title: 'Getting Started',
  description: 'Learn how to get started with our platform',
  authors: [{ name: 'Jane Doe' }],
  openGraph: {
    title: 'Getting Started',
    description: 'Learn how to get started with our platform',
    type: 'article',
    images: ['/images/hero.jpg'],
    publishedTime: '2024-01-15',
    siteName: 'My Site'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Getting Started',
    description: 'Learn how to get started with our platform',
    images: ['/images/hero.jpg']
  }
}
```

### `MDXPage` Component

Server component for rendering MDX pages.

```typescript
interface MDXPageProps<TData> {
  doc: MDXLDDocument<TData>
  components?: MDXComponents
  className?: string
}

function MDXPage<TData>(props: MDXPageProps<TData>): JSX.Element
```

**Example:**

```typescript
// app/docs/[slug]/page.tsx
import { MDXPage } from '@mdxe/next'
import { components } from '@/components/mdx'

export default async function Page({ params }) {
  const doc = await getDocument(params.slug)

  return (
    <MDXPage
      doc={doc}
      components={components}
      className="prose dark:prose-invert"
    />
  )
}
```

## Examples

### Documentation Site

```typescript
// app/docs/[[...slug]]/page.tsx
import { generateMDXMetadata } from '@mdxe/next'
import { createFsDatabase } from '@mdxdb/fs'
import { notFound } from 'next/navigation'

const db = createFsDatabase({ root: './docs' })

export async function generateStaticParams() {
  const { documents } = await db.list()
  return documents.map(doc => ({
    slug: doc.id.split('/')
  }))
}

export async function generateMetadata({ params }) {
  const slug = params.slug?.join('/') || 'index'
  const doc = await db.get(slug)

  if (!doc) return {}

  return generateMDXMetadata(doc, {
    titleTemplate: '%s | Docs',
    siteName: 'My Docs'
  })
}

export default async function DocsPage({ params }) {
  const slug = params.slug?.join('/') || 'index'
  const doc = await db.get(slug)

  if (!doc) notFound()

  return (
    <article className="prose max-w-none">
      <h1>{doc.data.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc.content }} />
    </article>
  )
}
```

### Blog with MDX

```typescript
// app/blog/[slug]/page.tsx
import { generateMDXMetadata } from '@mdxe/next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { components } from '@/components/mdx'

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug)
  return generateMDXMetadata(post, {
    titleTemplate: '%s | Blog'
  })
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug)

  return (
    <article>
      <header>
        <h1>{post.data.title}</h1>
        <time>{post.data.publishedAt}</time>
        <p>{post.data.description}</p>
      </header>

      <MDXRemote source={post.content} components={components} />
    </article>
  )
}
```

### API Route Handler

```typescript
// app/api/content/[...path]/route.ts
import { createMDXRouteHandler } from '@mdxe/next'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content' })

export const { GET } = createMDXRouteHandler({
  getDocument: async ({ path }) => {
    const docPath = path.join('/')
    return db.get(docPath)
  },
  cache: {
    revalidate: 60,
    tags: ['content']
  }
})

// Invalidate cache
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'

export async function POST() {
  revalidateTag('content')
  return Response.json({ revalidated: true })
}
```

### With Layout

```typescript
// app/docs/layout.tsx
import { Sidebar } from '@/components/Sidebar'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './docs' })

export default async function DocsLayout({ children }) {
  const { documents } = await db.list()

  const nav = documents.map(doc => ({
    title: doc.data.title,
    href: `/docs/${doc.id}`
  }))

  return (
    <div className="flex">
      <Sidebar items={nav} />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
```

### Dynamic OG Images

```typescript
// app/og/[slug]/route.tsx
import { ImageResponse } from 'next/og'

export async function GET(request: Request, { params }) {
  const doc = await getDocument(params.slug)

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
          color: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48
        }}
      >
        <h1>{doc.data.title}</h1>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

## Configuration

### TypeScript

```typescript
// types/mdx.d.ts
declare module '*.mdx' {
  import type { MDXLDDocument } from 'mdxld'
  const document: MDXLDDocument
  export default document
}
```

### MDX Components

```typescript
// components/mdx.tsx
import type { MDXComponents } from 'mdx/types'
import { Code } from '@/components/Code'
import { Callout } from '@/components/Callout'

export const components: MDXComponents = {
  code: Code,
  Callout,
  // ... other components
}
```

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument<TData = Record<string, unknown>> {
  data: TData & {
    title?: string
    description?: string
    $id?: string
    $type?: string
    $context?: string | Record<string, unknown>
    [key: string]: unknown
  }
  content: string
}
```

### `Metadata` (Next.js)

The `generateMDXMetadata` function returns a standard Next.js `Metadata` object compatible with the App Router.

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/hono](https://www.npmjs.com/package/@mdxe/hono) | Hono middleware |
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem database |
| [next](https://www.npmjs.com/package/next) | React framework |

## License

MIT
