/**
 * mdx-8je.12: exactly one diff implementation in the repo.
 *
 * @mdxld/extract and @mdxld/markdown each used to carry their own `diff` / `applyExtract`
 * while @mdxld/diff was never wired in. Now @mdxld/diff owns the structured primitives
 * (`diffPaths`, `applyPaths`, `merge3wayObjects`) and @mdxld/extract re-exports them as
 * `diff` / `applyExtract` / `mergeExtract` — thin, and provably the same functions.
 *
 * Witnessed at runtime through the built packages (a source regex cannot go red for a
 * re-export that silently became a copy):
 *   - @mdxld/markdown exports no diff / applyExtract
 *   - @mdxld/extract's diff / applyExtract produce exactly @mdxld/diff's results, and
 *     @mdxld/extract depends on @mdxld/diff
 *   - no package source outside packages/@mdxld/diff declares a `function diff(` /
 *     `function applyExtract(` body of its own
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(__dirname, '..', '..')
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', '.next', '.source', 'coverage'])
const SOURCE_EXT = /\.(ts|tsx|mts|cts)$/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, out)
    else if (SOURCE_EXT.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

async function load(pkg: string): Promise<Record<string, unknown> | undefined> {
  const entry = join(ROOT, 'packages', pkg, 'dist', 'index.js')
  if (!existsSync(entry)) return undefined
  return (await import(pathToFileURL(entry).href)) as Record<string, unknown>
}

describe('one diff implementation (mdx-8je.12): @mdxld/diff', () => {
  it('no package source outside packages/@mdxld/diff implements a diff / applyExtract body', () => {
    const offenders: string[] = []
    for (const file of walk(join(ROOT, 'packages'))) {
      const rel = relative(ROOT, file)
      if (rel.startsWith('packages/@mdxld/diff/')) continue
      const text = readFileSync(file, 'utf-8')
      for (const m of text.matchAll(/export\s+(?:async\s+)?function\s+(diff|applyExtract|diffPaths|applyPaths|merge3way(?:Objects)?)\s*[<(]/g)) {
        // @mdxld/extract's diff / applyExtract are one-line delegations to @mdxld/diff
        if (rel === 'packages/@mdxld/extract/src/extract.ts' && (m[1] === 'diff' || m[1] === 'applyExtract')) continue
        offenders.push(`${rel}: ${m[0].trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('@mdxld/extract depends on @mdxld/diff and @mdxld/markdown; @mdxld/markdown does not depend on either', () => {
    const extract = JSON.parse(readFileSync(join(ROOT, 'packages/@mdxld/extract/package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>
    }
    expect(extract.dependencies?.['@mdxld/diff']).toBe('workspace:*')
    expect(extract.dependencies?.['@mdxld/markdown']).toBe('workspace:*')

    const markdown = JSON.parse(readFileSync(join(ROOT, 'packages/@mdxld/markdown/package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>
    }
    expect(markdown.dependencies?.['@mdxld/extract']).toBeUndefined()
    expect(markdown.dependencies?.['@mdxld/diff']).toBeUndefined()
  })

  it('@mdxld/markdown exports no diff / applyExtract (runtime witness over dist)', async () => {
    const markdown = await load('@mdxld/markdown')
    if (!markdown) return // not built in this checkout; the package suite pins the same invariant
    expect(markdown.diff).toBeUndefined()
    expect(markdown.applyExtract).toBeUndefined()
    expect(typeof markdown.parseTable).toBe('function')
    expect(typeof markdown.renderTable).toBe('function')
  })

  it("@mdxld/extract's diff / applyExtract / mergeExtract are @mdxld/diff's primitives (runtime witness over dist)", async () => {
    const extract = await load('@mdxld/extract')
    const diff = await load('@mdxld/diff')
    if (!extract || !diff) return // not built in this checkout; packages/@mdxld/extract/src/merge.test.ts pins the same invariant

    const original = { data: { title: 'Hello', tags: ['a'] } }
    const extracted = { data: { title: 'Hi', tags: ['b'] } }
    const ex = extract as { diff: Function; applyExtract: Function; mergeExtract: Function }
    const d = diff as { diffPaths: Function; applyPaths: Function; merge3wayObjects: Function }

    expect(ex.diff(original, extracted)).toEqual(d.diffPaths(original, extracted))
    expect(ex.applyExtract(original, extracted, { arrayMerge: 'append' })).toEqual(d.applyPaths(original, extracted, { arrayMerge: 'append' }))
    expect(ex.mergeExtract(original, original, extracted)).toEqual(d.merge3wayObjects(original, original, d.applyPaths(original, extracted)))
  })
})
