/**
 * Tests for docs type detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectDocsType, isValidDocsProject } from './detect.js'

describe('detectDocsType', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `fumadocs-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('with index.mdx', () => {
    it('detects $type: Docs in frontmatter', () => {
      const content = `---
$type: Docs
title: My Documentation
description: A test docs site
---

# Welcome
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
      expect(result.indexPath).toBe(join(testDir, 'index.mdx'))
      expect(result.config.title).toBe('My Documentation')
      expect(result.config.description).toBe('A test docs site')
    })

    it('detects full URL type', () => {
      const content = `---
$type: https://mdx.org.ai/Docs
title: URL Type Test
---

# Test
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
      expect(result.config.title).toBe('URL Type Test')
    })

    it('detects Documentation type', () => {
      const content = `---
$type: Documentation
title: Alt Type Test
---

# Test
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
    })

    it('extracts domain, route, and zone config', () => {
      const content = `---
$type: Docs
title: beads-workflows
domain: beads.workflows.do
route: beads.workflows.do/*
zone: workflows.do
github: https://github.com/dot-do/beads-workflows
---

# Content
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
      expect(result.config.domain).toBe('beads.workflows.do')
      expect(result.config.route).toBe('beads.workflows.do/*')
      expect(result.config.zone).toBe('workflows.do')
      expect(result.config.githubUrl).toBe('https://github.com/dot-do/beads-workflows')
    })

    it('extracts baseUrl config', () => {
      const content = `---
$type: Docs
title: Test
baseUrl: /docs
---

# Content
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.config.baseUrl).toBe('/docs')
    })

    it('returns false for non-Docs type', () => {
      const content = `---
$type: Article
title: Not a docs site
---

# Just an article
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(false)
    })

    it('returns false for missing type', () => {
      const content = `---
title: No type specified
---

# Content
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(false)
    })
  })

  describe('with index.md', () => {
    it('detects $type: Docs in .md file', () => {
      const content = `---
$type: Docs
title: Markdown Test
---

# Welcome
`
      writeFileSync(join(testDir, 'index.md'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
      expect(result.indexPath).toBe(join(testDir, 'index.md'))
    })
  })

  describe('with README.mdx', () => {
    it('detects $type: Docs in README', () => {
      const content = `---
$type: Docs
title: README Docs
---

# README as docs
`
      writeFileSync(join(testDir, 'README.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
      expect(result.readmePath).toBe(join(testDir, 'README.mdx'))
    })

    it('prefers index.mdx config over README.mdx', () => {
      const indexContent = `---
$type: Docs
title: Index Title
---

# Index
`
      const readmeContent = `---
$type: Docs
title: README Title
---

# README
`
      writeFileSync(join(testDir, 'index.mdx'), indexContent)
      writeFileSync(join(testDir, 'README.mdx'), readmeContent)

      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(true)
      expect(result.config.title).toBe('Index Title')
    })
  })

  describe('with no MDX files', () => {
    it('returns false when no MDX files exist', () => {
      const result = detectDocsType(testDir)

      expect(result.isDocsType).toBe(false)
      expect(result.indexPath).toBeNull()
      expect(result.readmePath).toBeNull()
    })
  })

  describe('project name', () => {
    it('uses config title for project name when available', () => {
      const content = `---
$type: Docs
title: Custom Project Name
---

# Content
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.projectName).toBe('Custom Project Name')
    })

    it('falls back to directory name when no title', () => {
      const content = `---
$type: Docs
---

# Content
`
      writeFileSync(join(testDir, 'index.mdx'), content)

      const result = detectDocsType(testDir)

      expect(result.projectName).toContain('fumadocs-test-')
    })
  })
})

describe('isValidDocsProject', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `fumadocs-valid-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('returns true for valid docs project', () => {
    const content = `---
$type: Docs
title: Valid Project
---

# Content
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    const valid = isValidDocsProject(detection)

    expect(valid).toBe(true)
  })

  it('returns false when not docs type', () => {
    const content = `---
title: Not Docs
---

# Content
`
    writeFileSync(join(testDir, 'index.mdx'), content)

    const detection = detectDocsType(testDir)
    const valid = isValidDocsProject(detection)

    expect(valid).toBe(false)
  })

  it('returns false when no files exist', () => {
    const detection = detectDocsType(testDir)
    const valid = isValidDocsProject(detection)

    expect(valid).toBe(false)
  })
})
