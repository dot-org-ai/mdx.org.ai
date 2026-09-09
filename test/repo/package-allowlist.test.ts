import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

/**
 * mdx-8je.7: mdx.org.ai is Cloudflare-native only. Arbitrary code runs through
 * Dynamic Worker Loaders (workerd) everywhere; Node and Bun survive only as thin
 * CLI shells that boot workerd. The packages that existed to serve other
 * deployment models (Node/Bun eval, Electron, Expo, Vercel, Next.js, Payload,
 * HonoX, Slidev, Remotion, GitHub Pages, MongoDB, PostgreSQL, the Electron /
 * React-Native document stores and Studio) were deleted; their history stays
 * in git.
 *
 * This suite is the allowlist. A new directory under packages/@mdxe or
 * packages/@mdxdb that is not named here fails the build until it is added
 * deliberately, so the runtime surface cannot grow back by accident.
 *
 * The allowlist below is the reconciled one (mdx-8je.62). The mdx-8je.7 issue
 * text was written before the sibling issues landed and named a smaller set
 * with four '?' marks; this file, not the issue text, is the source of truth.
 * Each entry records where it came from so the next reader can tell a
 * decision from an accident:
 *
 *   ISSUE    named in the mdx-8je.7 allowlist text
 *   '?'      named with a question mark in that text; decided here
 *   SIBLING  absent from that text; built by a sibling issue and kept
 *
 * @mdxe
 * - workers      ISSUE    the runtime: Dynamic Worker Loaders, Miniflare locally.
 * - isolate      ISSUE    compiles MDX into isolated Worker modules.
 * - hono         ISSUE    HTTP middleware; runs on Workers.
 * - mcp          ISSUE    stdio transport for CLI shells, http for Workers.
 * - do           ISSUE    `mdxe deploy --platform do` provider (.do platform).
 * - deploy       ISSUE    unified deploy over @mdxe/do and @mdxe/cloudflare.
 * - fumadocs     '?' KEEP builds a docs site whose only deploy target is
 *                         Workers via @opennextjs/cloudflare; it is the
 *                         `mdxe deploy` path for `$type: Docs` projects.
 * - vitest       ISSUE    runs ```ts test blocks under vitest via ai-evaluate.
 * - test-utils   ISSUE    shared fixtures, mocks, matchers (mocks move to
 *                         primitives under deferred mdx-8je.17).
 * - ink          ISSUE    Ink 7 viewer over the @mdxe/tui seam.
 * - opentui      ISSUE    PENDING: mdx-8je.15 creates it; allowed ahead of time
 *                         so that issue does not have to touch this guard.
 * - tui          ISSUE    the viewer seam (mdx-8je.13): Viewer interface, input
 *                         abstraction, conformance suite, benchmark harness.
 * - cloudflare   SIBLING  `mdxe deploy --platform cloudflare` provider; the only
 *                         Workers deploy path left once @mdxe/vercel and
 *                         @mdxe/github were pruned. @mdxe/deploy dynamically
 *                         imports it (packages/@mdxe/deploy/src/index.ts).
 * - cli-core     SIBLING  mdx-8je.26: leaf holding the resolvers mdxe and
 *                         @mdxe/hono share (OutputCtx ladder, caller detection,
 *                         CliError/EXIT, token oracle); breaks the mdxe <->
 *                         @mdxe/hono dependency cycle.
 * - (rpc)        ISSUE    listed as "rpc-via-ai-functions" but deliberately NOT
 *                         a directory: capnweb RPC is `rpc.do`, `@mdxe/rpc` was a
 *                         duplicate and `ai-functions@2.4` ships no RPC export.
 *                         test/repo/rpc-home.test.ts pins that home.
 *
 * @mdxdb
 * - do           ISSUE    primary backend (mdx-8je.11): Durable Object with
 *                         hierarchy, hibernatable WebSockets, parquet export.
 * - sqlite       SIBLING  the Durable Object SQLite graph adapter (_data / _rels)
 *                         that mdx-8je.5/.19/.22/.23/.24 invested in; runs under
 *                         @cloudflare/vitest-pool-workers.
 * - vectorize    ISSUE    Cloudflare Vectorize vector search.
 * - parquet      ISSUE    pure-JS parquet read/write (Workers, Snippets).
 * - clickhouse   ISSUE    analytics over HTTP; runs from Workers.
 * - fs           ISSUE    git-friendly .mdx files; used by CLI shells, not workerd.
 * - api          ISSUE    HTTP API client over fetch.
 * - fumadocs     '?' KEEP runtime-agnostic content-source adapter; feeds
 *                         apps/docs and @mdxui/fumadocs.
 * - git          '?' DROP isomorphic-git over node:fs + isomorphic-git/http/node;
 *                         cannot run in workerd. Listed in REMOVED_PACKAGES.
 * - github       '?' KEEP Octokit over fetch; runs in Workers.
 * - rpc          '?' KEEP rpc.do (capnweb) client; Cloudflare-native.
 * - server       '?' KEEP Hono; runs on Workers.
 * - sources      ISSUE    "sources->primitives": kept until deferred mdx-8je.17
 *                         moves it to primitives.
 *
 * Two directions are guarded. Forward: a directory not named here fails.
 * Reverse: an entry named here that is not on disk fails too, unless it is
 * listed in PENDING with the issue that will create it, so the allowlist can
 * neither grow nor go stale silently (the mdx-8je.62 contradiction was
 * exactly text that no longer matched the tree).
 */
