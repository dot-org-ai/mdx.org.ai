/**
 * The AI primitives (ai-functions, ai-database, ai-workflows, ai-evaluate, ...)
 * have exactly one home: the published npm packages. This repo must not vendor
 * them as a submodule, link them through the pnpm workspace, or alias source
 * paths into a local checkout.
 *
 * See mdx-8je.2.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const PRIMITIVE_DEP = /^ai-[a-z0-9-]+$/
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.claude', '.turbo', '.next', '.source', 'coverage'])

function walk(dir: string, matchFile: (name: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
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

function workspacePackageJsons(): string[] {
  const files = [join(ROOT, 'package.json')]
  for (const scope of ['apps', 'packages']) {
    const dir = join(ROOT, scope)
    if (!existsSync(dir)) continue
    files.push(...walk(dir, (name) => name === 'package.json'))
  }
  return files
}

describe('primitives are consumed from npm, not vendored', () => {
  it('pnpm-workspace.yaml has no primitives/ entry', () => {
    const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
    const entries = yaml
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^\s*-\s*/, '').replace(/^['"]|['"]$/g, ''))

    expect(entries.length).toBeGreaterThan(0)
    expect(entries.filter((entry) => entry.includes('primitives'))).toEqual([])
  })

  it('no primitives/ submodule or directory exists', () => {
    expect(existsSync(join(ROOT, 'primitives'))).toBe(false)

    const gitmodules = join(ROOT, '.gitmodules')
    if (existsSync(gitmodules)) {
      expect(readFileSync(gitmodules, 'utf8')).not.toMatch(/path\s*=\s*primitives\b/)
    }
  })

  it('no package depends on an ai-* primitive via workspace:', () => {
    const offenders: string[] = []

    for (const file of workspacePackageJsons()) {
      const pkg = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string> | undefined>
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const [name, range] of Object.entries(pkg[field] ?? {})) {
          if (PRIMITIVE_DEP.test(name) && typeof range === 'string' && range.startsWith('workspace:')) {
            offenders.push(`${relative(ROOT, file)} ${field}.${name} = ${range}`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('ai-* primitives are pinned to a published version range', () => {
    const unversioned: string[] = []

    for (const file of workspacePackageJsons()) {
      const pkg = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string> | undefined>
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const [name, range] of Object.entries(pkg[field] ?? {})) {
          if (!PRIMITIVE_DEP.test(name) || typeof range !== 'string') continue
          // Accept semver ranges (^2.4.0, >=2.0.0, 2.4.0, *); reject protocols (file:, link:, git+, workspace:).
          if (/^[a-z+]+:/.test(range) || /^(git|github|https?)/.test(range)) {
            unversioned.push(`${relative(ROOT, file)} ${field}.${name} = ${range}`)
          }
        }
      }
    }

    expect(unversioned).toEqual([])
  })

  it('no tsconfig or vitest config aliases into a local primitives checkout', () => {
    const configs = [...walk(ROOT, (name) => name === 'tsconfig.json' || /^vitest(\..+)?\.config\.(ts|mts|js|mjs)$/.test(name))].filter(
      (file) => !relative(ROOT, file).startsWith('examples/')
    )

    const offenders = configs.filter((file) => /primitives\/packages\//.test(readFileSync(file, 'utf8')))

    expect(offenders.map((file) => relative(ROOT, file))).toEqual([])
  })
})
