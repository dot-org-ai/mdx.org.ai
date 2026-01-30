import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import {
  extractSlides,
  calculateDuration,
  createCompositionConfig,
  defaultVideoConfig,
  DefaultSlide,
  MDXComposition,
  type SlideContent,
  type SlideProps,
  type MDXLDDocument,
  type VideoConfig,
  type MDXCompositionProps,
  type CodeBlock,
} from './index.js'

// ===========================================================================
// Test Utilities
// ===========================================================================

const createDoc = (content: string, data: Record<string, unknown> = {}, id?: string): MDXLDDocument => ({
  content,
  data,
  ...(id && { id }),
})

// Mock useVideoConfig hook
vi.mock('remotion', async () => {
  const actual = await vi.importActual('remotion')
  return {
    ...actual,
    useVideoConfig: vi.fn(() => ({
      fps: 30,
      width: 1920,
      height: 1080,
      durationInFrames: 300,
    })),
    useCurrentFrame: vi.fn(() => 0),
    AbsoluteFill: ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) =>
      React.createElement('div', { 'data-testid': 'absolute-fill', style }, children),
    Sequence: ({ children, from, durationInFrames }: { children?: React.ReactNode; from: number; durationInFrames: number }) =>
      React.createElement('div', { 'data-testid': 'sequence', 'data-from': from, 'data-duration': durationInFrames }, children),
  }
})

// ===========================================================================
// Module Exports Tests
// ===========================================================================

describe('module exports', () => {
  it('exports extractSlides function', async () => {
    const mod = await import('./index.js')
    expect(mod.extractSlides).toBeDefined()
    expect(typeof mod.extractSlides).toBe('function')
  })

  it('exports calculateDuration function', async () => {
    const mod = await import('./index.js')
    expect(mod.calculateDuration).toBeDefined()
    expect(typeof mod.calculateDuration).toBe('function')
  })

  it('exports createCompositionConfig function', async () => {
    const mod = await import('./index.js')
    expect(mod.createCompositionConfig).toBeDefined()
    expect(typeof mod.createCompositionConfig).toBe('function')
  })

  it('exports defaultVideoConfig constant', async () => {
    const mod = await import('./index.js')
    expect(mod.defaultVideoConfig).toBeDefined()
    expect(typeof mod.defaultVideoConfig).toBe('object')
  })

  it('exports DefaultSlide component', async () => {
    const mod = await import('./index.js')
    expect(mod.DefaultSlide).toBeDefined()
    expect(typeof mod.DefaultSlide).toBe('function')
  })

  it('exports MDXComposition component', async () => {
    const mod = await import('./index.js')
    expect(mod.MDXComposition).toBeDefined()
    expect(typeof mod.MDXComposition).toBe('function')
  })

  it('re-exports Remotion components', async () => {
    const mod = await import('./index.js')
    expect(mod.AbsoluteFill).toBeDefined()
    expect(mod.Sequence).toBeDefined()
    expect(mod.useCurrentFrame).toBeDefined()
    expect(mod.useVideoConfig).toBeDefined()
  })

  it('re-exports mdxld utilities', async () => {
    const mod = await import('./index.js')
    expect(mod.parse).toBeDefined()
    expect(typeof mod.parse).toBe('function')
  })
})

// ===========================================================================
// extractSlides() Tests
// ===========================================================================

