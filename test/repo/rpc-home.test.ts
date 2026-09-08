/**
 * Where capnweb RPC actually lives (mdx-8je.29).
 *
 * mdx-8je.6 deleted @mdxe/rpc and pointed RPC users at `RPC` / `RPCPromise`
 * from ai-functions. ai-functions@2.4 ships neither symbol (no `./rpc` subpath,
 * nothing in dist/*.d.ts), so that pointer was TS2305 and the guard that pinned
 * it only regex-matched source text - it stayed green while the build was red.
 *
 * This suite witnesses the symbols themselves against the installed packages:
 *
 *   - rpc.do (a root devDependency) exports `RPC` at runtime and declares
 *     `RPC` / `RPCPromise` in its types. The companion rpc-home.test-d.ts
 *     compiles `import { RPC, type RPCPromise } from 'rpc.do'` under tsc
 *     (vitest typecheck lane, see vitest.repo.config.ts), so a missing symbol
 *     is a red build, not a stale comment.
 *   - the ai-functions actually resolved by the workspace declares neither, so
 *     every doc that sends RPC users to ai-functions is wrong until this test
 *     changes. If a future ai-functions grows an RPC export, this goes red on
 *     purpose: the model in CLAUDE.md / README.md has to be re-decided, not
 *     silently drifted.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { RPC, capnweb } from 'rpc.do'

const ROOT = resolve(__dirname, '..', '..')

/**
 * pnpm links every declared dependency at <consumer>/node_modules/<name>;
 * both packages here are ESM-only with an `exports` map that hides
 * package.json, so require.resolve cannot be used - walk the link instead.
 */
function installedPackage(consumerDir: string, name: string): { dir: string; pkg: Record<string, unknown> } {
  const link = join(consumerDir, 'node_modules', name)
  expect(existsSync(link), `${name} is not installed under ${relative(ROOT, consumerDir) || '.'} (run pnpm install)`).toBe(true)
  const dir = realpathSync(link)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as Record<string, unknown>
  expect(pkg.name).toBe(name)
  return { dir, pkg }
}

function walkDts(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    let isDir = false
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (isDir) walkDts(full, out)
    else if (/\.d\.(ts|mts|cts)$/.test(entry)) out.push(full)
  }
  return out
}

/** A declaration or (re-)export of the symbol, not a mention in a comment. */
const DECLARES_RPC = /(?:export|declare|type|interface|function|class|const)\s[^;\n]*\bRPC(?:Promise)?\b/

describe('capnweb RPC home (mdx-8je.29)', () => {
  it('rpc.do resolves from the repo root and exports RPC / capnweb at runtime', () => {
    expect(typeof RPC).toBe('function')
    expect(typeof capnweb).toBe('function')
  })

  it('the installed rpc.do declares RPC and RPCPromise in its shipped types', () => {
    const { dir, pkg } = installedPackage(ROOT, 'rpc.do')
    const exportsMap = pkg.exports as Record<string, { types?: string }> | undefined
    const typesEntry = exportsMap?.['.']?.types ?? (pkg.types as string | undefined)
    expect(typesEntry, 'rpc.do package.json has no types entry').toBeDefined()
    const entryDts = readFileSync(join(dir, typesEntry as string), 'utf-8')
    // The entry re-exports the symbols (possibly under an internal alias: `R as RPC`).
    expect(entryDts).toMatch(/\bRPC\b/)
    expect(entryDts).toMatch(/\bRPCPromise\b/)
    const declared = walkDts(join(dir, 'dist'))
      .map((f) => readFileSync(f, 'utf-8'))
      .join('\n')
    expect(declared).toMatch(/\bdeclare function RPC\b/)
    expect(declared).toMatch(/\b(?:type|interface) RPCPromise\b/)
  })

  it('the installed ai-functions declares neither RPC nor RPCPromise (docs must not point RPC users there)', () => {
    // mdxai is the workspace consumer of ai-functions (mdxe dropped it in mdx-8je.34).
    const { dir, pkg } = installedPackage(join(ROOT, 'packages/mdxai'), 'ai-functions')
    expect(String(pkg.version)).toMatch(/^2\./)
    expect(Object.keys((pkg.exports as Record<string, unknown>) ?? {})).not.toContain('./rpc')
    const hits: string[] = []
    for (const file of walkDts(join(dir, 'dist'))) {
      if (DECLARES_RPC.test(readFileSync(file, 'utf-8'))) hits.push(relative(dir, file))
    }
    expect(hits, `ai-functions@${String(pkg.version)} now declares RPC / RPCPromise - re-decide the RPC pointer in CLAUDE.md / README.md (mdx-8je.29)`).toEqual(
      []
    )
  })
})
