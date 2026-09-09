/**
 * Provider resolution
 *
 * Turns a parsed DATABASE_URL into a live ai-database `DBProvider`, loading
 * the adapter package on demand. Adapters are optional peers: a URL that
 * names one which is not installed fails with the package name to add —
 * never a silent fallback to memory.
 *
 * @packageDocumentation
 */

import type { DBProvider } from 'ai-database'
import { parseDatabaseUrl, UnsupportedDatabaseUrlError, type ParsedDatabaseUrl } from './url.js'
import { createDOProvider, type MDXDatabaseNamespaceLike } from './providers/do.js'
import { createApiProvider, type ThingClientLike } from './providers/api.js'

/** Workers `env` (bindings + vars) or any bag of named resources. */
export type Bindings = Record<string, unknown>

export interface ResolveOptions {
  /** Explicit DATABASE_URL; wins over `env.DATABASE_URL` and `process.env.DATABASE_URL`. */
  url?: string
  /** Workers env: DO namespaces, Vectorize indexes, R2 buckets, `DATABASE_URL` var. */
  env?: Bindings
}

/** Thrown when the URL names an adapter that is not installed. */
export class AdapterNotInstalledError extends Error {
  readonly code = 'ADAPTER_NOT_INSTALLED'
  constructor(
    readonly pkg: string,
    readonly url: string,
    cause?: unknown
  ) {
    super(`DATABASE_URL "${url}" needs ${pkg}, which is not installed. Run: pnpm add ${pkg}`)
    this.name = 'AdapterNotInstalledError'
    if (cause instanceof Error) this.cause = cause
  }
}

/** Thrown when a `do://` URL names a binding the env does not carry. */
export class MissingBindingError extends Error {
  readonly code = 'MISSING_BINDING'
  constructor(
    readonly binding: string,
    readonly url: string
  ) {
    super(
      `DATABASE_URL "${url}" needs a Durable Object namespace binding "${binding}" in env. ` +
        `Pass the Workers env: DB(schema, { env }) — and declare the binding in wrangler.toml.`
    )
    this.name = 'MissingBindingError'
  }
}

/** Pick the DATABASE_URL from options, env, then process.env. */
export function databaseUrl(options: ResolveOptions = {}): string | undefined {
  if (options.url !== undefined) return options.url
  const fromEnv = options.env?.['DATABASE_URL']
  if (typeof fromEnv === 'string') return fromEnv
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return proc?.env?.['DATABASE_URL']
}

async function load<T>(pkg: string, url: string, importer: () => Promise<T>): Promise<T> {
  try {
    return await importer()
  } catch (err) {
    // Only a missing module is "not installed"; an installed adapter that throws
    // during init (which may also say "not found") must surface as itself.
    const code = (err as { code?: unknown } | null)?.code
    const msg = err instanceof Error ? err.message : String(err)
    if (
      code === 'ERR_MODULE_NOT_FOUND' ||
      code === 'ERR_PACKAGE_PATH_NOT_EXPORTED' ||
      /Cannot find (module|package)|Failed to resolve (import|module)|ERR_MODULE_NOT_FOUND/i.test(msg)
    ) {
      throw new AdapterNotInstalledError(pkg, url, err)
    }
    throw err
  }
}

/**
 * Build a provider for an already-parsed URL.
 */
export async function providerFor(parsed: ParsedDatabaseUrl, options: ResolveOptions = {}): Promise<DBProvider> {
  const url = databaseUrl(options) ?? ''
  const env = options.env ?? {}

  switch (parsed.provider) {
    case 'memory': {
      const { createMemoryProvider } = await import('ai-database')
      return createMemoryProvider()
    }

    case 'do': {
      const namespace = env[parsed.binding] as MDXDatabaseNamespaceLike | undefined
      if (!namespace || typeof namespace.idFromName !== 'function') {
        throw new MissingBindingError(parsed.binding, url || `do://${parsed.name}`)
      }
      return createDOProvider({ namespace, name: parsed.name })
    }

    case 'fs': {
      const { createFsProvider } = await load('@mdxdb/fs', url, () => import('@mdxdb/fs'))
      return createFsProvider({ root: parsed.root }) as unknown as DBProvider
    }

    case 'clickhouse': {
      if (parsed.mode === 'chdb') {
        // @mdxdb/clickhouse is HTTP-only; an embedded chDB adapter does not
        // exist (model gap mdx-8je.58). Fail closed rather than
        // pointing an HTTP executor at a directory.
        throw new UnsupportedDatabaseUrlError(
          url || `chdb://${parsed.path}`,
          'local chDB is not implemented by @mdxdb/clickhouse (HTTP only). ' +
            'Use "clickhouse://host:8123/db" or "do://<name>".'
        )
      }
      const { createClickhouseProvider } = await load('@mdxdb/clickhouse', url, () => import('@mdxdb/clickhouse'))
      const target = new URL(parsed.url)
      const database = target.pathname.replace(/^\/+/, '') || undefined
      target.pathname = '/'
      const username = decodeURIComponent(target.username) || undefined
      const password = decodeURIComponent(target.password) || undefined
      target.username = ''
      target.password = ''
      const provider = await createClickhouseProvider({
        url: target.toString().replace(/\/$/, ''),
        username,
        password,
        database,
        ns: parsed.ns,
      })
      return provider as unknown as DBProvider
    }

    case 'api': {
      const { createDBClient } = await load('@mdxdb/api', url, () => import('@mdxdb/api/db'))
      const apiKey = typeof env['MDXDB_API_KEY'] === 'string' ? env['MDXDB_API_KEY'] : undefined
      const client = createDBClient({ baseUrl: parsed.url, apiKey }) as unknown as ThingClientLike
      return createApiProvider({ client, ns: parsed.ns })
    }
  }
}

/**
 * Resolve the provider for a DATABASE_URL.
 *
 * @example
 * ```ts
 * const provider = await resolveProvider({ url: 'do://headless.ly', env })
 * const provider = await resolveProvider()          // process.env.DATABASE_URL or ./content
 * ```
 */
export async function resolveProvider(options: ResolveOptions = {}): Promise<DBProvider> {
  return providerFor(parseDatabaseUrl(databaseUrl(options)), options)
}