const ALLOWED: Record<string, readonly string[]> = {
  '@mdxe': ['cli-core', 'cloudflare', 'deploy', 'do', 'fumadocs', 'hono', 'ink', 'isolate', 'mcp', 'opentui', 'test-utils', 'tui', 'vitest', 'workers'],
  '@mdxdb': ['api', 'clickhouse', 'do', 'fs', 'fumadocs', 'github', 'parquet', 'rpc', 'server', 'sources', 'sqlite', 'vectorize'],
}

/** Allowlisted ahead of creation. Remove the entry when the named issue lands. */
const PENDING: Record<string, string> = {
  '@mdxe/opentui': 'mdx-8je.15',
}

const REMOVED_PACKAGES = [
  '@mdxe/node',
  '@mdxe/bun',
  '@mdxe/electron',
  '@mdxe/expo',
  '@mdxe/vercel',
  '@mdxe/next',
  '@mdxe/payload',
  '@mdxe/honox',
  '@mdxe/slidev',
  '@mdxe/remotion',
  '@mdxe/github',
  '@mdxdb/desktop',
  '@mdxdb/mobile',
  '@mdxdb/mongo',
  '@mdxdb/postgres',
  '@mdxdb/payload',
  '@mdxdb/studio',
  '@mdxdb/git',
] as const

/** App shells that existed only to host a removed runtime. */
const REMOVED_APPS = ['apps/desktop', 'apps/mobile'] as const

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', '.next', '.source', 'coverage'])

const ROOT = resolve(__dirname, '..', '..')

function findPackageJsons(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) findPackageJsons(full, out)
    else if (entry === 'package.json') out.push(full)
  }
  return out
}

