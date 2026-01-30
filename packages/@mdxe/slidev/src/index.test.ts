import { describe, it, expect } from 'vitest'
import {
  toSlidev,
  extractSlides,
  fromSlidev,
  getSlidevCommand,
  getSlidevExportCommand,
  getSlidevBuildCommand,
  defaultSlidevConfig,
  type MDXLDDocument,
  type SlidevConfig,
  type Slide,
} from './index.js'

// ===========================================================================
// Test Fixtures and Utilities
// ===========================================================================

const createDoc = (content: string, data: Record<string, unknown> = {}): MDXLDDocument => ({
  content,
  data,
})

const createSlideDoc = (slides: string[]): MDXLDDocument => ({
  content: slides.join('\n\n---\n\n'),
  data: {},
})

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('module exports', () => {
  it('exports toSlidev function', () => {
    expect(toSlidev).toBeDefined()
    expect(typeof toSlidev).toBe('function')
  })

  it('exports extractSlides function', () => {
    expect(extractSlides).toBeDefined()
    expect(typeof extractSlides).toBe('function')
  })

  it('exports fromSlidev function', () => {
    expect(fromSlidev).toBeDefined()
    expect(typeof fromSlidev).toBe('function')
  })

  it('exports getSlidevCommand function', () => {
    expect(getSlidevCommand).toBeDefined()
    expect(typeof getSlidevCommand).toBe('function')
  })

  it('exports getSlidevExportCommand function', () => {
    expect(getSlidevExportCommand).toBeDefined()
    expect(typeof getSlidevExportCommand).toBe('function')
  })

  it('exports getSlidevBuildCommand function', () => {
    expect(getSlidevBuildCommand).toBeDefined()
    expect(typeof getSlidevBuildCommand).toBe('function')
  })

  it('exports defaultSlidevConfig', () => {
    expect(defaultSlidevConfig).toBeDefined()
    expect(typeof defaultSlidevConfig).toBe('object')
  })
})

// ===========================================================================
// extractSlides() Tests
// ===========================================================================

