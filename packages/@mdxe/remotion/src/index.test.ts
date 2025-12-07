import { describe, it, expect } from 'vitest'
import {
  extractSlides,
  calculateDuration,
  createCompositionConfig,
  defaultVideoConfig,
  type SlideContent,
  type MDXLDDocument,
} from './index.js'

const createDoc = (content: string, data: Record<string, unknown> = {}): MDXLDDocument => ({
  content,
  data,
})

describe('@mdxe/remotion', () => {
  describe('extractSlides', () => {
    it('should extract slides from h1 headings', () => {
      const doc = createDoc(`
# First Slide

Content for first slide.

# Second Slide

Content for second slide.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].title).toBe('First Slide')
      expect(slides[0].body).toContain('Content for first slide')
      expect(slides[1].title).toBe('Second Slide')
    })

    it('should extract slides from h2 headings', () => {
      const doc = createDoc(`
## Intro

Welcome!

## Main

The main content.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].title).toBe('Intro')
      expect(slides[1].title).toBe('Main')
    })

    it('should extract code blocks', () => {
      const doc = createDoc(`
# Code Example

Here is some code:

\`\`\`typescript
const x = 1
\`\`\`
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].codeBlocks).toHaveLength(1)
      expect(slides[0].codeBlocks[0].language).toBe('typescript')
      expect(slides[0].codeBlocks[0].code).toContain('const x = 1')
    })

    it('should handle document without headings', () => {
      const doc = createDoc('Just some plain content.')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].body).toBe('Just some plain content.')
      expect(slides[0].title).toBeUndefined()
    })
  })

  describe('calculateDuration', () => {
    it('should calculate duration based on slide count', () => {
      const doc = createDoc(`
# Slide 1

# Slide 2

# Slide 3
      `)

      const duration = calculateDuration(doc)

      // 3 slides * 5 seconds * 30 fps = 450 frames
      expect(duration).toBe(450)
    })

    it('should use custom config', () => {
      const doc = createDoc(`
# Slide 1

# Slide 2
      `)

      const duration = calculateDuration(doc, { fps: 60, durationPerSlide: 10 })

      // 2 slides * 10 seconds * 60 fps = 1200 frames
      expect(duration).toBe(1200)
    })
  })

  describe('createCompositionConfig', () => {
    it('should create valid composition config', () => {
      const doc = createDoc(`
# Test

Content.
      `, { title: 'My Video' })

      const config = createCompositionConfig(doc)

      expect(config.id).toBe('mdx-video')
      expect(config.fps).toBe(defaultVideoConfig.fps)
      expect(config.width).toBe(defaultVideoConfig.width)
      expect(config.height).toBe(defaultVideoConfig.height)
      expect(config.durationInFrames).toBeGreaterThan(0)
    })

    it('should use document id if available', () => {
      const doc: MDXLDDocument = {
        id: 'custom-video',
        content: '# Test',
        data: {},
      }

      const config = createCompositionConfig(doc)

      expect(config.id).toBe('custom-video')
    })
  })

  describe('defaultVideoConfig', () => {
    it('should have sensible defaults', () => {
      expect(defaultVideoConfig.fps).toBe(30)
      expect(defaultVideoConfig.width).toBe(1920)
      expect(defaultVideoConfig.height).toBe(1080)
      expect(defaultVideoConfig.durationPerSlide).toBe(5)
    })
  })
})
