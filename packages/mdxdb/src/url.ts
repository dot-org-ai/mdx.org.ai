/**
 * DATABASE_URL parsing
 *
 * Every mdxdb backend is addressed by a URL. Parsing is pure and synchronous
 * so it can be unit-tested without loading any adapter:
 *
 * | URL                                | Provider   | Backed by                              |
 * | ---------------------------------- | ---------- | -------------------------------------- |
 * | `do://headless.ly`                 | do         | `@mdxdb/do` MDXDurableObject (primary) |
 * | `do://headless.ly?binding=DB`      | do         | custom DO namespace binding            |
 * | `sqlite://headless.ly`             | do         | alias: `@mdxdb/sqlite` *is* DO SQLite  |
 * | `./content` (any path)             | fs         | `@mdxdb/fs` (git-friendly .mdx files)  |
 * | `clickhouse://host:8123/db`        | clickhouse | `@mdxdb/clickhouse` (HTTP)             |
 * | `chdb://./content`                 | clickhouse | parsed; rejected at resolve (no chDB)  |
 * | `https://db.example.com/api/db`    | api        | `@mdxdb/api` DBApiClient               |
 * | `:memory:`                         | memory     | `ai-database` MemoryProvider           |
 *
 * `libsql://` / `*.turso.io` are recognised and rejected: no Cloudflare-native
 * adapter exists for Turso. `chdb://` parses (it is the documented local
 * ClickHouse form) but `resolveProvider()` rejects it because
 * `@mdxdb/clickhouse` is HTTP-only. Rejecting is deliberate — a silent
 * fallback to memory (what ai-database does) hides a misconfigured
 * production database.
 *
 * @packageDocumentation
 */

/** Default DO namespace binding name (matches `@mdxdb/do` wrangler.toml). */
export const DEFAULT_DO_BINDING = 'MDXDB'

/** Default filesystem root when DATABASE_URL is unset. */
export const DEFAULT_FS_ROOT = './content'

export type ParsedDatabaseUrl =
  | { provider: 'memory' }
  | { provider: 'fs'; root: string }
  | {
      provider: 'do'
      /** Durable Object name — becomes the `$id` base (`https://<name>`) */
      name: string
      /** Workers env binding holding the DO namespace */
      binding: string
      /** Optional Vectorize index binding (semantic search sidecar) */
      vectorize?: string
      /** Optional R2 bucket binding (parquet export target) */
      r2?: string
    }
  | { provider: 'clickhouse'; mode: 'chdb'; path: string }
  | { provider: 'clickhouse'; mode: 'http'; url: string; ns: string }
  | { provider: 'api'; url: string; ns: string }

export type ProviderKind = ParsedDatabaseUrl['provider']

/** Thrown for URLs that name a backend mdxdb does not ship. */
export class UnsupportedDatabaseUrlError extends Error {
  readonly code = 'UNSUPPORTED_DATABASE_URL'
  constructor(
    readonly url: string,
    reason: string
  ) {
    super(`Unsupported DATABASE_URL "${url}": ${reason}`)
    this.name = 'UnsupportedDatabaseUrlError'
  }
}

function stripTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

/**
 * Parse a `do://` (or `sqlite://`) URL.
 *
 * `do://headless.ly` → name `headless.ly`, binding `MDXDB`
 * `do://tenants/acme?binding=TENANTS&vectorize=VECTORS&r2=EXPORTS`
 */
function parseDoUrl(raw: string, scheme: string): ParsedDatabaseUrl {
  const rest = raw.slice(scheme.length)
  if (rest.startsWith('.') || rest.startsWith('/')) {
    throw new UnsupportedDatabaseUrlError(
      raw,
      `"${scheme}" addresses a Durable Object by name, not a local file path. ` +
        `Use "${scheme}<name>" (e.g. "do://headless.ly") inside a Worker with a DO binding, ` +
        `or "./content" for local files.`
    )
  }
  const [beforeQuery, query = ''] = rest.split('?', 2) as [string, string?]
  const name = stripTrailingSlash(beforeQuery)
  if (!name) {
    throw new UnsupportedDatabaseUrlError(raw, `"${scheme}" needs a Durable Object name`)
  }
  const params = new URLSearchParams(query)
  const parsed: ParsedDatabaseUrl = {
    provider: 'do',
    name,
    binding: params.get('binding') || DEFAULT_DO_BINDING,
  }
  const vectorize = params.get('vectorize')
  const r2 = params.get('r2')
  if (vectorize) parsed.vectorize = vectorize
  if (r2) parsed.r2 = r2
  return parsed
}

/**
 * Parse a DATABASE_URL into a provider descriptor.
 *
 * Never loads an adapter; see `resolveProvider()` for that.
 */
export function parseDatabaseUrl(url?: string | null): ParsedDatabaseUrl {
  const raw = (url ?? '').trim()
  if (!raw) return { provider: 'fs', root: DEFAULT_FS_ROOT }

  if (raw === ':memory:' || raw === 'memory://') return { provider: 'memory' }

  if (raw.startsWith('do://')) return parseDoUrl(raw, 'do://')
  if (raw.startsWith('sqlite://')) return parseDoUrl(raw, 'sqlite://')

  if (raw.startsWith('libsql://') || raw.includes('.turso.io')) {
    throw new UnsupportedDatabaseUrlError(
      raw,
      'Turso/libSQL has no Cloudflare-native mdxdb adapter. Use "do://<name>" (Durable Object SQLite).'
    )
  }

  if (raw.startsWith('chdb://')) {
    const path = raw.slice('chdb://'.length) || DEFAULT_FS_ROOT
    return { provider: 'clickhouse', mode: 'chdb', path: `${stripTrailingSlash(path)}/.db/clickhouse` }
  }

  if (raw.startsWith('clickhouse://') || raw.startsWith('clickhouses://')) {
    const secure = raw.startsWith('clickhouses://')
    const httpUrl = raw.replace(/^clickhouses?:\/\//, secure ? 'https://' : 'http://')
    let ns: string
    try {
      ns = new URL(httpUrl).hostname
    } catch {
      throw new UnsupportedDatabaseUrlError(raw, 'not a valid ClickHouse URL (expected clickhouse://host:port/db)')
    }
    return { provider: 'clickhouse', mode: 'http', url: httpUrl, ns }
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    let ns: string
    try {
      ns = new URL(raw).hostname
    } catch {
      throw new UnsupportedDatabaseUrlError(raw, 'not a valid http(s) URL')
    }
    return { provider: 'api', url: stripTrailingSlash(raw), ns }
  }

  if (raw.startsWith('file://')) {
    return { provider: 'fs', root: raw.slice('file://'.length) || DEFAULT_FS_ROOT }
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    throw new UnsupportedDatabaseUrlError(
      raw,
      'unknown scheme. Supported: do://, sqlite://, chdb://, clickhouse://, http(s)://, file://, a local path, or :memory:'
    )
  }

  // Bare path → filesystem
  return { provider: 'fs', root: raw }
}
