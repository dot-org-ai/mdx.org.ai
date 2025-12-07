# @mdxdb/studio

Full-featured MDX editor with filesystem integration, live preview, and hot reload.

## Installation

```bash
pnpm add @mdxdb/studio
```

## CLI Usage

```bash
# Start studio in current directory
mdxdb-studio

# Start with custom content path
mdxdb-studio --path ./content

# Start on a different port
mdxdb-studio --port 3000

# Show help
mdxdb-studio --help
```

## Programmatic Usage

```typescript
import { createStudio } from '@mdxdb/studio'

const studio = createStudio({
  contentDir: './content',
  port: 4321,
  hotReload: true,
  databaseUrl: 'clickhouse://localhost:8123' // optional
})

// Get file tree
const files = await studio.getFiles()

// Read a document
const doc = await studio.readDocument('posts/hello.mdx')

// Save changes
await studio.saveDocument('posts/hello.mdx', updatedContent)

// Create new document
await studio.createDocument('posts/new-post.mdx')

// Watch for file changes
const unwatch = studio.watch((event) => {
  console.log(event.type, event.relativePath)
})
```

## Features

- File browser with directory tree
- Read/write MDX documents
- Parse frontmatter and content
- Hot reload support
- File system watching
- Create/delete documents
- Filters hidden files and node_modules
- Sorts directories first, then alphabetically

## API

### `createStudio(config)`

Create a studio instance.

```typescript
interface StudioConfig {
  contentDir: string          // Base directory for content files
  port?: number               // Server port (default: 4321)
  hotReload?: boolean         // Enable hot reload (default: true)
  databaseUrl?: string        // Optional ClickHouse integration
  components?: Record<string, unknown>  // Custom preview components
}
```

### Studio Methods

- `getFiles()` - Get file tree with metadata
- `readDocument(path)` - Read and parse document
- `saveDocument(path, content)` - Save document
- `createDocument(path, template?)` - Create new document
- `deleteDocument(path)` - Delete document
- `watch(callback)` - Watch for file changes
- `parse(content)` - Parse MDX to document
- `stringify(doc)` - Convert document to MDX

## File Structure

```
content/
├── posts/
│   ├── hello.mdx
│   └── world.mdx
├── docs/
│   └── getting-started.mdx
└── README.mdx
```

Only `.mdx` and `.md` files are shown in the browser.

## Related Packages

- `mdxld` - MDX parsing and stringification
- `@mdxui/editor` - Optional editor UI component
