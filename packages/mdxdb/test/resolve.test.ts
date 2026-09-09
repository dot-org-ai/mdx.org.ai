import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryProvider } from 'ai-database'
import { resolveProvider, databaseUrl, MissingBindingError } from '../src/resolve.js'
import { UnsupportedDatabaseUrlError } from '../src/url.js'
import { DOProvider } from '../src/providers/do.js'
import { ApiProvider } from '../src/providers/api.js'
import { FakeNamespace } from './helpers/fake-do.js'

const createClickhouseProvider = vi.fn(async (config: Record<string, unknown>) => ({ kind: 'clickhouse', config }))
vi.mock('@mdxdb/clickhouse', () => ({ createClickhouseProvider }))

describe('databaseUrl precedence', () => {
  const saved = process.env['DATABASE_URL']
  beforeEach(() => {
    delete process.env['DATABASE_URL']
  })
  afterEach(() => {
    if (saved === undefined) delete process.env['DATABASE_URL']
    else process.env['DATABASE_URL'] = saved
  })

  it('explicit url > env.DATABASE_URL > process.env.DATABASE_URL > undefined', () => {
    expect(databaseUrl()).toBeUndefined()
    process.env['DATABASE_URL'] = 'do://from-process'
    expect(databaseUrl()).toBe('do://from-process')
    expect(databaseUrl({ env: { DATABASE_URL: 'do://from-env' } })).toBe('do://from-env')
    expect(databaseUrl({ url: 'do://explicit', env: { DATABASE_URL: 'do://from-env' } })).toBe('do://explicit')
  })

  it('ignores a non-string env.DATABASE_URL', () => {
    expect(databaseUrl({ env: { DATABASE_URL: 42 } })).toBeUndefined()
  })
})

describe('resolveProvider', () => {
  it(':memory: → ai-database MemoryProvider', async () => {
    const provider = await resolveProvider({ url: ':memory:' })
    expect(provider).toBeInstanceOf(MemoryProvider)
  })

  describe('do://', () => {
    it('binds to env[MDXDB] by default and names the object from the url', async () => {
      const MDXDB = new FakeNamespace()
      const provider = await resolveProvider({ url: 'do://headless.ly', env: { MDXDB } })
      expect(provider).toBeInstanceOf(DOProvider)
      expect((provider as DOProvider).name).toBe('headless.ly')
      expect(await (provider as DOProvider).$id()).toBe('https://headless.ly')
      expect(MDXDB.objects.has('headless.ly')).toBe(true)
    })

    it('honours ?binding= and reads DATABASE_URL from the env itself', async () => {
      const TENANTS = new FakeNamespace()
      const provider = await resolveProvider({ env: { DATABASE_URL: 'do://acme?binding=TENANTS', TENANTS } })
      expect(provider).toBeInstanceOf(DOProvider)
      expect(TENANTS.objects.has('acme')).toBe(true)
    })

    it('fails closed when the binding is missing from env', async () => {
      await expect(resolveProvider({ url: 'do://headless.ly' })).rejects.toBeInstanceOf(MissingBindingError)
      await expect(resolveProvider({ url: 'do://headless.ly', env: { MDXDB: {} } })).rejects.toThrow(/binding "MDXDB"/)
      await expect(resolveProvider({ url: 'do://x?binding=OTHER', env: { MDXDB: new FakeNamespace() } })).rejects.toThrow(
        /binding "OTHER"/
      )
    })
  })

  describe('./content (filesystem)', () => {
    let root: string
    beforeEach(async () => {
      root = await mkdtemp(join(tmpdir(), 'mdxdb-resolve-'))
    })
    afterEach(async () => {
      await rm(root, { recursive: true, force: true })
    })

    it('loads @mdxdb/fs rooted at the path', async () => {
      const provider = await resolveProvider({ url: root })
      expect(provider.constructor.name).toBe('FsProvider')
      await provider.create('Post', 'hello', { title: 'Hello' })
      expect((await provider.get('Post', 'hello'))?.['title']).toBe('Hello')
    })
  })

  describe('clickhouse', () => {
    beforeEach(() => createClickhouseProvider.mockClear())

    it('clickhouse://user:pass@host:8123/db → @mdxdb/clickhouse over HTTP with credentials split out', async () => {
      const provider = await resolveProvider({ url: 'clickhouse://reader:s3cret@ch.internal:8123/mdx' })
      expect(createClickhouseProvider).toHaveBeenCalledTimes(1)
      expect(createClickhouseProvider.mock.calls[0]![0]).toEqual({
        url: 'http://ch.internal:8123',
        username: 'reader',
        password: 's3cret',
        database: 'mdx',
        ns: 'ch.internal',
      })
      expect((provider as unknown as { kind: string }).kind).toBe('clickhouse')
    })

    it('chdb:// is rejected: @mdxdb/clickhouse is HTTP-only', async () => {
      await expect(resolveProvider({ url: 'chdb://./content' })).rejects.toBeInstanceOf(UnsupportedDatabaseUrlError)
      await expect(resolveProvider({ url: 'chdb://./content' })).rejects.toThrow(/HTTP only/)
      expect(createClickhouseProvider).not.toHaveBeenCalled()
    })
  })

  it('https:// → @mdxdb/api client scoped to the hostname', async () => {
    const provider = await resolveProvider({ url: 'https://db.example.com/api/db', env: { MDXDB_API_KEY: 'k' } })
    expect(provider).toBeInstanceOf(ApiProvider)
    expect((provider as ApiProvider).ns).toBe('db.example.com')
    expect((provider as ApiProvider).url('Post', 'hello')).toBe('https://db.example.com/Post/hello')
    expect((provider as ApiProvider).client.constructor.name).toBe('DBApiClient')
  })

  it('rejects libsql:// instead of falling back to memory', async () => {
    await expect(resolveProvider({ url: 'libsql://db.turso.io' })).rejects.toBeInstanceOf(UnsupportedDatabaseUrlError)
  })
})
