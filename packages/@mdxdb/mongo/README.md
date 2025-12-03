# @mdxdb/mongo

MongoDB adapter for mdxdb with Atlas Vector Search support.

> **Note:** This package is currently a placeholder. Implementation coming soon.

## Planned Features

- **MongoDB Backend** - Store MDX documents in MongoDB
- **Atlas Vector Search** - Semantic search with vector embeddings
- **Aggregation Pipeline** - Complex queries and transformations
- **Change Streams** - Real-time document updates
- **Sharding Support** - Horizontal scaling
- **Type-Safe** - Full TypeScript support

## Planned API

```typescript
import { createMongoDatabase } from '@mdxdb/mongo'

const db = await createMongoDatabase({
  uri: 'mongodb://localhost:27017',
  // or
  uri: 'mongodb+srv://...',  // Atlas connection string

  database: 'myapp',
  collection: 'documents',   // Default collection

  // Options
  vectorIndex: 'vector_index',  // Atlas Search index name
  vectorDimension: 1536,
  enableChangeStreams: true
})

// Standard database operations
const user = await db.create({
  ns: 'example.com',
  type: 'User',
  data: { name: 'Alice' }
})

// Semantic search with Atlas Vector Search
const results = await db.vectorSearch({
  query: 'machine learning',
  limit: 10
})

// Aggregation queries
const stats = await db.aggregate([
  { $match: { type: 'BlogPost' } },
  { $group: { _id: '$data.author', count: { $sum: 1 } } }
])

// Real-time updates
db.watch({ type: 'User' }, (change) => {
  console.log('User changed:', change)
})
```

## Installation

```bash
npm install @mdxdb/mongo
# or
pnpm add @mdxdb/mongo
# or
yarn add @mdxdb/mongo
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
