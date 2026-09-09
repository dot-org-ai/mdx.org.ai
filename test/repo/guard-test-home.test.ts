/**
 * Repo-level guard for the repo-level guards (mdx-8je.30).
 *
 * Guard suites that assert monorepo invariants (removed packages, tsconfig
 * boundaries, README taxonomy, primitives policy, ...) have exactly one home:
 * test/repo/. They are run by `pnpm test:repo` (vitest.repo.config.ts), which
 * is chained into `pnpm test` / `pnpm test:unit` and has its own CI step.
 *
 * Before this guard, suites were split between tests/ (never run by any
 * script; turbo only runs per-package scripts) and test/repo/, so three
 * invariant suites sat on no CI path at all. This test makes that drift a
 * red build instead of a silent one.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(__dirname, '..', '..')
const CANONICAL = 'test/repo'
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', '.next', '.source', 'coverage'])
const TEST_FILE = /\.(test|spec)\.(ts|mts|cts|js|mjs|cjs|tsx)$/

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let isDir = false
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (isDir) walk(full, out)
    else if (TEST_FILE.test(entry)) out.push(full)
  }
  return out
}

const rel = (file: string) => relative(ROOT, file)

describe('repo guard tests have one home and one CI path', () => {
  it(`${CANONICAL}/ holds at least one guard suite`, () => {
    expect(walk(join(ROOT, CANONICAL)).length).toBeGreaterThan(0)
  })

  it('tests/ (mdx fixtures) contains no *.test.ts guard suites', () => {
    // tests/ is the home of the .mdx fixture suites run by vitest.mdx.config.ts.
    // A TypeScript guard suite placed there is on no script's include path.
    const strays = walk(join(ROOT, 'tests')).map(rel)
    expect(strays, `move these to ${CANONICAL}/ (git mv <file> ${CANONICAL}/) so pnpm test:repo runs them`).toEqual([])
  })

  it('no other root-level test directory has appeared', () => {
    const rootTestDirs = readdirSync(ROOT).filter((entry) => /^tests?$|^__tests__$|^spec$/.test(entry) && statSync(join(ROOT, entry)).isDirectory())
    expect(rootTestDirs.sort()).toEqual(['test', 'tests'])
  })

  it('vitest.repo.config.ts includes the canonical home', () => {
    const config = readFileSync(join(ROOT, 'vitest.repo.config.ts'), 'utf8')
    expect(config).toMatch(/['"]test\/repo\/\*\*\/\*\.test\.ts['"]/)
  })

  it('root package.json wires test:repo into test and test:unit', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts['test:repo']).toMatch(/vitest run --config vitest\.repo\.config\.ts/)
    expect(pkg.scripts.test).toMatch(/pnpm test:repo/)
    expect(pkg.scripts['test:unit']).toMatch(/pnpm test:repo/)
  })

  it('.github/workflows/ci.yml runs pnpm test:repo as its own step', () => {
    const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8')
    expect(ci).toMatch(/run:\s*pnpm test:repo/)
  })
})
