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
 * '?' entries from the issue, decided here:
 * - @mdxe/fumadocs      KEEP  builds a docs site whose only deploy target is
 *                             Workers via @opennextjs/cloudflare; it is the
 *                             `mdxe deploy` path for `$type: Docs` projects.
 * - @mdxdb/fumadocs     KEEP  runtime-agnostic content-source adapter; feeds
 *                             apps/docs and @mdxui/fumadocs.
 * - @mdxdb/git          DROP  isomorphic-git over node:fs + isomorphic-git/http/node;
 *                             cannot run in workerd.
 * - @mdxdb/github       KEEP  Octokit over fetch; runs in Workers.
 * - @mdxdb/rpc          KEEP  rpc.do (capnweb) client; Cloudflare-native.
 * - @mdxdb/server       KEEP  Hono; runs on Workers.
 * - @mdxdb/sources      KEEP  for now; mdx-8je.17 (deferred) moves it to primitives.
 * - @mdxdb/sqlite       KEEP  not in the issue text, but it is the Durable Object
 *                             SQLite adapter that mdx-8je.5/.19/.22/.23/.24 invested
 *                             in; see mdx-8je.7's close note.
 */
const ALLOWED: Record<string, readonly string[]> = {
  '@mdxe': [
    'cli-core',
    'cloudflare',
    'deploy',
    'do',
    'fumadocs',
    'hono',
    'ink',
    'isolate',
    'mcp',
    'opentui', // mdx-8je.15 (not yet created)
    'test-utils',
    'tui',
    'vitest',
    'workers',
  ],
  '@mdxdb': ['api', 'clickhouse', 'do', 'fs', 'fumadocs', 'github', 'parquet', 'rpc', 'server', 'sources', 'sqlite', 'vectorize'],
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
          `add it deliberately or delete it (mdx-8je.7: Cloudflare-native only)`,
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