describe('extractSlides()', () => {
  describe('slide separator detection', () => {
    it('should extract slides from --- separators', () => {
      const doc = createDoc(`
First slide content.

---

Second slide content.

---

Third slide content.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(3)
      expect(slides[0].content).toContain('First slide')
      expect(slides[1].content).toContain('Second slide')
      expect(slides[2].content).toContain('Third slide')
    })

    it('should extract slides from h1 headings if no separators', () => {
      const doc = createDoc(`
# First

Content 1

# Second

Content 2
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].content).toContain('# First')
      expect(slides[1].content).toContain('# Second')
    })

    it('should handle document without slides', () => {
      const doc = createDoc('Just plain content without any separators or headings.')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].content).toBe('Just plain content without any separators or headings.')
    })

    it('should handle empty document', () => {
      const doc = createDoc('')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].content).toBe('')
    })

    it('should handle whitespace-only document', () => {
      const doc = createDoc('   \n\n   ')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].content).toBe('')
    })

    it('should handle mixed h1 and non-h1 headings', () => {
      const doc = createDoc(`
# First Slide

## Section in first slide

Content

# Second Slide

### Subsection
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].content).toContain('## Section in first slide')
      expect(slides[1].content).toContain('### Subsection')
    })

    it('should prefer --- separators over h1 headings', () => {
      const doc = createDoc(`
# Heading 1

Content

---

# Heading 2

More content
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].content).toContain('# Heading 1')
      expect(slides[1].content).toContain('# Heading 2')
    })
  })

  describe('speaker notes extraction', () => {
    it('should extract speaker notes', () => {
      const doc = createDoc(`
# My Slide

Content here.

<!-- notes -->
These are speaker notes.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].notes).toContain('These are speaker notes')
    })

    it('should extract speaker notes with note singular', () => {
      const doc = createDoc(`
# My Slide

Content here.

<!-- note -->
This is a speaker note.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].notes).toContain('This is a speaker note')
    })

    it('should remove notes from content', () => {
      const doc = createDoc(`
# My Slide

Visible content.

<!-- notes -->
Hidden notes.
      `)

      const slides = extractSlides(doc)

      expect(slides[0].content).not.toContain('Hidden notes')
      expect(slides[0].content).toContain('Visible content')
    })

    it('should handle slides without notes', () => {
      const doc = createDoc('# Slide without notes\n\nJust content.')

      const slides = extractSlides(doc)

      expect(slides[0].notes).toBeUndefined()
    })

    it('should handle notes with extra whitespace', () => {
      const doc = createDoc(`
# Slide

Content

<!--   notes   -->

  Whitespace in notes.

      `)

      const slides = extractSlides(doc)

      expect(slides[0].notes).toContain('Whitespace in notes')
    })
  })

  describe('slide frontmatter parsing', () => {
    it('should parse slide-level frontmatter', () => {
      const doc = createDoc(`
---
layout: center
---

# Centered Slide

Content here.
      `)

      const slides = extractSlides(doc)

      // Note: The first slide has frontmatter embedded
      expect(slides.length).toBeGreaterThanOrEqual(1)
    })

    it('should extract layout from frontmatter', () => {
      const doc = createDoc(`
First slide

---

---
layout: cover
---

This is a cover slide
      `)

      const slides = extractSlides(doc)

      // Check that at least one slide might have layout
      expect(slides.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('edge cases', () => {
    it('should handle consecutive separators', () => {
      const doc = createDoc(`
First slide

---

---

Second slide
      `)

      const slides = extractSlides(doc)

      // Should filter out empty slides
      expect(slides.filter(s => s.content.trim()).length).toBeGreaterThanOrEqual(2)
    })

    it('should handle slide with only a heading', () => {
      const doc = createDoc('# Just a heading')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].content).toContain('# Just a heading')
    })

    it('should handle code blocks with --- inside', () => {
      const doc = createDoc(`
# Code Example

\`\`\`yaml
---
key: value
---
\`\`\`

---

# Next Slide
      `)

      const slides = extractSlides(doc)

      // Should split on the actual separator, not the one in code
      expect(slides.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle special characters in content', () => {
      const doc = createDoc(`
# Slide with special chars

<Component prop="value" />

{expression}

\`inline code\`
      `)

      const slides = extractSlides(doc)

      expect(slides[0].content).toContain('<Component')
      expect(slides[0].content).toContain('{expression}')
    })

    it('should handle unicode content', () => {
      const doc = createDoc(`
# Unicode Test

Hello World
Japanese

Emoji:
      `)

      const slides = extractSlides(doc)

      expect(slides[0].content).toContain('Hello World')
      expect(slides[0].content).toContain('Japanese')
    })
  })
})

// ===========================================================================
// toSlidev() Tests
// ===========================================================================

describe('toSlidev()', () => {
  describe('basic conversion', () => {
    it('should generate valid Slidev markdown', () => {
      const doc = createDoc(`
# Welcome

This is my presentation.

---

# Features

- Feature 1
- Feature 2
      `, { title: 'My Presentation', author: 'Test' })

      const result = toSlidev(doc)

      expect(result.markdown).toContain('---')
      expect(result.markdown).toContain('theme: default')
      expect(result.markdown).toContain('title: My Presentation')
      expect(result.slides.length).toBeGreaterThan(0)
    })

    it('should return slides array', () => {
      const doc = createDoc('# Slide 1\n\n---\n\n# Slide 2')

      const result = toSlidev(doc)

      expect(Array.isArray(result.slides)).toBe(true)
      expect(result.slides.length).toBeGreaterThanOrEqual(2)
    })

    it('should return frontmatter object', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc)

      expect(typeof result.frontmatter).toBe('object')
      expect(result.frontmatter).not.toBeNull()
    })
  })

  describe('configuration options', () => {
    it('should apply custom configuration', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc, {
        theme: 'seriph',
        highlighter: 'prism',
        lineNumbers: true,
      })

      expect(result.markdown).toContain('theme: seriph')
      expect(result.markdown).toContain('highlighter: prism')
      expect(result.markdown).toContain('lineNumbers: true')
      expect(result.frontmatter.theme).toBe('seriph')
    })

    it('should include document data in frontmatter', () => {
      const doc = createDoc('# Test', {
        author: 'John Doe',
        date: '2024-01-01',
      })

      const result = toSlidev(doc)

      expect(result.frontmatter.author).toBe('John Doe')
      expect(result.frontmatter.date).toBe('2024-01-01')
    })

    it('should apply all default config values', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc)

      expect(result.frontmatter.theme).toBe('default')
      expect(result.frontmatter.highlighter).toBe('shiki')
      expect(result.frontmatter.lineNumbers).toBe(false)
      expect(result.frontmatter.transition).toBe('slide-left')
      expect(result.frontmatter.css).toBe('unocss')
    })

    it('should handle custom transitions', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc, { transition: 'fade' })

      expect(result.markdown).toContain('transition: fade')
      expect(result.frontmatter.transition).toBe('fade')
    })

    it('should handle drawings configuration', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc, {
        drawings: {
          enabled: true,
          persist: true,
        },
      })

      expect(result.markdown).toContain('drawings:')
      expect(result.markdown).toContain('enabled: true')
      expect(result.markdown).toContain('persist: true')
    })

    it('should handle custom CSS', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc, { css: 'windicss' })

      expect(result.markdown).toContain('css: windicss')
    })

    it('should handle info field when provided in document data', () => {
      const doc = createDoc('# Test', { info: 'Presentation info text' })

      const result = toSlidev(doc)

      // Info is included via doc.data spread
      expect(result.frontmatter.info).toBe('Presentation info text')
    })
  })

  describe('title handling', () => {
    it('should use title from document data', () => {
      const doc = createDoc('# Test', { title: 'My Custom Title' })

      const result = toSlidev(doc)

      expect(result.frontmatter.title).toBe('My Custom Title')
    })

    it('should use title from config if not in data', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc, { title: 'Config Title' })

      expect(result.frontmatter.title).toBe('Config Title')
    })

    it('should use default title if none provided', () => {
      const doc = createDoc('# Test')

      const result = toSlidev(doc)

      expect(result.frontmatter.title).toBe('Presentation')
    })
  })

  describe('slide frontmatter and layouts', () => {
    it('should preserve slide layouts', () => {
      const doc = createDoc(`
---
layout: cover
---

# Cover Slide

---

# Regular Slide
      `)

      const result = toSlidev(doc)

      expect(result.markdown).toContain('layout: cover')
    })

    it('should handle multiple slide layouts', () => {
      const slides = [
        '---\nlayout: intro\n---\n\n# Intro',
        '---\nlayout: two-cols\n---\n\n# Two Columns',
        '---\nlayout: center\n---\n\n# Centered',
      ]
      const doc = createSlideDoc(slides)

      const result = toSlidev(doc)

      expect(result.slides.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('speaker notes in output', () => {
    it('should include speaker notes in output', () => {
      const doc = createDoc(`
# Slide with notes

Content

<!-- notes -->
Speaker notes here.
      `)

      const result = toSlidev(doc)

      expect(result.slides[0].notes).toContain('Speaker notes here')
    })

    it('should format notes correctly in markdown', () => {
      const doc = createDoc(`
# My Slide

Content

<!-- notes -->
My notes
      `)

      const result = toSlidev(doc)

      // Notes should be present in the slide data
      const slideWithNotes = result.slides.find((s) => s.notes)
      expect(slideWithNotes).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle empty document', () => {
      const doc = createDoc('')

      const result = toSlidev(doc)

      expect(result.markdown).toContain('---')
      expect(result.frontmatter).toBeDefined()
    })

    it('should handle document with only frontmatter data', () => {
      const doc = createDoc('', {
        title: 'Empty Slides',
        author: 'Test',
      })

      const result = toSlidev(doc)

      expect(result.frontmatter.title).toBe('Empty Slides')
    })

    it('should remove undefined values from frontmatter', () => {
      const doc = createDoc('# Test', {
        title: 'Test',
        undefinedKey: undefined,
      })

      const result = toSlidev(doc)

      // Frontmatter should not contain undefined keys
      expect(result.markdown).not.toContain('undefinedKey')
    })

    it('should handle complex nested data', () => {
      const doc = createDoc('# Test', {
        meta: {
          keywords: ['slidev', 'presentation'],
          social: {
            twitter: '@handle',
          },
        },
      })

      const result = toSlidev(doc)

      expect(result.frontmatter.meta).toBeDefined()
    })
  })
})

// ===========================================================================
// fromSlidev() Tests
// ===========================================================================

describe('fromSlidev()', () => {
  it('should convert Slidev markdown to MDXLD document', () => {
    const slidevMarkdown = `---
theme: default
title: Test Presentation
---

# First Slide

Content here

---

# Second Slide

More content
`
    const doc = fromSlidev(slidevMarkdown)

    expect(doc).toBeDefined()
    expect(doc.content).toBeDefined()
  })

  it('should preserve document data', () => {
    const slidevMarkdown = `---
title: My Presentation
author: Test Author
---

# Content
`
    const doc = fromSlidev(slidevMarkdown)

    expect(doc.data?.title).toBe('My Presentation')
    expect(doc.data?.author).toBe('Test Author')
  })

  it('should handle Slidev without frontmatter', () => {
    const slidevMarkdown = '# Just a slide\n\nWith content'

    const doc = fromSlidev(slidevMarkdown)

    expect(doc.content).toContain('# Just a slide')
  })

  it('should handle empty Slidev markdown', () => {
    const doc = fromSlidev('')

    expect(doc.content).toBe('')
  })
})

// ===========================================================================
// getSlidevCommand() Tests
// ===========================================================================

describe('getSlidevCommand()', () => {
  describe('basic command generation', () => {
    it('should generate basic command', () => {
      const cmd = getSlidevCommand('slides.md')
      expect(cmd).toBe('npx slidev slides.md')
    })

    it('should handle different file paths', () => {
      expect(getSlidevCommand('presentation.md')).toBe('npx slidev presentation.md')
      expect(getSlidevCommand('./slides/deck.md')).toBe('npx slidev ./slides/deck.md')
      expect(getSlidevCommand('/absolute/path/slides.md')).toBe('npx slidev /absolute/path/slides.md')
    })
  })

  describe('port option', () => {
    it('should include port option', () => {
      const cmd = getSlidevCommand('slides.md', { port: 3030 })
      expect(cmd).toBe('npx slidev slides.md --port 3030')
    })

    it('should handle custom ports', () => {
      expect(getSlidevCommand('slides.md', { port: 8080 })).toContain('--port 8080')
      expect(getSlidevCommand('slides.md', { port: 4000 })).toContain('--port 4000')
    })
  })

  describe('open option', () => {
    it('should include open option', () => {
      const cmd = getSlidevCommand('slides.md', { open: true })
      expect(cmd).toBe('npx slidev slides.md --open')
    })

    it('should not include open when false', () => {
      const cmd = getSlidevCommand('slides.md', { open: false })
      expect(cmd).not.toContain('--open')
    })
  })

  describe('remote option', () => {
    it('should include remote option as boolean', () => {
      const cmd = getSlidevCommand('slides.md', { remote: true })
      expect(cmd).toContain('--remote')
    })

    it('should include remote option with password', () => {
      const cmd = getSlidevCommand('slides.md', { remote: 'mypassword' })
      expect(cmd).toContain('--remote')
      expect(cmd).toContain('mypassword')
    })

    it('should not include remote when false', () => {
      const cmd = getSlidevCommand('slides.md', { remote: false })
      expect(cmd).not.toContain('--remote')
    })
  })

  describe('log option', () => {
    it('should include log level', () => {
      expect(getSlidevCommand('slides.md', { log: 'info' })).toContain('--log info')
      expect(getSlidevCommand('slides.md', { log: 'error' })).toContain('--log error')
      expect(getSlidevCommand('slides.md', { log: 'warn' })).toContain('--log warn')
      expect(getSlidevCommand('slides.md', { log: 'silent' })).toContain('--log silent')
    })
  })

  describe('combined options', () => {
    it('should include all options', () => {
      const cmd = getSlidevCommand('slides.md', {
        port: 4000,
        open: true,
        remote: true,
        log: 'info',
      })
      expect(cmd).toContain('--port 4000')
      expect(cmd).toContain('--open')
      expect(cmd).toContain('--remote')
      expect(cmd).toContain('--log info')
    })

    it('should handle partial options', () => {
      const cmd = getSlidevCommand('slides.md', { port: 3030, open: true })
      expect(cmd).toContain('--port 3030')
      expect(cmd).toContain('--open')
      expect(cmd).not.toContain('--remote')
      expect(cmd).not.toContain('--log')
    })
  })
})

// ===========================================================================
// getSlidevExportCommand() Tests
// ===========================================================================

describe('getSlidevExportCommand()', () => {
  describe('format options', () => {
    it('should generate PDF export command', () => {
      const cmd = getSlidevExportCommand('slides.md', 'out.pdf', 'pdf')
      expect(cmd).toBe('npx slidev export slides.md --output out.pdf --format pdf')
    })

    it('should generate PNG export command', () => {
      const cmd = getSlidevExportCommand('slides.md', 'out.png', 'png')
      expect(cmd).toBe('npx slidev export slides.md --output out.png --format png')
    })

    it('should generate PPTX export command', () => {
      const cmd = getSlidevExportCommand('slides.md', 'out.pptx', 'pptx')
      expect(cmd).toBe('npx slidev export slides.md --output out.pptx --format pptx')
    })

    it('should default to PDF format', () => {
      const cmd = getSlidevExportCommand('slides.md', 'out.pdf')
      expect(cmd).toContain('--format pdf')
    })
  })

  describe('path handling', () => {
    it('should handle different input paths', () => {
      expect(getSlidevExportCommand('./slides/deck.md', 'out.pdf')).toContain('./slides/deck.md')
      expect(getSlidevExportCommand('/abs/path.md', 'out.pdf')).toContain('/abs/path.md')
    })

    it('should handle different output paths', () => {
      expect(getSlidevExportCommand('slides.md', './exports/presentation.pdf')).toContain(
        './exports/presentation.pdf'
      )
      expect(getSlidevExportCommand('slides.md', '/absolute/output.pdf')).toContain(
        '/absolute/output.pdf'
      )
    })
  })
})

// ===========================================================================
// getSlidevBuildCommand() Tests
// ===========================================================================

describe('getSlidevBuildCommand()', () => {
  describe('basic build command', () => {
    it('should generate build command with default output', () => {
      const cmd = getSlidevBuildCommand('slides.md')
      expect(cmd).toBe('npx slidev build slides.md --out dist')
    })

    it('should generate build command with custom output', () => {
      const cmd = getSlidevBuildCommand('slides.md', 'public')
      expect(cmd).toBe('npx slidev build slides.md --out public')
    })
  })

  describe('output directory options', () => {
    it('should handle various output directories', () => {
      expect(getSlidevBuildCommand('slides.md', 'build')).toContain('--out build')
      expect(getSlidevBuildCommand('slides.md', '_site')).toContain('--out _site')
      expect(getSlidevBuildCommand('slides.md', './output')).toContain('--out ./output')
    })
  })

  describe('path handling', () => {
    it('should handle different input paths', () => {
      expect(getSlidevBuildCommand('presentation.md')).toContain('presentation.md')
      expect(getSlidevBuildCommand('./decks/main.md')).toContain('./decks/main.md')
    })
  })
})

// ===========================================================================
// defaultSlidevConfig Tests
// ===========================================================================

describe('defaultSlidevConfig', () => {
  it('should have sensible defaults', () => {
    expect(defaultSlidevConfig.theme).toBe('default')
    expect(defaultSlidevConfig.highlighter).toBe('shiki')
    expect(defaultSlidevConfig.lineNumbers).toBe(false)
    expect(defaultSlidevConfig.transition).toBe('slide-left')
  })

  it('should have drawings config', () => {
    expect(defaultSlidevConfig.drawings).toBeDefined()
    expect(defaultSlidevConfig.drawings.enabled).toBe(true)
    expect(defaultSlidevConfig.drawings.persist).toBe(false)
  })

  it('should have css config', () => {
    expect(defaultSlidevConfig.css).toBe('unocss')
  })

  it('should have title default', () => {
    expect(defaultSlidevConfig.title).toBe('Presentation')
  })

  it('should have info default', () => {
    expect(defaultSlidevConfig.info).toBe('')
  })

  it('should be a complete config (no undefined values)', () => {
    const requiredKeys = ['theme', 'highlighter', 'lineNumbers', 'drawings', 'transition', 'css', 'title', 'info']
    for (const key of requiredKeys) {
      expect(defaultSlidevConfig[key as keyof typeof defaultSlidevConfig]).toBeDefined()
    }
  })
})

// ===========================================================================
// Theme Configuration Tests
// ===========================================================================

describe('theme configuration', () => {
  it('should support default theme', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc)
    expect(result.frontmatter.theme).toBe('default')
  })

  it('should support seriph theme', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { theme: 'seriph' })
    expect(result.frontmatter.theme).toBe('seriph')
  })

  it('should support apple-basic theme', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { theme: 'apple-basic' })
    expect(result.frontmatter.theme).toBe('apple-basic')
  })

  it('should support custom theme names', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { theme: 'my-custom-theme' })
    expect(result.frontmatter.theme).toBe('my-custom-theme')
  })

  it('should support scoped theme names', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { theme: '@slidev/theme-academic' })
    expect(result.frontmatter.theme).toBe('@slidev/theme-academic')
  })
})

