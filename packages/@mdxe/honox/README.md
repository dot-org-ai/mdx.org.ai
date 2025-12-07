# @mdxe/honox

HonoX integration for MDXLD - file-based routing with MDX and linked data.

## Installation

```bash
pnpm add @mdxe/honox hono honox
```

## Usage

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import honox from 'honox/vite'
import { mdxld } from '@mdxe/honox/vite'

export default defineConfig({
  plugins: [honox(), mdxld()]
})
```

### Renderer Setup

```tsx
// app/routes/_renderer.tsx
import { mdxldRenderer } from '@mdxe/honox/renderer'

export default mdxldRenderer({
  defaultTitle: 'My Site',
  baseUrl: 'https://example.com'
})
```

### Client Hydration

```ts
// app/client.ts
import { createMdxldClient } from '@mdxe/honox/client'

createMdxldClient()
```

### MDX Routes

```mdx
---
$type: BlogPost
$id: https://example.com/posts/hello
title: Hello World
---

# {frontmatter.title}

Content here...
```

## Exports

| Export | Description |
|--------|-------------|
| `@mdxe/honox` | Main entry with all utilities |
| `@mdxe/honox/vite` | Vite plugin for MDXLD |
| `@mdxe/honox/server` | Server utilities and middleware |
| `@mdxe/honox/client` | Client hydration and JSON-LD extraction |
| `@mdxe/honox/renderer` | JSX renderer with structured data |

## Features

- File-based routing with MDX
- JSON-LD structured data from frontmatter
- Islands architecture support
- Document caching
- SSR with hydration
