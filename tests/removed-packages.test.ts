import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'

/**
 * mdx-8je.6: @mdxe/rpc and @mdxai/agentkit were deleted because they duplicated
 * ai-functions RPC and autonomous-agents. Nothing in the workspace may depend on
 * them again, and the package directories must stay gone.
 */
const REMOVED_PACKAGES = ['@mdxe/rpc', '@mdxai/agentkit'] as const
const REMOVED_DIRS = ['packages/@mdxe/rpc', 'packages/@mdxai/agentkit'] as const
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', '.next', '.source', 'coverage'])

const root = resolve(__dirname, '..')

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

  it('mdxe re-exports the capnweb RPC types from ai-functions directly', () => {
    const src = readFileSync(join(root, 'packages/mdxe/src/index.ts'), 'utf-8')
    expect(src).toMatch(/export type \{\s*RPC,\s*RPCPromise,?\s*\} from 'ai-functions'/)
    const mdxePkg = JSON.parse(readFileSync(join(root, 'packages/mdxe/package.json'), 'utf-8'))
    expect(mdxePkg.dependencies['ai-functions']).toBeDefined()
  })
})