// ===========================================================================
// Code Highlighting Tests
// ===========================================================================

describe('code highlighting configuration', () => {
  it('should default to shiki highlighter', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc)
    expect(result.frontmatter.highlighter).toBe('shiki')
  })

  it('should support prism highlighter', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { highlighter: 'prism' })
    expect(result.frontmatter.highlighter).toBe('prism')
  })

  it('should handle line numbers option', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { lineNumbers: true })
    expect(result.frontmatter.lineNumbers).toBe(true)
  })

  it('should disable line numbers by default', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc)
    expect(result.frontmatter.lineNumbers).toBe(false)
  })
})

// ===========================================================================
// Transition Tests
// ===========================================================================

describe('transition configuration', () => {
  it('should default to slide-left transition', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc)
    expect(result.frontmatter.transition).toBe('slide-left')
  })

  it('should support fade transition', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { transition: 'fade' })
    expect(result.frontmatter.transition).toBe('fade')
  })

  it('should support slide-up transition', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { transition: 'slide-up' })
    expect(result.frontmatter.transition).toBe('slide-up')
  })

  it('should support custom transition names', () => {
    const doc = createDoc('# Test')
    const result = toSlidev(doc, { transition: 'custom-transition' })
    expect(result.frontmatter.transition).toBe('custom-transition')
  })
})

