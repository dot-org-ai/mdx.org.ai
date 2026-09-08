/**
 * "help never loads the heavy runtime" — pinned at the SOURCE level: the CLI hot path (`src/cli.ts`
 * top-level imports and everything under `src/cli/`) must not statically import a runtime, a
 * server, a deploy adapter, or an AI package. Those are reached ONLY through `await import(...)`
 * inside the command arms, after the meta fast-path and the orientation have already returned.
 */

import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(dirname(fileURLToPath(import.meta.url))), 'src')

/** Static (top-level) import specifiers of a module — `import ... from 'x'` and `export ... from 'x'`. */
function staticImports(source: string): string[] {
  const out: string[] = []
  const re = /^(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) out.push(m[1]!)
  return out
}

const HEAVY = [
  'ai-evaluate',
  'ai-functions',
  'ai-workflows',
  'ai-database',
  '@mdxe/hono',
  '@mdxe/fumadocs',
  '@mdxe/deploy',
  '@mdxe/payload',
  '@mdxdb/',
  'miniflare',
  'wrangler',
  'mdxld',
  'oauth.do',
  './commands/',
  './sdk',
]

describe('the CLI hot path is LIGHT', () => {
  test('src/cli.ts has no static import of a runtime / server / adapter / AI package', () => {
    const imports = staticImports(readFileSync(join(SRC, 'cli.ts'), 'utf8'))
    expect(imports.length).toBeGreaterThan(0)
    for (const spec of imports) {
      for (const heavy of HEAVY) expect(spec, `static import of ${spec}`).not.toContain(heavy)
    }
  })

  test('every src/cli/*.ts module imports only node built-ins, its siblings, and the @mdxe/cli-core leaf', () => {
    const dir = join(SRC, 'cli')
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    expect(files.sort()).toEqual(['args.ts', 'orient.ts'])
    for (const f of files) {
      for (const spec of staticImports(readFileSync(join(dir, f), 'utf8'))) {
        expect(spec.startsWith('./') || spec.startsWith('node:') || spec === '@mdxe/cli-core', `${f} imports ${spec}`).toBe(true)
      }
    }
  })
})
