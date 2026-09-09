/**
 * Repo-level guard: every package's TypeScript program must stay inside its
 * own directory.
 *
 * Background (mdx-8je.4): packages that ran `tsc --noEmit` without their own
 * tsconfig.json fell back to the repo-root tsconfig.json, which has no
 * `include`, so each one type-checked the entire monorepo (~1,300 files,
 * ~12k phantom errors per package) and buried the package's real errors.
 *
 * Two invariants are asserted here:
 *   1. Every package whose `typecheck` script invokes `tsc` has a tsconfig.json
 *      of its own (so it can never fall back to the root config).
 *   2. For every packages/** tsconfig.json, the `include` / `files` entries,
 *      the effective include roots after `extends`, and the resolved file list
 *      all lie inside the package directory.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { isAbsolute, join, relative, resolve } from 'path'
import ts from 'typescript'

const repoRoot = resolve(__dirname, '..', '..')
const packagesRoot = join(repoRoot, 'packages')

/** Directories directly under packages/ or packages/@scope/ that hold a package.json. */
function listPackageDirs(): string[] {
  const dirs: string[] = []
  for (const entry of readdirSync(packagesRoot)) {
    const full = join(packagesRoot, entry)
    if (!statSync(full).isDirectory()) continue
    if (entry.startsWith('@')) {
      for (const scoped of readdirSync(full)) {
        const scopedFull = join(full, scoped)
        if (statSync(scopedFull).isDirectory() && existsSync(join(scopedFull, 'package.json'))) {
          dirs.push(scopedFull)
        }
      }
    } else if (existsSync(join(full, 'package.json'))) {
      dirs.push(full)
    }
  }
  return dirs.sort()
}

function isInside(dir: string, target: string): boolean {
  const rel = relative(dir, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/** Static path prefix of a glob, e.g. "src/**\/*.ts" -> "src". */
function globPrefix(pattern: string): string {
  const parts = pattern.split(/[\\/]/)
  const staticParts: string[] = []
  for (const part of parts) {
    if (/[*?{}[\]]/.test(part)) break
    staticParts.push(part)
  }
  return staticParts.join('/')
}

const packageDirs = listPackageDirs()
const pkgLabel = (dir: string) => relative(repoRoot, dir)

describe('packages/** tsconfig.json stay inside their package', () => {
  it('finds workspace packages', () => {
    expect(packageDirs.length).toBeGreaterThan(0)
  })

  describe('packages that run tsc have their own tsconfig.json', () => {
    const tscPackages = packageDirs.filter((dir) => {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>
      }
      const typecheck = pkg.scripts?.typecheck ?? ''
      return /\btsc\b/.test(typecheck) && !/-p\s|--project/.test(typecheck)
    })

    for (const dir of tscPackages) {
      it(`${pkgLabel(dir)} has tsconfig.json (would otherwise fall back to the root config)`, () => {
        expect(existsSync(join(dir, 'tsconfig.json'))).toBe(true)
      })
    }
  })

  describe('include/files entries and the resolved program stay inside the package', () => {
    const withTsconfig = packageDirs.filter((dir) => existsSync(join(dir, 'tsconfig.json')))

    for (const dir of withTsconfig) {
      const configPath = join(dir, 'tsconfig.json')

      it(`${pkgLabel(dir)}`, () => {
        const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile)
        expect(error, `failed to read ${configPath}`).toBeUndefined()

        const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dir, undefined, configPath)
        const fatal = parsed.errors.filter(
          (d) => d.category === ts.DiagnosticCategory.Error && d.code !== 18003 // 18003: no inputs found
        )
        expect(
          fatal.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
          `tsconfig parse errors in ${pkgLabel(dir)}`
        ).toEqual([])

        // 1. This file's own include/files entries must point inside the package.
        const raw = parsed.raw as { include?: string[]; files?: string[] }
        for (const pattern of [...(raw.include ?? []), ...(raw.files ?? [])]) {
          const target = resolve(dir, globPrefix(pattern))
          expect(isInside(dir, target), `${pkgLabel(dir)} include/files entry "${pattern}" escapes the package`).toBe(true)
        }

        // 2. The effective include roots (after `extends`) must be inside the package.
        //    TypeScript derives these from the resolved include globs.
        const wildcardRoots = Object.keys(parsed.wildcardDirectories ?? {})
        const escapedRoots = wildcardRoots.filter((root) => !isInside(dir, resolve(root)))
        expect(
          escapedRoots.map((root) => relative(repoRoot, root)),
          `${pkgLabel(dir)} effective include roots escape the package`
        ).toEqual([])

        // 3. Belt and braces: the actual resolved file list is inside the package.
        const escapees = parsed.fileNames.map((f) => resolve(f)).filter((f) => !isInside(dir, f))
        expect(
          escapees.map((f) => relative(repoRoot, f)).slice(0, 10),
          `${pkgLabel(dir)} program includes ${escapees.length} file(s) outside the package (showing up to 10)`
        ).toEqual([])
      })
    }
  })
})
