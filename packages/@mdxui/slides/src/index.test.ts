import { describe, it, expect } from 'vitest'
import {
  extractSlides,
  getSlideCount,
  getSlide,
  estimateDuration,
  createPresentation,
  createRenderer,
  type MDXLDDocument,
  type Presentation,
} from './index.js'

const createDoc = (content: string, data: Record<string, unknown> = {}): MDXLDDocument => ({
  content,
  data,
})

describe('@mdxui/slides', () => {
  describe('extractSlides', () => {
    it('should extract slides from --- separators', () => {
      const doc = createDoc(`
# First Slide

Content here.

---

# Second Slide

More content.

---

# Third Slide

Even more.
      `)

      const presentation = extractSlides(doc)

      expect(presentation.slides).toHaveLength(3)
      expect(presentation.slides[0].content).toContain('First Slide')
      expect(presentation.slides[1].content).toContain('Second Slide')
      expect(presentation.slides[2].content).toContain('Third Slide')
    })

    it('should extract titles from headings', () => {
      const doc = createDoc(`
# Welcome

---

## Features
      `)

      const presentation = extractSlides(doc)

      expect(presentation.slides[0].title).toBe('Welcome')
      expect(presentation.slides[1].title).toBe('Features')
    })

    it('should extract speaker notes', () => {
      const doc = createDoc(`
# Slide

Content here.

<!-- notes -->
These are speaker notes.
They can span multiple lines.
      `)

      const presentation = extractSlides(doc)

      expect(presentation.slides[0].notes).toContain('These are speaker notes')
      expect(presentation.hasSpeakerNotes).toBe(true)
    })

    it('should extract code blocks', () => {
      const doc = createDoc(`
# Code Example

\`\`\`typescript
const x = 1
\`\`\`
      `)

      const presentation = extractSlides(doc)

      expect(presentation.slides[0].codeBlocks).toHaveLength(1)
      expect(presentation.slides[0].codeBlocks?.[0].language).toBe('typescript')
      expect(presentation.slides[0].codeBlocks?.[0].code).toBe('const x = 1')
    })

    it('should extract presentation metadata from document data', () => {
      const doc = createDoc('# Hello', {
        title: 'My Presentation',
        author: 'John Doe',
        theme: 'seriph',
        aspectRatio: '4:3',
      })

      const presentation = extractSlides(doc)

      expect(presentation.title).toBe('My Presentation')
      expect(presentation.author).toBe('John Doe')
      expect(presentation.theme).toBe('seriph')
      expect(presentation.aspectRatio).toBe('4:3')
    })

    it('should parse slide-level frontmatter', () => {
      const doc = createDoc(`
---
layout: cover
transition: fade
---

# Cover Slide
      `)

      const presentation = extractSlides(doc)

      expect(presentation.slides[0].layout).toBe('cover')
      expect(presentation.slides[0].transition).toBe('fade')
    })

    it('should handle splitOnH1 option', () => {
      const doc = createDoc(`
# First Section

Content.

# Second Section

More content.
      `)

      const presentation = extractSlides(doc, { splitOnH1: true })

      expect(presentation.slides).toHaveLength(2)
      expect(presentation.slides[0].title).toBe('First Section')
      expect(presentation.slides[1].title).toBe('Second Section')
    })
  })

  describe('getSlideCount', () => {
    it('should return slide count', () => {
      const doc = createDoc(`
# One

---

# Two

---

# Three
      `)

      expect(getSlideCount(doc)).toBe(3)
    })
  })

  describe('getSlide', () => {
    it('should return slide by index', () => {
      const doc = createDoc(`
# First

---

# Second

---

# Third
      `)

      const slide = getSlide(doc, 1)

      expect(slide?.title).toBe('Second')
      expect(slide?.index).toBe(1)
    })

    it('should return undefined for out of bounds index', () => {
      const doc = createDoc('# Only One')

      expect(getSlide(doc, 5)).toBeUndefined()
    })
  })

  describe('estimateDuration', () => {
    it('should estimate duration with default minutes per slide', () => {
      expect(estimateDuration(10)).toBe(20) // 10 slides * 2 min
    })

    it('should estimate duration with custom minutes per slide', () => {
      expect(estimateDuration(10, 3)).toBe(30) // 10 slides * 3 min
    })
  })

  describe('createPresentation', () => {
    it('should create presentation from slides array', () => {
      const presentation = createPresentation(
        [
          { title: 'Intro', content: '# Hello' },
          { title: 'Main', content: '## Content' },
        ],
        { title: 'Test Deck', theme: 'dark' }
      )

      expect(presentation.title).toBe('Test Deck')
      expect(presentation.theme).toBe('dark')
      expect(presentation.slides).toHaveLength(2)
      expect(presentation.slides[0].index).toBe(0)
      expect(presentation.slides[1].index).toBe(1)
    })
  })

  describe('createRenderer', () => {
    it('should create a renderer with name and render function', () => {
      const renderer = createRenderer<string>('test', (presentation) => {
        return presentation.slides.map((s) => s.title || '').join(', ')
      })

      expect(renderer.name).toBe('test')

      const presentation: Presentation = {
        slides: [
          { index: 0, content: '', title: 'A' },
          { index: 1, content: '', title: 'B' },
        ],
      }

      expect(renderer.render(presentation)).toBe('A, B')
    })
  })
})