describe('Cloudflare-native package allowlist (mdx-8je.7)', () => {
  for (const [scope, allowed] of Object.entries(ALLOWED)) {
    it(`packages/${scope} contains only allowlisted packages`, () => {
      const dir = join(ROOT, 'packages', scope)
      const present = readdirSync(dir).filter((entry) => statSync(join(dir, entry)).isDirectory())
      const strays = present.filter((entry) => !allowed.includes(entry))
      expect(
        strays,
        `packages/${scope}/{${strays.join(',')}} is not on the allowlist in test/repo/package-allowlist.test.ts; ` +
          `add it deliberately or delete it (mdx-8je.7: Cloudflare-native only)`
      ).toEqual([])
    })

    it(`every allowlisted ${scope} package exists on disk unless PENDING`, () => {
      const dir = join(ROOT, 'packages', scope)
      const stale = allowed.filter((entry) => !(`${scope}/${entry}` in PENDING) && !existsSync(join(dir, entry, 'package.json')))
      expect(
        stale,
        `${scope}/{${stale.join(',')}} is allowlisted in test/repo/package-allowlist.test.ts but has no package.json; ` +
          `remove the entry, restore the package, or add it to PENDING with the issue that creates it (mdx-8je.62)`
      ).toEqual([])
    })

    it(`every packages/${scope}/<dir> declares the ${scope}/<dir> name`, () => {
      const dir = join(ROOT, 'packages', scope)
      const mismatches: string[] = []
      for (const entry of readdirSync(dir)) {
        const pj = join(dir, entry, 'package.json')
        if (!existsSync(pj)) continue
        const pkg = JSON.parse(readFileSync(pj, 'utf-8')) as { name?: string }
        if (pkg.name !== `${scope}/${entry}`) mismatches.push(`${entry} -> ${pkg.name}`)
      }
      expect(mismatches).toEqual([])
    })
  }

  it('PENDING names only allowlisted packages that do not exist yet', () => {
    const wrong: string[] = []
    for (const [name, issue] of Object.entries(PENDING)) {
      const [scope, entry] = name.split('/')
      if (!ALLOWED[scope]?.includes(entry)) wrong.push(`${name} is PENDING (${issue}) but not in ALLOWED`)
      if (existsSync(join(ROOT, 'packages', scope, entry, 'package.json'))) wrong.push(`${name} exists now; drop it from PENDING (${issue} landed)`)
      if (!/^mdx-[a-z0-9]+(\.\d+)?$/.test(issue)) wrong.push(`${name}: '${issue}' is not a tracker issue id`)
    }
    expect(wrong).toEqual([])
  })

  it('ALLOWED and REMOVED_PACKAGES are disjoint', () => {
    const both = REMOVED_PACKAGES.filter((removed) => {
      const [scope, entry] = removed.split('/')
      return ALLOWED[scope]?.includes(entry)
    })
    expect(both).toEqual([])
  })

  for (const removed of REMOVED_PACKAGES) {
    const dir = `packages/${removed}`
    it(`${dir} no longer exists`, () => {
      expect(existsSync(join(ROOT, dir))).toBe(false)
    })
  }

  for (const app of REMOVED_APPS) {
    it(`${app} no longer exists`, () => {
      expect(existsSync(join(ROOT, app))).toBe(false)
    })
  }

  it('no package.json declares or depends on a removed package', () => {
    const offenders: string[] = []
    for (const file of findPackageJsons(ROOT)) {
      const pkg = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>
      const rel = relative(ROOT, file)
      for (const removed of REMOVED_PACKAGES) {
        if (pkg.name === removed) offenders.push(`${rel} (name)`)
        for (const field of DEP_FIELDS) {
          const deps = pkg[field] as Record<string, string> | undefined
          if (deps && removed in deps) offenders.push(`${rel} (${field}: ${removed})`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('no source file imports a removed package', () => {
    const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/
    const IMPORT = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](@mdx(?:e|db)\/[a-z-]+)(?:\/[^'"]*)?['"]/g
    const removedSet = new Set<string>(REMOVED_PACKAGES)
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue
        const full = join(dir, entry)
        let st
        try {
          st = statSync(full)
        } catch {
          continue
        }
        if (st.isDirectory()) walk(full)
        else if (SOURCE_EXT.test(entry)) {
          const text = readFileSync(full, 'utf-8')
          for (const m of text.matchAll(IMPORT)) {
            if (removedSet.has(m[1])) offenders.push(`${relative(ROOT, full)}: ${m[0].trim()}`)
          }
        }
      }
    }
    for (const top of ['packages', 'apps', 'scripts', 'examples']) {
      if (existsSync(join(ROOT, top))) walk(join(ROOT, top))
    }
    expect(offenders).toEqual([])
  })
})
