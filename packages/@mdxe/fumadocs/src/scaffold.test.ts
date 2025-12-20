/**
 * Tests for fumadocs scaffolding
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scaffoldFumadocs, getFumadocsOutputDir, needsScaffolding } from './scaffold.js'
import { detectDocsType } from './detect.js'

describe('scaffoldFumadocs', () => {
  let testDir: string
  let outputDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `fumadocs-scaffold-test-${Date.now()}`)
    outputDir = join(testDir, 'output')
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('scaffolds all required files', async () => {
    const content = `---
$type: Docs
title: Test Documentation
description: Test description
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    const result = await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    expect(result.success).toBe(true)
    expect(result.errors).toHaveLength(0)

    // Check required files exist
    expect(existsSync(join(outputDir, 'next.config.mjs'))).toBe(true)
    expect(existsSync(join(outputDir, 'source.config.ts'))).toBe(true)
    expect(existsSync(join(outputDir, 'tsconfig.json'))).toBe(true)
    expect(existsSync(join(outputDir, 'postcss.config.mjs'))).toBe(true)
    expect(existsSync(join(outputDir, 'open-next.config.ts'))).toBe(true)
    expect(existsSync(join(outputDir, 'wrangler.jsonc'))).toBe(true)
    expect(existsSync(join(outputDir, 'package.json'))).toBe(true)
    expect(existsSync(join(outputDir, 'lib', 'source.ts'))).toBe(true)
    expect(existsSync(join(outputDir, 'app', 'layout.tsx'))).toBe(true)
    expect(existsSync(join(outputDir, 'app', 'global.css'))).toBe(true)
    expect(existsSync(join(outputDir, 'app', 'not-found.tsx'))).toBe(true)
    expect(existsSync(join(outputDir, 'app', '(docs)', 'layout.tsx'))).toBe(true)
    expect(existsSync(join(outputDir, 'app', '(docs)', '[[...slug]]', 'page.tsx'))).toBe(true)
  })

  it('includes title in generated files', async () => {
    const content = `---
$type: Docs
title: My Custom Docs
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    const layoutContent = readFileSync(join(outputDir, 'app', 'layout.tsx'), 'utf-8')
    expect(layoutContent).toContain('My Custom Docs')

    const packageJson = JSON.parse(readFileSync(join(outputDir, 'package.json'), 'utf-8'))
    expect(packageJson.name).toContain('my-custom-docs')
  })

  it('includes domain/route/zone in wrangler config', async () => {
    const content = `---
$type: Docs
title: beads-workflows
domain: beads.workflows.do
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    const wranglerContent = readFileSync(join(outputDir, 'wrangler.jsonc'), 'utf-8')
    expect(wranglerContent).toContain('beads.workflows.do/*')
    expect(wranglerContent).toContain('workflows.do')
  })

  it('includes github url in docs layout', async () => {
    const content = `---
$type: Docs
title: Test
github: https://github.com/test/repo
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    const docsLayoutContent = readFileSync(join(outputDir, 'app', '(docs)', 'layout.tsx'), 'utf-8')
    expect(docsLayoutContent).toContain('https://github.com/test/repo')
  })

  it('reports created files count', async () => {
    const content = `---
$type: Docs
title: Test
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    const result = await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    expect(result.created.length).toBeGreaterThan(0)
    expect(result.created).toContain('next.config.mjs')
    expect(result.created).toContain('package.json')
  })

  it('skips existing files without force', async () => {
    const content = `---
$type: Docs
title: Test
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)

    // First scaffold
    await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    // Second scaffold without force
    const result = await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
      force: false,
    })

    expect(result.skipped.length).toBeGreaterThan(0)
    expect(result.created.length).toBe(0)
  })

  it('regenerates files with force option', async () => {
    const content = `---
$type: Docs
title: Test
---

# Welcome
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)

    // First scaffold
    await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
    })

    // Second scaffold with force
    const result = await scaffoldFumadocs({
      projectDir: testDir,
      outputDir,
      detection,
      force: true,
    })

    expect(result.created.length).toBeGreaterThan(0)
    expect(result.skipped.length).toBe(0)
  })
})

describe('getFumadocsOutputDir', () => {
  it('returns correct output directory', () => {
    const projectDir = '/some/project'
    const outputDir = getFumadocsOutputDir(projectDir)

    expect(outputDir).toBe('/some/project/node_modules/mdxe/.fumadocs')
  })
})

describe('needsScaffolding', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `fumadocs-needs-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('returns true when output dir does not exist', () => {
    expect(needsScaffolding(testDir)).toBe(true)
  })

  it('returns true when key files are missing', () => {
    const outputDir = getFumadocsOutputDir(testDir)
    mkdirSync(outputDir, { recursive: true })

    // Create only some files
    writeFileSync(join(outputDir, 'package.json'), '{}')

    expect(needsScaffolding(testDir)).toBe(true)
  })

  it('returns false when all key files exist', () => {
    const outputDir = getFumadocsOutputDir(testDir)
    mkdirSync(join(outputDir, 'app'), { recursive: true })

    // Create all required files
    writeFileSync(join(outputDir, 'next.config.mjs'), '')
    writeFileSync(join(outputDir, 'package.json'), '{}')
    writeFileSync(join(outputDir, 'app', 'layout.tsx'), '')

    expect(needsScaffolding(testDir)).toBe(false)
  })
})
