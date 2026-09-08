/**
 * The shared provider contract on the node-side backends.
 * The workers pool (test/workers/contract.test.ts) runs it on the real DO.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMemoryProvider } from 'ai-database'
import { createProviderContractTests } from '../src/tests.js'
import { createDOProvider } from '../src/providers/do.js'
import { FakeNamespace } from './helpers/fake-do.js'

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