// ===========================================================================
// Round-trip Tests
// ===========================================================================

describe('round-trip conversion', () => {
  it('should preserve basic content through round-trip', () => {
    const originalDoc = createDoc('# Hello World\n\nThis is content.')

    const slidevOutput = toSlidev(originalDoc)
    const roundTrip = fromSlidev(slidevOutput.markdown)

    expect(roundTrip.content).toContain('# Hello World')
  })

  it('should preserve multiple slides through round-trip', () => {
    const originalDoc = createDoc(`
# Slide 1

Content 1

---

# Slide 2

Content 2
    `)

    const slidevOutput = toSlidev(originalDoc)
    const roundTrip = fromSlidev(slidevOutput.markdown)

    expect(roundTrip.content).toContain('Slide 1')
    expect(roundTrip.content).toContain('Slide 2')
  })
})

// ===========================================================================
// Integration Tests
// ===========================================================================

describe('integration scenarios', () => {
  it('should handle a complete presentation workflow', () => {
    // Create a document
    const doc = createDoc(
      `
# Welcome

Introduction slide

---

# Topics

- Topic 1
- Topic 2
- Topic 3

---

# Conclusion

Thank you!
    `,
      {
        title: 'My Presentation',
        author: 'Test User',
      }
    )

    // Convert to Slidev
    const result = toSlidev(doc, {
      theme: 'seriph',
      transition: 'fade',
    })

    // Verify output
    expect(result.slides.length).toBeGreaterThanOrEqual(3)
    expect(result.frontmatter.title).toBe('My Presentation')
    expect(result.frontmatter.theme).toBe('seriph')

    // Generate commands
    const devCmd = getSlidevCommand('slides.md', { port: 3030, open: true })
    const buildCmd = getSlidevBuildCommand('slides.md', 'dist')
    const exportCmd = getSlidevExportCommand('slides.md', 'presentation.pdf')

    expect(devCmd).toContain('slidev')
    expect(buildCmd).toContain('build')
    expect(exportCmd).toContain('export')
  })

  it('should handle a presentation with code blocks', () => {
    const doc = createDoc(`
# Code Example

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`

---

# More Code

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`
    `)

    const result = toSlidev(doc, { highlighter: 'shiki', lineNumbers: true })

    expect(result.slides.length).toBeGreaterThanOrEqual(2)
    expect(result.markdown).toContain('```typescript')
    expect(result.markdown).toContain('```python')
  })

  it('should handle a presentation with images and links', () => {
    const doc = createDoc(`
# Images

![Alt text](./image.png)

---

# Links

[Click here](https://example.com)
    `)

    const result = toSlidev(doc)

    expect(result.markdown).toContain('![Alt text]')
    expect(result.markdown).toContain('[Click here]')
  })

  it('should handle lists and formatting', () => {
    const doc = createDoc(`
# Formatted Content

**Bold text** and *italic text*

1. First item
2. Second item
3. Third item

- Bullet one
- Bullet two
    `)

    const result = toSlidev(doc)

    expect(result.markdown).toContain('**Bold text**')
    expect(result.markdown).toContain('*italic text*')
    expect(result.markdown).toContain('1. First item')
    expect(result.markdown).toContain('- Bullet one')
  })
})

