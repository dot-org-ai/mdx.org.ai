/**
 * The published ai-* primitives (consumed from npm, see primitives-collapse.test.ts)
 * import types from `mdxld` — e.g. ai-database@2.4.0 `dist/types.d.ts` does
 * `import type { MDXLD } from 'mdxld'` and `interface ThingExpanded extends MDXLD`.
 *
 * Every name they import must be exported by the workspace `mdxld`, otherwise the
 * next `mdxld` release silently breaks their types (the break is masked in-repo by
 * `skipLibCheck`). Renaming or dropping an export that a primitive still imports
 * needs a deprecated alias first (as `MDXLD` -> `MDXLDDocument` did in mdx-8je.2).
 *
 * This guards the workspace surface only. Whether the *published* mdxld that the
 * primitives resolve from the registry carries these names is a release concern
 * (mdx-8je.20): ship a changeset and publish.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const MDXLD_DIR = join(ROOT, 'packages', 'mdxld')
const PRIMITIVES = ['ai-database', 'ai-functions', 'ai-workflows', 'ai-evaluate']

/** Entry point of each `mdxld` subpath export, keyed by specifier. */
const MDXLD_ENTRY: Record<string, string> = {
  mdxld: 'index.ts',
  'mdxld/types': 'types.ts',
  'mdxld/typegen': 'typegen.ts',
  'mdxld/functions': 'functions.ts',
  'mdxld/database': 'database.ts',
  'mdxld/workflows': 'workflows.ts',
}

function walk(dir: string, matchFile: (name: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let isDir = false
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (isDir) walk(full, matchFile, out)
    else if (matchFile(entry)) out.push(full)
  }
  return out
}

/** Resolve an installed primitive through mdxld's own node_modules (it declares all of them as devDependencies). */
function installedPrimitive(name: string): { version: string; dist: string } | null {
  const link = join(MDXLD_DIR, 'node_modules', name)
  if (!existsSync(link)) return null
  const dir = realpathSync(link)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string }
  return { version: pkg.version, dist: join(dir, 'dist') }
}

/** `import type { A, B as C } from 'mdxld'` -> [{ specifier: 'mdxld', names: ['A', 'B'] }, ...] */
function mdxldImports(dts: string): Array<{ specifier: string; names: string[] }> {
  const out: Array<{ specifier: string; names: string[] }> = []
  const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"](mdxld(?:\/[a-z]+)?)['"]/g
  for (const match of dts.matchAll(re)) {
    const names = match[1]
      .split(',')
      .map((part) => part.trim().replace(/^type\s+/, ''))
      .filter(Boolean)
      .map((part) => part.split(/\s+as\s+/)[0].trim())
    out.push({ specifier: match[2], names })
  }
  return out
}

/** Names exported from an mdxld source entry via `export [type] { ... } [from ...]`, plus `export * from` markers. */
function exportedNames(entryFile: string): { names: Set<string>; reexportsAll: boolean } {
  const src = readFileSync(join(MDXLD_DIR, 'src', entryFile), 'utf8')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const names = new Set<string>()
  for (const match of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const cleaned = part.trim().replace(/^type\s+/, '')
      if (!cleaned) continue
      const [, alias] = cleaned.split(/\s+as\s+/)
      names.add((alias ?? cleaned).trim())
    }
  }
  for (const match of src.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1])
  }
  return { names, reexportsAll: /export\s+\*\s+from/.test(src) }
}

describe('workspace mdxld exports every name the published primitives import from it', () => {
  const found = PRIMITIVES.map((name) => ({ name, pkg: installedPrimitive(name) })).filter((p) => p.pkg !== null) as Array<{
    name: string
    pkg: { version: string; dist: string }
  }>

  it('at least ai-database is installed (otherwise this suite is vacuous)', () => {
    expect(found.map((p) => p.name)).toContain('ai-database')
  })

  for (const { name, pkg } of found) {
    it(`${name}@${pkg.version}: every mdxld import resolves against packages/mdxld/src`, () => {
      const missing: string[] = []
      const dtsFiles = existsSync(pkg.dist) ? walk(pkg.dist, (f) => f.endsWith('.d.ts')) : []

      for (const file of dtsFiles) {
        for (const { specifier, names } of mdxldImports(readFileSync(file, 'utf8'))) {
          const entry = MDXLD_ENTRY[specifier]
          if (!entry) {
            missing.push(`${file}: unknown mdxld subpath '${specifier}'`)
            continue
          }
          const surface = exportedNames(entry)
          // `export * from` (functions/database/workflows) re-exports the primitive itself; skip those entries.
          if (surface.reexportsAll) continue
          for (const imported of names) {
            if (!surface.names.has(imported)) missing.push(`${name}: ${file.slice(pkg.dist.length + 1)} imports '${imported}' from '${specifier}'`)
          }
        }
      }

      expect(missing).toEqual([])
    })
  }

  it('the deprecated MDXLD alias (imported by ai-database) stays exported from mdxld', () => {
    // Belt and braces for the specific import that motivated this suite (mdx-8je.2 / mdx-8je.20).
    expect(exportedNames('index.ts').names.has('MDXLD')).toBe(true)
    expect(exportedNames('index.ts').names.has('MDXLDDocument')).toBe(true)
  })
})
