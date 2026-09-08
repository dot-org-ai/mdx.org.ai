import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'

/**
 * mdx-8je.6: @mdxe/rpc and @mdxai/agentkit were deleted because they duplicated
 * capnweb RPC and autonomous-agents. Nothing in the workspace may depend on
 * them again, and the package directories must stay gone.
 *
 * mdx-8je.27 / mdx-8je.34: the replacement pointer that .6 wrote -
 * `export type { RPC, RPCPromise } from 'ai-functions'` in packages/mdxe -
 * was TS2305 (ai-functions@2.4.0 ships no RPC / RPCPromise; that API lives in
 * rpc.do, over @dotdo/capnweb) and broke mdxe's DTS build. That re-export is gone and must
 * not come back: no source file may import RPC or RPCPromise from ai-functions.
 */
const REMOVED_PACKAGES = ['@mdxe/rpc', '@mdxai/agentkit'] as const
const REMOVED_DIRS = ['packages/@mdxe/rpc', 'packages/@mdxai/agentkit'] as const
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', '.next', '.source', 'coverage'])

const root = resolve(__dirname, '..', '..')

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

const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/
// `import ... { X } from 'ai-functions'` / `export ... { X } from 'ai-functions'` - captures the specifier list.
const AI_FUNCTIONS_IMPORT = /(?:import|export)\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"]ai-functions(?:\/[^'"]*)?['"]/g

function findSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) findSourceFiles(full, out)
    else if (SOURCE_EXT.test(entry)) out.push(full)
  }
  return out
}

describe('removed duplicate packages (mdx-8je.6)', () => {
  const packageJsons = findPackageJsons(root)

  it('finds workspace package.json files', () => {
    expect(packageJsons.length).toBeGreaterThan(10)
  })

  for (const dir of REMOVED_DIRS) {
    it(`${dir} no longer exists`, () => {
      expect(existsSync(join(root, dir))).toBe(false)
    })
  }

  for (const removed of REMOVED_PACKAGES) {
    it(`no package.json declares or depends on ${removed}`, () => {
      const offenders: string[] = []
      for (const file of packageJsons) {
        const pkg = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>
        if (pkg.name === removed) offenders.push(`${file} (name)`)
        for (const field of DEP_FIELDS) {
          const deps = pkg[field] as Record<string, string> | undefined
          if (deps && removed in deps) offenders.push(`${file} (${field})`)
        }
      }
      expect(offenders).toEqual([])
    })
  }

  it('mdxe does not re-export RPC / RPCPromise from ai-functions (mdx-8je.27)', () => {
    const src = readFileSync(join(root, 'packages/mdxe/src/index.ts'), 'utf-8')
    expect(src).not.toMatch(/from\s+['"]ai-functions['"]/)
    expect(src).not.toMatch(/\bRPCPromise\b/)
  })

  it('no source file imports RPC or RPCPromise from ai-functions (mdx-8je.34)', () => {
    const offenders: string[] = []
    for (const file of findSourceFiles(join(root, 'packages'))) {
      const text = readFileSync(file, 'utf-8')
      for (const m of text.matchAll(AI_FUNCTIONS_IMPORT)) {
        if (/\bRPC(Promise)?\b/.test(m[1])) offenders.push(`${file}: ${m[0].trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