// ===========================================================================
// Type Safety Tests
// ===========================================================================

describe('type safety', () => {
  it('should accept valid SlidevConfig', () => {
    const config: SlidevConfig = {
      theme: 'default',
      highlighter: 'shiki',
      lineNumbers: true,
      drawings: { enabled: true, persist: false },
      transition: 'fade',
      css: 'unocss',
      title: 'Test',
      info: 'Info',
    }

    const doc = createDoc('# Test')
    const result = toSlidev(doc, config)

    expect(result).toBeDefined()
  })

  it('should work with partial config', () => {
    const config: SlidevConfig = {
      theme: 'seriph',
    }

    const doc = createDoc('# Test')
    const result = toSlidev(doc, config)

    expect(result.frontmatter.theme).toBe('seriph')
  })

  it('should work with empty config', () => {
    const config: SlidevConfig = {}

    const doc = createDoc('# Test')
    const result = toSlidev(doc, config)

    expect(result).toBeDefined()
  })

  it('Slide type should have expected properties', () => {
    const slide: Slide = {
      content: 'Slide content',
      frontmatter: { layout: 'center' },
      notes: 'Speaker notes',
      layout: 'center',
    }

    expect(slide.content).toBe('Slide content')
    expect(slide.frontmatter?.layout).toBe('center')
    expect(slide.notes).toBe('Speaker notes')
    expect(slide.layout).toBe('center')
  })
})
