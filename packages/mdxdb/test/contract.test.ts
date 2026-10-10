/**
 * The shared provider contract on the node-side backends:
 *
 * - memory (ai-database)
 * - do — DOProvider over an in-process fake stub (the workers pool,
 *   test/workers/do.test.ts, runs it on the real @mdxdb/do in workerd)
 * - fs (@mdxdb/fs)
 * - api — ApiProvider over an in-process DBClient fake, and over the real
 *   `@mdxdb/api` DBApiClient talking JSON:API to a real `@mdxdb/server` app
 *   (no socket: the client's `fetch` is the Hono app)
 *
 * clickhouse runs in test/clickhouse.test.ts, gated on CLICKHOUSE_URL.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryProvider } from 'ai-database'
import { createProviderContractTests } from '../src/tests.js'
import { createDOProvider } from '../src/providers/do.js'
import { createApiProvider, type ThingClientLike } from '../src/providers/api.js'
import { FakeNamespace } from './helpers/fake-do.js'
import { MemoryDBClient } from './helpers/memory-db-client.js'

createProviderContractTests('memory (ai-database)', {
  create: () => createMemoryProvider(),
})

let n = 0
createProviderContractTests('do (in-process fake stub)', {
  create: () => createDOProvider({ namespace: new FakeNamespace(), name: `fake-${++n}.local` }),
})

const dirs = new WeakMap<object, string>()
createProviderContractTests('fs (@mdxdb/fs)', {
  create: async () => {
    const { createFsProvider } = await import('@mdxdb/fs')
    const root = await mkdtemp(join(tmpdir(), 'mdxdb-fs-'))
    const provider = createFsProvider({ root })
    dirs.set(provider, root)
    return provider
  },
  cleanup: async (provider) => {
    const root = dirs.get(provider)
    if (root) await rm(root, { recursive: true, force: true })
  },
})

createProviderContractTests('api (in-process DBClient fake)', {
  create: () => createApiProvider({ client: new MemoryDBClient(), ns: 'api.local' }),
})

createProviderContractTests('api (@mdxdb/api DBApiClient ↔ @mdxdb/server, in-process)', {
  create: async () => {
    const { createDBServer } = await import('@mdxdb/server/db')
    const { createDBClient } = await import('@mdxdb/api/db')
    const app = createDBServer({ client: new MemoryDBClient(), cors: false })
    // Typed, not cast: the real DBClient has to satisfy ThingClientLike.
    const client: ThingClientLike = createDBClient({
      baseUrl: 'http://mdxdb.test/api/db',
      fetch: (input, init) => app.fetch(new Request(input, init)),
    })
    return createApiProvider({ client, ns: 'api.local' })
  },
})
