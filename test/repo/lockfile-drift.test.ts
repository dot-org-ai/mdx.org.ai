/**
 * The installed node_modules must be the one pnpm-lock.yaml describes (mdx-8je.55).
 *
 * The 2.4.0 primitives train (ai-functions, ai-database, ai-workflows,
 * ai-evaluate, rpc.do, oauth.do, ...) moved symbols between packages -
 * RPC / RPCPromise left ai-functions for rpc.do. A verification run that
 * resolved its dependencies through node_modules symlinked from a checkout
 * installed against an OLDER lockfile (ai-functions@0.4.0) stayed green while
 * the committed lockfile (ai-functions@2.4.0) was TS2305. Nothing in the repo
 * could tell the two apart.
 *
 * This guard witnesses the installed tree against the committed lockfile: for
 * every workspace importer, each primitive / .do dependency linked at
 * <importer>/node_modules/<name> must carry exactly the version pnpm-lock.yaml
 * resolves for that importer. It goes red when
 *
 *   - node_modules was populated from a different lockfile (another checkout,
 *     a stale worktree, a manual `pnpm add` without committing the lock), or
 *   - the lockfile was edited without re-running `pnpm install`.
 *
 * Either way the fix is `pnpm install --frozen-lockfile` in THIS checkout, not
 * a symlink. Scope is deliberately the primitives and .do packages: they are
 * the ones whose versions carry the model decisions this suite protects.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '..', '..')

/** Packages whose exact version is a modelling decision, not an implementation detail. */
const TRACKED = /^(ai-[a-z0-9-]+|rpc\.do|oauth\.do|@dotdo\/[a-z0-9-]+)$/

interface LockDep {
  importer: string
  field: string
  name: string
  /** Bare version with pnpm's peer-suffix `(...)` stripped. */
  version: string
}

/**
 * Minimal reader for the `importers:` section of a pnpm v9 lockfile. Layout:
 *
 *   importers:
 *     <path>:
 *       dependencies:          (or devDependencies / optionalDependencies)
 *         <name>:
 *           specifier: ^2.4.0
 *           version: 2.4.0(peer@1)(peer@2)
 *
 * `link:` / `workspace:` / `file:` versions are workspace links, not registry
 * installs, and are skipped.
 */
function readImporterDeps(lock: string): LockDep[] {
  const out: LockDep[] = []
  const lines = lock.split('\n')
  let inImporters = false
  let importer = ''
  let field = ''
  let name = ''
  const unquote = (s: string) => s.replace(/^['"]|['"]$/g, '')
  for (const raw of lines) {
    if (raw.trim() === '') continue
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()
    if (indent === 0) {
      inImporters = line === 'importers:'
      continue
    }
    if (!inImporters) continue
    if (indent === 2 && line.endsWith(':')) {
      importer = unquote(line.slice(0, -1))
    } else if (indent === 4 && line.endsWith(':')) {
      field = line.slice(0, -1)
    } else if (indent === 6 && line.endsWith(':')) {
      name = unquote(line.slice(0, -1))
    } else if (indent === 8 && line.startsWith('version:')) {
      const spec = unquote(line.slice('version:'.length).trim())
      if (/^(link|workspace|file):/.test(spec)) continue
      out.push({ importer, field, name, version: spec.replace(/\(.*$/, '') })
    }
  }
  return out
}

function installedVersion(importer: string, name: string): string | null {
  const dir = importer === '.' ? ROOT : join(ROOT, importer)
  const pkgJson = join(dir, 'node_modules', name, 'package.json')
  if (!existsSync(pkgJson)) return null
  return String((JSON.parse(readFileSync(pkgJson, 'utf-8')) as { version?: unknown }).version)
}

describe('installed node_modules matches pnpm-lock.yaml (mdx-8je.55)', () => {
  const lock = readFileSync(join(ROOT, 'pnpm-lock.yaml'), 'utf-8')
  const deps = readImporterDeps(lock)
  const tracked = deps.filter((d) => TRACKED.test(d.name))

  it('reads the lockfile importers section', () => {
    expect(deps.length).toBeGreaterThan(50)
    expect(deps.some((d) => d.importer === '.')).toBe(true)
  })

  it('the lockfile pins primitives / .do packages for the workspace', () => {
    // If this ever hits zero the primitives left the repo entirely - re-decide
    // the TRACKED pattern, do not delete the guard.
    expect(tracked.length).toBeGreaterThan(5)
    expect(tracked.some((d) => d.name === 'ai-functions')).toBe(true)
    expect(tracked.some((d) => d.name === 'rpc.do')).toBe(true)
  })

  it('every tracked dependency is installed at exactly the version the lockfile resolves', () => {
    const missing: string[] = []
    const drifted: string[] = []
    for (const { importer, field, name, version } of tracked) {
      const installed = installedVersion(importer, name)
      if (installed === null) missing.push(`${importer} ${field}.${name} (lock: ${version})`)
      else if (installed !== version) drifted.push(`${importer} ${field}.${name}: lock ${version}, installed ${installed}`)
    }
    expect(missing, 'not installed under the importer that declares it - run `pnpm install --frozen-lockfile` in this checkout').toEqual([])
    expect(
      drifted,
      'node_modules was resolved against a different lockfile than the committed one (symlinked from another checkout?) - run `pnpm install --frozen-lockfile` in this checkout'
    ).toEqual([])
  })

  it('the primitives train is one version across the workspace', () => {
    const byName = new Map<string, Set<string>>()
    for (const { name, version } of tracked) {
      if (!name.startsWith('ai-')) continue
      byName.set(name, (byName.get(name) ?? new Set()).add(version))
    }
    const split = [...byName].filter(([, versions]) => versions.size > 1).map(([name, versions]) => `${name}: ${[...versions].join(', ')}`)
    expect(split, 'an ai-* primitive resolves to different versions in different importers').toEqual([])
    const trains = new Set([...byName.values()].flatMap((v) => [...v]))
    expect(trains.size, `ai-* primitives are on more than one train: ${[...trains].join(', ')}`).toBe(1)
  })
})