describe('extractSlides()', () => {
  describe('h1 heading extraction', () => {
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

    it('should handle h1 with special characters', () => {
      const doc = createDoc(`
# Hello, World!

Content.

# What's New? (v2.0)

Updates.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].title).toBe('Hello, World!')
      expect(slides[1].title).toBe("What's New? (v2.0)")
    })

    it('should handle h1 with emoji', () => {
      const doc = createDoc(`
# Introduction

Content here.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].title).toBe('Introduction')
    })
  })

  describe('h2 heading extraction', () => {
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

    it('should handle mixed h1 and h2 headings', () => {
      const doc = createDoc(`
# Main Title

Overview.

## Sub Section

Details.
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(2)
      expect(slides[0].title).toBe('Main Title')
      expect(slides[1].title).toBe('Sub Section')
    })
  })

  describe('code block extraction', () => {
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

    it('should extract multiple code blocks', () => {
      const doc = createDoc(`
# Examples

JavaScript:

\`\`\`javascript
const a = 1
\`\`\`

Python:

\`\`\`python
a = 1
\`\`\`
      `)

      const slides = extractSlides(doc)

      expect(slides[0].codeBlocks).toHaveLength(2)
      expect(slides[0].codeBlocks[0].language).toBe('javascript')
      expect(slides[0].codeBlocks[1].language).toBe('python')
    })

    it('should handle code blocks without language', () => {
      const doc = createDoc(`
# Plain Code

\`\`\`
some code
\`\`\`
      `)

      const slides = extractSlides(doc)

      expect(slides[0].codeBlocks).toHaveLength(1)
      expect(slides[0].codeBlocks[0].language).toBeUndefined()
      expect(slides[0].codeBlocks[0].code).toContain('some code')
    })

    it('should handle empty code blocks', () => {
      const doc = createDoc(`
# Empty

\`\`\`javascript
\`\`\`
      `)

      const slides = extractSlides(doc)

      expect(slides[0].codeBlocks).toHaveLength(1)
      expect(slides[0].codeBlocks[0].code).toBe('')
    })

    it('should handle code blocks with multiline content', () => {
      const doc = createDoc(`
# Function

\`\`\`typescript
function add(a: number, b: number): number {
  return a + b
}

export default add
\`\`\`
      `)

      const slides = extractSlides(doc)

      expect(slides[0].codeBlocks[0].code).toContain('function add')
      expect(slides[0].codeBlocks[0].code).toContain('export default add')
    })
  })

  describe('edge cases', () => {
    it('should handle document without headings', () => {
      const doc = createDoc('Just some plain content.')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].body).toBe('Just some plain content.')
      expect(slides[0].title).toBeUndefined()
    })

    it('should handle empty document', () => {
      const doc = createDoc('')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].body).toBe('')
    })

    it('should handle document with only whitespace', () => {
      const doc = createDoc('   \n\n   ')

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
    })

    it('should handle heading-only slides', () => {
      const doc = createDoc(`
# Title Only
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].title).toBe('Title Only')
      expect(slides[0].body).toBe('')
    })

    it('should handle many consecutive headings', () => {
      const doc = createDoc(`
# One

# Two

# Three

# Four

# Five
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(5)
      expect(slides.map((s) => s.title)).toEqual(['One', 'Two', 'Three', 'Four', 'Five'])
    })

    it('should not split on h3 or deeper headings', () => {
      const doc = createDoc(`
# Main

### Not a new slide

#### Also not a new slide
      `)

      const slides = extractSlides(doc)

      expect(slides).toHaveLength(1)
      expect(slides[0].body).toContain('### Not a new slide')
    })

    it('should preserve markdown formatting in body', () => {
      const doc = createDoc(`
# Formatting

**Bold** and *italic* and \`code\`.

- List item 1
- List item 2
      `)

      const slides = extractSlides(doc)

      expect(slides[0].body).toContain('**Bold**')
      expect(slides[0].body).toContain('*italic*')
      expect(slides[0].body).toContain('- List item 1')
    })

    it('should handle heading with no space after hash', () => {
      const doc = createDoc(`
#NoSpace

Content.
      `)

      const slides = extractSlides(doc)

      // Should not be recognized as a heading without space
      expect(slides).toHaveLength(1)
      expect(slides[0].title).toBeUndefined()
    })
  })
})

// ===========================================================================
// calculateDuration() Tests
// ===========================================================================

describe('calculateDuration()', () => {
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

  it('should handle single slide', () => {
    const doc = createDoc('# Single Slide')

    const duration = calculateDuration(doc)

    // 1 slide * 5 seconds * 30 fps = 150 frames
    expect(duration).toBe(150)
  })

  it('should handle document without headings', () => {
    const doc = createDoc('No headings here.')

    const duration = calculateDuration(doc)

    // 1 slide (entire content) * 5 seconds * 30 fps = 150 frames
    expect(duration).toBe(150)
  })

  it('should handle custom fps only', () => {
    const doc = createDoc(`
# One

# Two
    `)

    const duration = calculateDuration(doc, { fps: 24 })

    // 2 slides * 5 seconds * 24 fps = 240 frames
    expect(duration).toBe(240)
  })

  it('should handle custom durationPerSlide only', () => {
    const doc = createDoc(`
# One

# Two
    `)

    const duration = calculateDuration(doc, { durationPerSlide: 3 })

    // 2 slides * 3 seconds * 30 fps = 180 frames
    expect(duration).toBe(180)
  })

  it('should handle many slides', () => {
    const content = Array.from({ length: 20 }, (_, i) => `# Slide ${i + 1}\n\nContent ${i + 1}`).join('\n\n')
    const doc = createDoc(content)

    const duration = calculateDuration(doc)

    // 20 slides * 5 seconds * 30 fps = 3000 frames
    expect(duration).toBe(3000)
  })

  it('should handle fractional durationPerSlide', () => {
    const doc = createDoc('# One')

    const duration = calculateDuration(doc, { durationPerSlide: 2.5 })

    // 1 slide * 2.5 seconds * 30 fps = 75 frames
    expect(duration).toBe(75)
  })
})

