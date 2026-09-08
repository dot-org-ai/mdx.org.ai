# mdxdb

Schema-first database for MDX content. A thin facade over [ai-database](https://www.npmjs.com/package/ai-database)'s `DB()` with the mdxdb backends registered and resolved from `DATABASE_URL` — Cloudflare-native first.

```bash
pnpm add mdxdb
```

## Usage

```ts
import { DB } from 'mdxdb'

const db = DB({
  Post: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts', // Creates Post.author -> Author AND Author.posts -> Post[]
  },
  Author: {
    name: 'string',
    email: 'string',
    // posts: Post[] auto-created from backref
  },
})

// Typed, provider-agnostic access
const post = await db.Post.get('hello-world')
const author = await post.author // Resolved Author
const posts = await db.Author.get('john').posts // Post[]
```

`DB()` is synchronous; the backend loads on first use.

## Backends (`DATABASE_URL`)

| `DATABASE_URL`                          | Backend                                                  | Package               |
| --------------------------------------- | -------------------------------------------------------- | --------------------- |
| `do://headless.ly`                      | Durable Object SQLite (**primary**) — hierarchy, hibernatable WebSocket RPC, parquet export | `@mdxdb/do`           |
| `do://headless.ly?binding=DB`           | same, custom namespace binding (default `MDXDB`)         | `@mdxdb/do`           |
| `sqlite://headless.ly`                  | alias for `do://` — `@mdxdb/sqlite` *is* DO SQLite        | `@mdxdb/do`           |
| `./content` (any path, `file://`)       | Filesystem — git-friendly `.mdx` files                    | `@mdxdb/fs`           |
| `clickhouse://user:pass@host:8123/db`   | ClickHouse over HTTP (`clickhouses://` for TLS)           | `@mdxdb/clickhouse`   |
| `https://db.example.com/api/db`         | mdxdb HTTP API (JSON:API); `env.MDXDB_API_KEY` if set     | `@mdxdb/api`          |
| `:memory:`                              | In-memory (tests)                                         | built in              |

Adapters are optional peer dependencies, loaded on demand. A URL that names an adapter you have not installed fails with the package to add; an unknown scheme, `libsql://`, or `chdb://` (no embedded ClickHouse adapter exists — `@mdxdb/clickhouse` is HTTP-only, mdx-8je.58) fails with a clear error. mdxdb never falls back to memory silently.

### Where the URL comes from

1. `DB(schema, { url })`
2. `env.DATABASE_URL` when you pass `DB(schema, { env })`
3. `process.env.DATABASE_URL`
4. `./content`

## Cloudflare Workers

There is no `process.env` in a Worker, and a `do://` URL needs the Durable Object namespace binding — so pass the env:

```toml
# wrangler.toml
[[durable_objects.bindings]]
name = "MDXDB"
class_name = "MDXDurableObject"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MDXDurableObject"]

[vars]
DATABASE_URL = "do://headless.ly"
```

```ts
import { DB } from 'mdxdb'
export { MDXDurableObject } from '@mdxdb/do/durable-object'

const schema = { Post: { title: 'string', author: 'Author.posts' }, Author: { name: 'string' } }

export default {
  async fetch(request: Request, env: Env) {
    const db = DB(schema, { env })
    return Response.json(await db.Post.list())
  },
}
```

Or build the provider yourself:

```ts
import { DB, createDOProvider } from 'mdxdb'

const db = DB(schema, {
  provider: createDOProvider({ namespace: env.MDXDB, name: 'headless.ly' }),
})
```

### What the DO provider stores

Entities are Things at `https://<name>/<Type>/<id>` with the record in `data`. Relation fields become **bidirectional edges**: `Post.author = 'john'` writes an edge `author` / reverse `posts`, so `db.Author.get('john').posts` is served from the Durable Object's reverse index and `stub.relatedBy(authorUrl, 'posts')` sees the same graph.

## Lower-level API

```ts
import { parseDatabaseUrl, resolveProvider, createDOProvider, createApiProvider } from 'mdxdb'

parseDatabaseUrl('do://headless.ly?binding=DB')
// { provider: 'do', name: 'headless.ly', binding: 'DB' }

const provider = await resolveProvider({ url: 'do://headless.ly', env })
```

`parseDatabaseUrl` is pure and synchronous; `resolveProvider` loads the adapter.

## Provider contract suite

Every backend runs the same suite. Adapter packages import it from `mdxdb/tests` (needs `vitest`):

```ts
import { createProviderContractTests } from 'mdxdb/tests'
import { createMemoryProvider } from 'ai-database'

createProviderContractTests('memory', { create: () => createMemoryProvider() })
```

It covers things (create/get/update/delete, id scoping, duplicates), listing (`where`, `orderBy`, `limit`/`offset`), relationships (`relate`/`related`/`unrelate`, idempotence), search, and then the `DB()` example above — an adapter is compliant only when the documented developer experience works on it.

In this repo the suite runs on the memory provider, `@mdxdb/fs`, an in-process DO fake, and — under `@cloudflare/vitest-pool-workers` — the real `@mdxdb/do` Durable Object inside workerd:

```bash
pnpm --filter mdxdb test            # node pool + workers pool
pnpm --filter mdxdb test:workers    # workerd only
```

## Notes on ai-database 2.4

- ai-database's entity operations read one process-wide provider (its `provider` option is only honoured by the events/actions/artifacts sub-APIs — mdx-8je.56), so the most recent `DB()` call decides the backend for every `DB()` instance. Create one `DB()` per process, or per request with its `env`.
- ai-database parses `'Author.posts'` into `Post.author` and `Author.posts` but only follows edges in the declared direction (mdx-8je.57); mdxdb wraps every provider so the reverse side resolves (`withSchemaRelations`). Backends that keep reverse indexes natively (`DOProvider`) implement `SchemaAwareProvider` and serve it themselves.
- `db.Author.get('john').posts` works at runtime but `DBPromise` does not type relation getters yet (mdx-8je.57).

## License

MIT
