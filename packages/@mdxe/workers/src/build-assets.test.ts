/**
 * Static assets emitted by `build()` (mdx-8je.8): the `.md` asset is the `md` register of npm
 * @mdxui/text (JSX stripped, no frontmatter — the `.json` asset carries the data), the `.json`
 * asset is the parsed document, and the `.html` asset is the fumadocs-style page.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { render as renderMd } from '@mdxui/text/md'
import { parse } from 'mdxld'
import { build } from './build.js'
import type { NamespaceBundle } from './types.js'

const source = `---
$type: BlogPost
title: Hello
---

# Hello

<Hero title="x" />

A **bold** line.

- one
- two
`

describe('build() static assets (mdx-8je.8)', () => {
  let projectDir: string
  let bundle: NamespaceBundle

  beforeAll(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'mdxe-workers-assets-'))
    mkdirSync(projectDir, { recursive: true })
    writeFileSync(join(projectDir, 'index.mdx'), source)
    const result = await build({ projectDir, minify: false })
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
    bundle = result.bundle as NamespaceBundle
  }, 60_000)

  afterAll(() => {
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('emits /index.md through @mdxui/text/md with JSX stripped and no frontmatter', () => {
    const asset = bundle.assets?.files['/index.md']
    expect(asset).toBeDefined()
    expect(asset?.contentType).toBe('text/markdown')
    expect(asset?.content).toBe(renderMd(parse(source), { includeFrontmatter: false }))
    expect(asset?.content).toContain('# Hello')
    expect(asset?.content).toContain('**bold**')
    expect(asset?.content).toContain('- one')
    expect(asset?.content).not.toContain('<Hero')
    expect(asset?.content).not.toContain('title: Hello')
    expect(asset?.size).toBe(asset?.content.length)
  })

  it('emits /index.json as the content-bundle document (data + raw content)', () => {
    const asset = bundle.assets?.files['/index.json']
    expect(asset).toBeDefined()
    expect(asset?.contentType).toBe('application/json')
    const doc = JSON.parse(asset?.content ?? '{}') as { path: string; data: Record<string, unknown>; content: string }
    expect(doc.path).toBe('/index')
    expect(doc.data.title).toBe('Hello')
    expect(doc.content).toContain('<Hero')
  })

  it('emits /index.html as a page', () => {
    const asset = bundle.assets?.files['/index.html']
    expect(asset).toBeDefined()
    expect(asset?.contentType).toBe('text/html')
    expect(asset?.content).toContain('<!DOCTYPE html>')
    expect(asset?.content).toContain('Hello')
  })
})