// ===========================================================================
// createCompositionConfig() Tests
// ===========================================================================

describe('createCompositionConfig()', () => {
  it('should create valid composition config', () => {
    const doc = createDoc(
      `
# Test

Content.
    `,
      { title: 'My Video' }
    )

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

  it('should fallback to mdx-video when no id', () => {
    const doc = createDoc('# Test')

    const config = createCompositionConfig(doc)

    expect(config.id).toBe('mdx-video')
  })

  it('should use custom video config', () => {
    const doc = createDoc('# Test')

    const config = createCompositionConfig(doc, {
      fps: 60,
      width: 3840,
      height: 2160,
      durationPerSlide: 10,
    })

    expect(config.fps).toBe(60)
    expect(config.width).toBe(3840)
    expect(config.height).toBe(2160)
    // 1 slide * 10 seconds * 60 fps = 600 frames
    expect(config.durationInFrames).toBe(600)
  })

  it('should calculate correct duration for multiple slides', () => {
    const doc = createDoc(`
# One

# Two

# Three
    `)

    const config = createCompositionConfig(doc)

    // 3 slides * 5 seconds * 30 fps = 450 frames
    expect(config.durationInFrames).toBe(450)
  })

  it('should handle partial video config override', () => {
    const doc = createDoc('# Test')

    const config = createCompositionConfig(doc, { fps: 24 })

    expect(config.fps).toBe(24)
    expect(config.width).toBe(defaultVideoConfig.width)
    expect(config.height).toBe(defaultVideoConfig.height)
  })
})

// ===========================================================================
// defaultVideoConfig Tests
// ===========================================================================

describe('defaultVideoConfig', () => {
  it('should have sensible defaults', () => {
    expect(defaultVideoConfig.fps).toBe(30)
    expect(defaultVideoConfig.width).toBe(1920)
    expect(defaultVideoConfig.height).toBe(1080)
    expect(defaultVideoConfig.durationPerSlide).toBe(5)
  })

  it('should have all required properties', () => {
    expect(defaultVideoConfig).toHaveProperty('fps')
    expect(defaultVideoConfig).toHaveProperty('width')
    expect(defaultVideoConfig).toHaveProperty('height')
    expect(defaultVideoConfig).toHaveProperty('durationPerSlide')
  })

  it('should be a complete Required<VideoConfig>', () => {
    const config: Required<VideoConfig> = defaultVideoConfig
    expect(config.fps).toBeGreaterThan(0)
    expect(config.width).toBeGreaterThan(0)
    expect(config.height).toBeGreaterThan(0)
    expect(config.durationPerSlide).toBeGreaterThan(0)
  })
})

// ===========================================================================
// DefaultSlide Component Tests
// ===========================================================================

describe('DefaultSlide component', () => {
  it('should render with title and body', () => {
    const props: SlideProps = {
      content: {
        title: 'Test Title',
        body: 'Test body content',
        codeBlocks: [],
      },
      frame: 30,
      totalFrames: 150,
      index: 0,
    }

    const element = DefaultSlide(props)

    expect(element).toBeDefined()
    expect(element.type).toBeDefined()
  })

  it('should render without title', () => {
    const props: SlideProps = {
      content: {
        body: 'Just body content',
        codeBlocks: [],
      },
      frame: 0,
      totalFrames: 150,
      index: 0,
    }

    const element = DefaultSlide(props)

    expect(element).toBeDefined()
  })

  it('should render with code blocks', () => {
    const props: SlideProps = {
      content: {
        title: 'Code Example',
        body: 'Some text',
        codeBlocks: [{ language: 'typescript', code: 'const x = 1' }],
      },
      frame: 30,
      totalFrames: 150,
      index: 0,
    }

    const element = DefaultSlide(props)

    expect(element).toBeDefined()
  })

  it('should handle empty content', () => {
    const props: SlideProps = {
      content: {
        body: '',
        codeBlocks: [],
      },
      frame: 0,
      totalFrames: 150,
      index: 0,
    }

    const element = DefaultSlide(props)

    expect(element).toBeDefined()
  })

  it('should calculate opacity based on frame', () => {
    // Frame 0: opacity should be 0/15 = 0
    const propsFrame0: SlideProps = {
      content: { body: 'Content', codeBlocks: [] },
      frame: 0,
      totalFrames: 150,
      index: 0,
    }

    // Frame 15+: opacity should be 1
    const propsFrame30: SlideProps = {
      content: { body: 'Content', codeBlocks: [] },
      frame: 30,
      totalFrames: 150,
      index: 0,
    }

    const element0 = DefaultSlide(propsFrame0)
    const element30 = DefaultSlide(propsFrame30)

    expect(element0).toBeDefined()
    expect(element30).toBeDefined()
  })

  it('should handle multiple code blocks (only shows first)', () => {
    const props: SlideProps = {
      content: {
        title: 'Multiple Code',
        body: 'Text',
        codeBlocks: [
          { language: 'js', code: 'const a = 1' },
          { language: 'py', code: 'a = 1' },
        ],
      },
      frame: 30,
      totalFrames: 150,
      index: 0,
    }

    const element = DefaultSlide(props)

    expect(element).toBeDefined()
  })

  it('should strip code blocks from body text', () => {
    const props: SlideProps = {
      content: {
        title: 'Test',
        body: 'Before\n```js\ncode\n```\nAfter',
        codeBlocks: [{ language: 'js', code: 'code' }],
      },
      frame: 30,
      totalFrames: 150,
      index: 0,
    }

    const element = DefaultSlide(props)

    expect(element).toBeDefined()
  })
})

// ===========================================================================
// MDXComposition Component Tests
// ===========================================================================

describe('MDXComposition component', () => {
  it('should render with document', () => {
    const doc = createDoc('# Test\n\nContent')
    const props: MDXCompositionProps = { doc }

    const element = MDXComposition(props)

    expect(element).toBeDefined()
  })

  it('should render with custom config', () => {
    const doc = createDoc('# Test')
    const props: MDXCompositionProps = {
      doc,
      config: { fps: 60, durationPerSlide: 3 },
    }

    const element = MDXComposition(props)

    expect(element).toBeDefined()
  })

  it('should render with custom SlideComponent', () => {
    const CustomSlide = (props: SlideProps) =>
      React.createElement('div', { className: 'custom-slide' }, props.content.title)

    const doc = createDoc('# Custom')
    const props: MDXCompositionProps = {
      doc,
      SlideComponent: CustomSlide,
    }

    const element = MDXComposition(props)

    expect(element).toBeDefined()
  })

  it('should render multiple slides', () => {
    const doc = createDoc(`
# Slide One

Content one.

# Slide Two

Content two.

# Slide Three

Content three.
    `)
    const props: MDXCompositionProps = { doc }

    const element = MDXComposition(props)

    expect(element).toBeDefined()
  })

  it('should handle document with no headings', () => {
    const doc = createDoc('Plain content without headings.')
    const props: MDXCompositionProps = { doc }

    const element = MDXComposition(props)

    expect(element).toBeDefined()
  })

  it('should use default config when none provided', () => {
    const doc = createDoc('# Test')
    const props: MDXCompositionProps = { doc }

    const element = MDXComposition(props)

    expect(element).toBeDefined()
  })
})

// ===========================================================================
// VideoConfig Type Tests
// ===========================================================================

describe('VideoConfig type', () => {
  it('should accept partial config', () => {
    const partial: VideoConfig = { fps: 60 }
    expect(partial.fps).toBe(60)
    expect(partial.width).toBeUndefined()
  })

  it('should accept complete config', () => {
    const complete: VideoConfig = {
      fps: 60,
      width: 3840,
      height: 2160,
      durationPerSlide: 10,
    }
    expect(complete.fps).toBe(60)
    expect(complete.width).toBe(3840)
    expect(complete.height).toBe(2160)
    expect(complete.durationPerSlide).toBe(10)
  })

  it('should accept empty config', () => {
    const empty: VideoConfig = {}
    expect(empty.fps).toBeUndefined()
  })
})

// ===========================================================================
// SlideContent Type Tests
// ===========================================================================

describe('SlideContent type', () => {
  it('should have required body property', () => {
    const slide: SlideContent = {
      body: 'Content',
      codeBlocks: [],
    }
    expect(slide.body).toBe('Content')
  })

  it('should have optional title', () => {
    const withTitle: SlideContent = {
      title: 'Title',
      body: 'Content',
      codeBlocks: [],
    }
    expect(withTitle.title).toBe('Title')

    const withoutTitle: SlideContent = {
      body: 'Content',
      codeBlocks: [],
    }
    expect(withoutTitle.title).toBeUndefined()
  })

  it('should have codeBlocks array', () => {
    const slide: SlideContent = {
      body: 'Content',
      codeBlocks: [
        { language: 'ts', code: 'const x = 1' },
        { code: 'no lang' },
      ],
    }
    expect(slide.codeBlocks).toHaveLength(2)
    expect(slide.codeBlocks[0].language).toBe('ts')
    expect(slide.codeBlocks[1].language).toBeUndefined()
  })
})

// ===========================================================================
// CodeBlock Type Tests
// ===========================================================================

describe('CodeBlock type', () => {
  it('should have required code property', () => {
    const block: CodeBlock = { code: 'const x = 1' }
    expect(block.code).toBe('const x = 1')
  })

  it('should have optional language property', () => {
    const withLang: CodeBlock = { language: 'typescript', code: 'const x = 1' }
    expect(withLang.language).toBe('typescript')

    const withoutLang: CodeBlock = { code: 'const x = 1' }
    expect(withoutLang.language).toBeUndefined()
  })
})

// ===========================================================================
// SlideProps Type Tests
// ===========================================================================

describe('SlideProps type', () => {
  it('should have all required properties', () => {
    const props: SlideProps = {
      content: { body: 'Content', codeBlocks: [] },
      frame: 0,
      totalFrames: 150,
      index: 0,
    }
    expect(props.content).toBeDefined()
    expect(props.frame).toBe(0)
    expect(props.totalFrames).toBe(150)
    expect(props.index).toBe(0)
  })
})

// ===========================================================================
// Integration Tests
// ===========================================================================

describe('integration tests', () => {
  it('should create composition for a blog post', () => {
    const doc = createDoc(
      `
# Building Modern Web Applications

In this tutorial, we'll explore modern web development.

## Getting Started

First, let's set up our project.

\`\`\`bash
npm init -y
npm install react
\`\`\`

## Component Structure

Here's our main component:

\`\`\`typescript
import React from 'react'

export function App() {
  return <div>Hello World</div>
}
\`\`\`

## Conclusion

That's the basics of modern web development!
    `,
      {
        $type: 'BlogPost',
        title: 'Building Modern Web Apps',
        author: 'Developer',
      },
      'https://example.com/blog/modern-web-apps'
    )

    const slides = extractSlides(doc)
    const config = createCompositionConfig(doc)

    expect(slides).toHaveLength(4)
    expect(slides[0].title).toBe('Building Modern Web Applications')
    expect(slides[1].codeBlocks).toHaveLength(1)
    expect(slides[2].codeBlocks[0].language).toBe('typescript')

    expect(config.id).toBe('https://example.com/blog/modern-web-apps')
    expect(config.durationInFrames).toBe(600) // 4 slides * 5 seconds * 30 fps
  })

  it('should handle presentation-style document', () => {
    const doc = createDoc(`
# Company Overview

Welcome to our Q4 presentation.

# Revenue Growth

We achieved 50% growth this quarter.

# Product Updates

New features released:
- Feature A
- Feature B
- Feature C

# Roadmap

Upcoming milestones for next quarter.

# Q&A

Thank you for attending!
    `)

    const slides = extractSlides(doc)
    const duration = calculateDuration(doc)
    const config = createCompositionConfig(doc)

    expect(slides).toHaveLength(5)
    expect(duration).toBe(750) // 5 * 5 * 30
    expect(config.fps).toBe(30)
  })

  it('should handle technical documentation', () => {
    const doc = createDoc(`
# API Reference

Documentation for our API.

## Authentication

All requests require Bearer token.

\`\`\`http
Authorization: Bearer your-token
\`\`\`

## Endpoints

### GET /users

\`\`\`typescript
interface User {
  id: string
  name: string
  email: string
}
\`\`\`
    `)

    const slides = extractSlides(doc)

    expect(slides.length).toBeGreaterThanOrEqual(2)
    expect(slides.some((s) => s.codeBlocks.length > 0)).toBe(true)
  })
})

// ===========================================================================
// Error Scenario Tests
// ===========================================================================

describe('error scenarios', () => {
  it('should handle malformed markdown gracefully', () => {
    const doc = createDoc(`
# Unclosed [link

Some **unclosed bold

\`\`\`
unclosed code block
    `)

    expect(() => extractSlides(doc)).not.toThrow()
  })

  it('should handle very long content', () => {
    const longContent = '# Title\n\n' + 'Lorem ipsum '.repeat(10000)
    const doc = createDoc(longContent)

    expect(() => extractSlides(doc)).not.toThrow()
    expect(() => calculateDuration(doc)).not.toThrow()
  })

  it('should handle special unicode characters', () => {
    const doc = createDoc(`
# Chinese: Zhong Wen

Content here.

# Japanese: Ri Ben Yu

More content.
    `)

    const slides = extractSlides(doc)

    expect(slides).toHaveLength(2)
    expect(slides[0].title).toContain('Chinese')
    expect(slides[1].title).toContain('Japanese')
  })

  it('should handle HTML in markdown', () => {
    const doc = createDoc(`
# HTML Content

<div class="container">
  <p>Some HTML</p>
</div>

More markdown.
    `)

    expect(() => extractSlides(doc)).not.toThrow()
  })
})

// ===========================================================================
// Video Format Tests
// ===========================================================================

describe('video format support', () => {
  it('should support 1080p configuration', () => {
    const doc = createDoc('# Test')
    const config = createCompositionConfig(doc, {
      width: 1920,
      height: 1080,
      fps: 30,
    })

    expect(config.width).toBe(1920)
    expect(config.height).toBe(1080)
  })

  it('should support 4K configuration', () => {
    const doc = createDoc('# Test')
    const config = createCompositionConfig(doc, {
      width: 3840,
      height: 2160,
      fps: 60,
    })

    expect(config.width).toBe(3840)
    expect(config.height).toBe(2160)
  })

  it('should support vertical video configuration', () => {
    const doc = createDoc('# Test')
    const config = createCompositionConfig(doc, {
      width: 1080,
      height: 1920,
      fps: 30,
    })

    expect(config.width).toBe(1080)
    expect(config.height).toBe(1920)
  })

  it('should support square video configuration', () => {
    const doc = createDoc('# Test')
    const config = createCompositionConfig(doc, {
      width: 1080,
      height: 1080,
      fps: 30,
    })

    expect(config.width).toBe(1080)
    expect(config.height).toBe(1080)
  })

  it('should support various frame rates', () => {
    const doc = createDoc('# Test')

    const fps24 = createCompositionConfig(doc, { fps: 24 })
    const fps30 = createCompositionConfig(doc, { fps: 30 })
    const fps60 = createCompositionConfig(doc, { fps: 60 })
    const fps120 = createCompositionConfig(doc, { fps: 120 })

    expect(fps24.fps).toBe(24)
    expect(fps30.fps).toBe(30)
    expect(fps60.fps).toBe(60)
    expect(fps120.fps).toBe(120)
  })
})

// ===========================================================================
// Slide Timing Tests
// ===========================================================================

describe('slide timing', () => {
  it('should calculate correct frame positions for sequences', () => {
    const doc = createDoc(`
# Slide 1

# Slide 2

# Slide 3
    `)

    const slides = extractSlides(doc)
    const config: VideoConfig = { fps: 30, durationPerSlide: 5 }
    const framesPerSlide = config.fps! * config.durationPerSlide!

    // Each slide should be 150 frames (5 seconds * 30 fps)
    expect(framesPerSlide).toBe(150)

    // Slide positions:
    // Slide 1: frames 0-149
    // Slide 2: frames 150-299
    // Slide 3: frames 300-449
    expect(slides.length * framesPerSlide).toBe(450)
  })

  it('should handle very short durations', () => {
    const doc = createDoc('# Quick')
    const config: VideoConfig = { fps: 30, durationPerSlide: 0.5 }

    const duration = calculateDuration(doc, config)

    expect(duration).toBe(15) // 1 * 0.5 * 30
  })

  it('should handle very long durations', () => {
    const doc = createDoc('# Long')
    const config: VideoConfig = { fps: 30, durationPerSlide: 60 }

    const duration = calculateDuration(doc, config)

    expect(duration).toBe(1800) // 1 * 60 * 30
  })
})
