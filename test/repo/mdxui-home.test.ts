/**
 * Where mdxui lives (mdx-8je.8).
 *
 * dot-do/ui owns the npm name `mdxui` (7.0.0-alpha) and every @mdxui/* package:
 * the format renderers that used to be packages/@mdxui/{html,json,markdown,slack,email}
 * here were received there with history (ui-9ml4.1) and `@mdxui/markdown` became the
 * `md` register of `@mdxui/text`. mdx.org.ai consumes them from the registry only.
 *
 * This suite pins that home in both directions:
 *
 *   - packages/mdxui, packages/@mdxui and the storybook app that existed only to host
 *     the @mdxui kits are gone and stay gone; pnpm-workspace.yaml no longer globs them.
 *   - no workspace package.json depends on mdxui / @mdxui/* through the `workspace:`
 *     protocol, and the only @mdxui packages any package.json may depend on are the
 *     published ones named in NPM_ALLOWED, always with a registry range.
 *   - no source file imports mdxui or a @mdxui/* package outside NPM_ALLOWED.
 *   - the md register is witnessed at runtime: `@mdxui/text/md` resolves from the
 *     installed tree under @mdxe/hono (never from a workspace link) and renders a
 *     parsed document, so the hono `md` format really goes through npm @mdxui/text.
 *     (npm @mdxui/text is not a root dependency, so there is no tsc lane for it here.)
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(__dirname, '..', '..')

/** @mdxui packages mdx.org.ai may consume, from the registry only. */
const NPM_ALLOWED: Record<string, string> = {
  '@mdxui/text': 'md register renderer (received @mdxui/markdown) + capability resolver; used by @mdxe/hono and @mdxe/workers',
  '@mdxui/fumadocs': 'Hono JSX docs layouts re-exported by @mdxe/hono/jsx (1.9.0 on npm)',
}

const REMOVED_DIRS = ['packages/mdxui', 'packages/@mdxui', 'apps/storybook'] as const

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '.git', '.next', '.source', 'coverage', 'storybook-static'])
const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs|jsx)$/
const MDXUI_IMPORT = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]((?:@mdxui\/[a-z0-9.-]+|mdxui))(?:\/[^'"]*)?['"]/g

function walk(dir: string, pick: (entry: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, pick, out)
    else if (pick(entry)) out.push(full)
  }
  return out
}

const packageJsons = walk(ROOT, (entry) => entry === 'package.json')

describe('mdxui home (mdx-8je.8): dot-do/ui owns mdxui and @mdxui/*', () => {
  for (const dir of REMOVED_DIRS) {
    it(`${dir} no longer exists`, () => {
      expect(existsSync(join(ROOT, dir))).toBe(false)
    })
  }

  it('pnpm-workspace.yaml does not glob @mdxui packages', () => {
    const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf-8')
    expect(yaml).not.toMatch(/@mdxui/)
  })

  it('no workspace package.json declares an mdxui / @mdxui name', () => {
    const offenders = packageJsons.filter((file) => {
      const pkg = JSON.parse(readFileSync(file, 'utf-8')) as { name?: string }
      return pkg.name === 'mdxui' || pkg.name?.startsWith('@mdxui/')
    })
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([])
  })

  it('every mdxui / @mdxui dependency is an allowed npm package with a registry range', () => {
    const offenders: string[] = []
    for (const file of packageJsons) {
      const pkg = JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>
      const rel = relative(ROOT, file)
      for (const field of DEP_FIELDS) {
        const deps = pkg[field] as Record<string, string> | undefined
        if (!deps) continue
        for (const [name, range] of Object.entries(deps)) {
          if (name !== 'mdxui' && !name.startsWith('@mdxui/')) continue
          if (!(name in NPM_ALLOWED)) offenders.push(`${rel} (${field}: ${name} is not in NPM_ALLOWED)`)
          else if (/^(workspace|link|file):/.test(range)) offenders.push(`${rel} (${field}: ${name}@${range} must be a registry range)`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('no source file imports mdxui or a @mdxui package outside NPM_ALLOWED', () => {
    const offenders: string[] = []
    for (const top of ['packages', 'apps', 'scripts', 'examples', 'test']) {
      if (!existsSync(join(ROOT, top))) continue
      for (const file of walk(join(ROOT, top), (entry) => SOURCE_EXT.test(entry))) {
        const text = readFileSync(file, 'utf-8')
        for (const m of text.matchAll(MDXUI_IMPORT)) {
          if (!(m[1] in NPM_ALLOWED)) offenders.push(`${relative(ROOT, file)}: ${m[0].trim()}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('vitest.mdx.config.ts aliases nothing to a deleted @mdxui source tree', () => {
    const cfg = readFileSync(join(ROOT, 'vitest.mdx.config.ts'), 'utf-8')
    expect(cfg).not.toMatch(/packages\/(@mdxui|mdxui)\//)
  })

  it('@mdxe/hono depends on @mdxui/text from the registry and renders md through it', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages/@mdxe/hono/package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>
    }
    expect(pkg.dependencies?.['@mdxui/text']).toMatch(/^\^?\d/)
    const format = readFileSync(join(ROOT, 'packages/@mdxe/hono/src/format.ts'), 'utf-8')
    expect(format).toMatch(/from\s+['"]@mdxui\/text\/md['"]/)
  })

  it('@mdxe/workers depends on @mdxui/text from the registry and emits the .md asset through it', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages/@mdxe/workers/package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>
    }
    expect(pkg.dependencies?.['@mdxui/text']).toMatch(/^\^?\d/)
    const build = readFileSync(join(ROOT, 'packages/@mdxe/workers/src/build.ts'), 'utf-8')
    expect(build).toMatch(/from\s+['"]@mdxui\/text\/md['"]/)
  })

  it('the @mdxui/text installed under @mdxe/hono is the registry package, not a workspace link', () => {
    const link = join(ROOT, 'packages/@mdxe/hono/node_modules/@mdxui/text')
    expect(existsSync(link), '@mdxui/text is not installed under packages/@mdxe/hono (run pnpm install)').toBe(true)
    const dir = realpathSync(link)
    expect(relative(ROOT, dir).startsWith('node_modules/.pnpm/'), `@mdxui/text resolves to ${relative(ROOT, dir)}`).toBe(true)
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as { name: string; repository?: { url?: string } }
    expect(pkg.name).toBe('@mdxui/text')
    expect(pkg.repository?.url).toMatch(/dot-do\/ui/)
  })

  it('npm @mdxui/text/md renders a parsed MDXLD document to markdown (runtime witness)', async () => {
    const dir = realpathSync(join(ROOT, 'packages/@mdxe/hono/node_modules/@mdxui/text'))
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as {
      exports: Record<string, { import?: string }>
    }
    const entry = pkg.exports['./md']?.import
    expect(entry, '@mdxui/text has no ./md export').toBeDefined()
    const md = (await import(pathToFileURL(join(dir, entry as string)).href)) as {
      render: (doc: { data: Record<string, unknown>; content: string }) => string
      renderMarkdown: (doc: { data: Record<string, unknown>; content: string }) => string
    }
    expect(typeof md.render).toBe('function')
    expect(md.renderMarkdown).toBe(md.render)
    const out = md.render({ data: { title: 'Hello' }, content: '# Hello\n\n<Hero title="x" />\n\nA **bold** line.\n' })
    expect(out).toContain('title: Hello')
    expect(out).toContain('# Hello')
    expect(out).toContain('**bold**')
    expect(out).not.toContain('<Hero')
  })
})
