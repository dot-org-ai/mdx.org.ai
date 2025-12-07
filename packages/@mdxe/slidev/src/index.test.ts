import { describe, it, expect } from 'vitest'
import {
  toSlidev,
  extractSlides,
  getSlidevCommand,
  getSlidevExportCommand,
  getSlidevBuildCommand,
  defaultSlidevConfig,
  type MDXLDDocument,
} from './index.js'

const createDoc = (content: string, data: Record<string, unknown> = {}): MDXLDDocument => ({
  content,
  data,
})

describe('@mdxe/slidev', () => {
  describe('extractSlides', () => {
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

    it('should handle document without slides', () => {
      const doc = createDoc('Just plain content without any separators or headings.')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].content).toBe('Just plain content without any separators or headings.')
    })
  })

  describe('toSlidev', () => {
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
  })

  describe('CLI command generators', () => {
    describe('getSlidevCommand', () => {
      it('should generate basic command', () => {
        const cmd = getSlidevCommand('slides.md')
        expect(cmd).toBe('npx slidev slides.md')
      })

      it('should include port option', () => {
        const cmd = getSlidevCommand('slides.md', { port: 3030 })
        expect(cmd).toBe('npx slidev slides.md --port 3030')
      })

      it('should include open option', () => {
        const cmd = getSlidevCommand('slides.md', { open: true })
        expect(cmd).toBe('npx slidev slides.md --open')
      })

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
    })

    describe('getSlidevExportCommand', () => {
      it('should generate PDF export command', () => {
        const cmd = getSlidevExportCommand('slides.md', 'out.pdf', 'pdf')
        expect(cmd).toBe('npx slidev export slides.md --output out.pdf --format pdf')
      })

      it('should generate PNG export command', () => {
        const cmd = getSlidevExportCommand('slides.md', 'out.png', 'png')
        expect(cmd).toBe('npx slidev export slides.md --output out.png --format png')
      })

      it('should default to PDF format', () => {
        const cmd = getSlidevExportCommand('slides.md', 'out.pdf')
        expect(cmd).toContain('--format pdf')
      })
    })

    describe('getSlidevBuildCommand', () => {
      it('should generate build command with default output', () => {
        const cmd = getSlidevBuildCommand('slides.md')
        expect(cmd).toBe('npx slidev build slides.md --out dist')
      })

      it('should generate build command with custom output', () => {
        const cmd = getSlidevBuildCommand('slides.md', 'public')
        expect(cmd).toBe('npx slidev build slides.md --out public')
      })
    })
  })

  describe('defaultSlidevConfig', () => {
    it('should have sensible defaults', () => {
      expect(defaultSlidevConfig.theme).toBe('default')
      expect(defaultSlidevConfig.highlighter).toBe('shiki')
      expect(defaultSlidevConfig.lineNumbers).toBe(false)
      expect(defaultSlidevConfig.transition).toBe('slide-left')
    })
  })
})
