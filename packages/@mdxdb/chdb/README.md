# @mdxdb/chdb

Embedded ClickHouse for Node.js with **vector similarity search** and **ULID** support.

This is a fork of [chdb](https://github.com/chdb-io/chdb) built with additional features enabled:

- `USE_USEARCH=1` - Vector similarity indexes (HNSW with cosine/L2 distance)
- Full ULID function support (`generateULID()`)

## Features

- **Vector Search**: Create HNSW indexes for semantic search
- **ULID Support**: Time-sortable unique identifiers
- **Full ClickHouse**: Complete SQL OLAP engine
- **Zero Server**: Runs in-process, no external dependencies

## Installation

```bash
npm install @mdxdb/chdb
# or
pnpm add @mdxdb/chdb
```

## Usage

```typescript
import { Session } from '@mdxdb/chdb'

const session = new Session()

// Vector similarity search
session.query(`
  CREATE TABLE embeddings (
    id String DEFAULT generateULID(),
    text String,
    embedding Array(Float32),
    INDEX idx_embedding embedding TYPE vector_similarity('hnsw', 'cosineDistance', 1536) GRANULARITY 1
  ) ENGINE = MergeTree() ORDER BY id
`)

// Insert with auto-generated ULID
session.query(`
  INSERT INTO embeddings (text, embedding)
  VALUES ('Hello world', [0.1, 0.2, ...])
`)

// Semantic search using cosine similarity
const results = session.query(`
  SELECT id, text, cosineDistance(embedding, [0.1, 0.2, ...]) as distance
  FROM embeddings
  ORDER BY distance
  LIMIT 10
`, 'JSON')

session.cleanup()
```

## API

### `query(sql: string, format?: string): string`

Execute a query and return results in the specified format (default: CSV).

### `Session`

Persistent session with stateful database:

```typescript
const session = new Session('/path/to/data')  // Persistent
const session = new Session()                  // Temporary
session.query('SELECT 1')
session.cleanup()
```

## Build from Source

This package includes pre-built binaries for:
- Linux x86_64 / ARM64
- macOS x86_64 / ARM64

To build from source:

```bash
pnpm build:native
```

Requires:
- CMake 3.20+
- Clang 16+ or GCC 12+
- Python 3.8+

## Architecture

```
@mdxdb/chdb
├── prebuilds/           # Pre-built native binaries
│   ├── linux-x64/
│   ├── linux-arm64/
│   ├── darwin-x64/
│   └── darwin-arm64/
├── src/
│   └── index.ts         # TypeScript wrapper
└── scripts/
    └── build-native.js  # Native build script
```

## Differences from upstream chdb

| Feature | chdb | @mdxdb/chdb |
|---------|------|-------------|
| vector_similarity index | ❌ | ✅ |
| generateULID() | ❌ | ✅ |
| annoy index | ❌ | ✅ |
| usearch index | ❌ | ✅ |

## License

Apache-2.0 (same as ClickHouse and chdb)
