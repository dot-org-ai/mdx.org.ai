/**
 * @mdxe/cli-core is a LEAF — pinned at the source level. Every `src/*.ts` module statically imports
 * only its siblings (`./…`); node built-ins are reached ONLY through lazy `await import(...)`, so
 * importing the package costs nothing on the mdxe CLI hot path, and it can never grow a dependency
 * that would re-create the mdxe ⇄ @mdxe/hono cycle this package exists to break (mdx-8je.26).
 */

import { describe, expect, test } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC = join(PKG, 'src')

/** Static (top-level) import specifiers of a module — `import ... from 'x'` and `export ... from 'x'`. */
function staticImports(source: string): string[] {
  const out: string[] = []
  const re = /^(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) out.push(m[1]!)
  return out
}

const modules = (): string[] => readdirSync(SRC).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

describe('@mdxe/cli-core is a leaf', () => {
  test('the module set is exactly the shared resolvers plus the barrel', () => {
    expect(modules().sort()).toEqual(['caller.ts', 'context.ts', 'errors.ts', 'index.ts', 'tokens.ts'])
  })

  test('every src/*.ts module statically imports only its siblings', () => {
    for (const f of modules()) {
      const specs = staticImports(readFileSync(join(SRC, f), 'utf8'))
      for (const spec of specs) expect(spec.startsWith('./'), `${f} statically imports ${spec}`).toBe(true)
    }
  })

  test('the barrel re-exports from every sibling module', () => {
    const specs = staticImports(readFileSync(join(SRC, 'index.ts'), 'utf8'))
    expect(specs.sort()).toEqual(['./caller.js', './context.js', './errors.js', './tokens.js'])
  })

  test('package.json declares no runtime or peer dependencies', () => {
    const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')) as Record<string, unknown>
    expect(pkg.dependencies).toBeUndefined()
    expect(pkg.peerDependencies).toBeUndefined()
  })
})
