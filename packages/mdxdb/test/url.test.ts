import { describe, it, expect } from 'vitest'
import { parseDatabaseUrl, UnsupportedDatabaseUrlError, DEFAULT_DO_BINDING } from '../src/url.js'

describe('parseDatabaseUrl', () => {
  it('defaults to the filesystem at ./content', () => {
    expect(parseDatabaseUrl()).toEqual({ provider: 'fs', root: './content' })
    expect(parseDatabaseUrl('')).toEqual({ provider: 'fs', root: './content' })
    expect(parseDatabaseUrl('   ')).toEqual({ provider: 'fs', root: './content' })
    expect(parseDatabaseUrl(null)).toEqual({ provider: 'fs', root: './content' })
  })

  it('treats a bare path as the filesystem root', () => {
    expect(parseDatabaseUrl('./content')).toEqual({ provider: 'fs', root: './content' })
    expect(parseDatabaseUrl('/srv/mdx')).toEqual({ provider: 'fs', root: '/srv/mdx' })
    expect(parseDatabaseUrl('content')).toEqual({ provider: 'fs', root: 'content' })
    expect(parseDatabaseUrl('file:///srv/mdx')).toEqual({ provider: 'fs', root: '/srv/mdx' })
  })

  it(':memory: selects the in-memory provider', () => {
    expect(parseDatabaseUrl(':memory:')).toEqual({ provider: 'memory' })
    expect(parseDatabaseUrl('memory://')).toEqual({ provider: 'memory' })
  })

  describe('do:// (primary)', () => {
    it('names a Durable Object on the default binding', () => {
      expect(parseDatabaseUrl('do://headless.ly')).toEqual({
        provider: 'do',
        name: 'headless.ly',
        binding: DEFAULT_DO_BINDING,
      })
      expect(DEFAULT_DO_BINDING).toBe('MDXDB')
    })

    it('keeps path segments in the name and drops a trailing slash', () => {
      expect(parseDatabaseUrl('do://tenants/acme/')).toMatchObject({ provider: 'do', name: 'tenants/acme' })
    })

    it('reads binding, vectorize and r2 from the query', () => {
      expect(parseDatabaseUrl('do://headless.ly?binding=TENANTS&vectorize=VECTORS&r2=EXPORTS')).toEqual({
        provider: 'do',
        name: 'headless.ly',
        binding: 'TENANTS',
        vectorize: 'VECTORS',
        r2: 'EXPORTS',
      })
    })

    it('sqlite://<name> is an alias for do://<name> (DO SQLite is the SQLite adapter)', () => {
      expect(parseDatabaseUrl('sqlite://headless.ly')).toEqual({
        provider: 'do',
        name: 'headless.ly',
        binding: 'MDXDB',
      })
    })

    it('rejects a local path after do:// or sqlite://', () => {
      expect(() => parseDatabaseUrl('sqlite://./content')).toThrow(UnsupportedDatabaseUrlError)
      expect(() => parseDatabaseUrl('do:///var/db')).toThrow(/Durable Object by name/)
    })

    it('rejects an empty name', () => {
      expect(() => parseDatabaseUrl('do://')).toThrow(/needs a Durable Object name/)
    })
  })

  describe('clickhouse', () => {
    it('chdb:// is local chDB under <root>/.db/clickhouse', () => {
      expect(parseDatabaseUrl('chdb://./content')).toEqual({
        provider: 'clickhouse',
        mode: 'chdb',
        path: './content/.db/clickhouse',
      })
      expect(parseDatabaseUrl('chdb://')).toEqual({
        provider: 'clickhouse',
        mode: 'chdb',
        path: './content/.db/clickhouse',
      })
    })

    it('clickhouse:// is HTTP, clickhouses:// is HTTPS', () => {
      expect(parseDatabaseUrl('clickhouse://localhost:8123/mdx')).toEqual({
        provider: 'clickhouse',
        mode: 'http',
        url: 'http://localhost:8123/mdx',
        ns: 'localhost',
      })
      expect(parseDatabaseUrl('clickhouses://ch.example.com:8443')).toEqual({
        provider: 'clickhouse',
        mode: 'http',
        url: 'https://ch.example.com:8443',
        ns: 'ch.example.com',
      })
    })
  })

  it('http(s):// selects the API client with the hostname as namespace', () => {
    expect(parseDatabaseUrl('https://db.example.com/api/db/')).toEqual({
      provider: 'api',
      url: 'https://db.example.com/api/db',
      ns: 'db.example.com',
    })
    expect(parseDatabaseUrl('http://localhost:3000')).toMatchObject({ provider: 'api', ns: 'localhost' })
  })

  it('rejects Turso/libSQL with a pointer to do://', () => {
    expect(() => parseDatabaseUrl('libsql://my-db.turso.io')).toThrow(UnsupportedDatabaseUrlError)
    expect(() => parseDatabaseUrl('libsql://my-db.turso.io')).toThrow(/do:\/\/<name>/)
  })

  it('rejects unknown schemes instead of falling back to memory', () => {
    expect(() => parseDatabaseUrl('mongodb://localhost/mdx')).toThrow(UnsupportedDatabaseUrlError)
    try {
      parseDatabaseUrl('postgres://localhost/mdx')
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedDatabaseUrlError)
      expect((err as UnsupportedDatabaseUrlError).code).toBe('UNSUPPORTED_DATABASE_URL')
      expect((err as UnsupportedDatabaseUrlError).url).toBe('postgres://localhost/mdx')
    }
  })
})
