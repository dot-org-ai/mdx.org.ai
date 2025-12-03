# @mdxdb/postgres

PostgreSQL adapter for mdxdb with pgvector support for semantic search.

> **Note:** This package is currently a placeholder. Implementation coming soon.

## Planned Features

- **PostgreSQL Backend** - Store MDX documents in PostgreSQL
- **pgvector Integration** - Semantic search with vector embeddings
- **JSONB Support** - Efficient storage and querying of document data
- **Graph Queries** - Relationships via foreign keys and CTEs
- **Full-Text Search** - PostgreSQL FTS integration
- **Type-Safe** - Full TypeScript support

## Planned API

```typescript
import { createPostgresDatabase } from '@mdxdb/postgres'

const db = await createPostgresDatabase({
  connectionString: 'postgresql://...',
  // or
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'secret',

  // Options
  schema: 'mdxdb',           // Database schema
  vectorDimension: 1536,     // Embedding dimension
  enableVector: true,        // Enable pgvector
  pool: {
    min: 2,
    max: 10
  }
})

// Standard database operations
const user = await db.create({
  ns: 'example.com',
  type: 'User',
  data: { name: 'Alice' }
})

// Semantic search with pgvector
const results = await db.vectorSearch({
  query: 'machine learning',
  limit: 10
})

// Full-text search
const posts = await db.search({
  query: 'typescript tutorial',
  type: 'BlogPost'
})
```

## Installation

```bash
npm install @mdxdb/postgres
# or
pnpm add @mdxdb/postgres
# or
yarn add @mdxdb/postgres
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/sqlite](https://www.npmjs.com/package/@mdxdb/sqlite) | SQLite backend (currently implemented) |
| [@mdxdb/clickhouse](https://www.npmjs.com/package/@mdxdb/clickhouse) | ClickHouse backend |
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem backend |

## Contributing

Contributions welcome! If you'd like to help implement this package, please open an issue to discuss the approach.

## License

MIT
