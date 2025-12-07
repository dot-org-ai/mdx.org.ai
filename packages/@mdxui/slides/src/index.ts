/**
 * @mdxui/slides - Abstract slides rendering interface for MDX presentations
 *
 * Provides abstract types and utilities for rendering MDXLD documents as
 * presentations/slideshows. Concrete implementations are provided by
 * runtime packages like @mdxe/slidev and @mdxe/remotion.
 *
 * This package defines:
 * - Slide/Presentation types aligned with digital-tools Nouns
 * - Extraction utilities for converting MDX to slides
 * - Abstract rendering interfaces
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'

// =============================================================================
// Core Types (aligned with digital-tools Presentation/Slide Nouns)
// =============================================================================

/**
 * Slide layout types
 *
 * Standard layouts that presentation frameworks typically support.
 */
export type SlideLayout =
  | 'default'
  | 'cover'
  | 'title'
  | 'section'
  | 'two-cols'
  | 'two-cols-header'
  | 'image'
  | 'image-left'
  | 'image-right'
  | 'center'
  | 'quote'
  | 'fact'
  | 'statement'
  | 'intro'
  | 'end'
  | 'iframe'
  | 'full'

/**
 * Slide transition effects
 */
export type SlideTransition =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'flip'

/**
 * Individual slide data
 *
 * Aligns with the Slide Noun from digital-tools.
 */
export interface Slide {
  /** Unique slide identifier */
  id?: string
  /** Slide index (0-based) */
  index: number
  /** Slide title */
  title?: string
  /** Slide content (markdown) */
  content: string
  /** Slide layout */
  layout?: SlideLayout
  /** Slide-specific frontmatter/metadata */
  meta?: Record<string, unknown>
  /** Speaker notes */
  notes?: string
  /** Whether slide is hidden */
  hidden?: boolean
  /** Transition effect */
  transition?: SlideTransition
  /** Background settings */
  background?: SlideBackground
  /** Code blocks in this slide */
  codeBlocks?: CodeBlock[]
  /** Click/step animations */
  clicks?: number
}

/**
 * Slide background configuration
 */
export interface SlideBackground {
  /** Background color */
  color?: string
  /** Background image URL */
  image?: string
  /** Background video URL */
  video?: string
  /** Background size */
  size?: 'cover' | 'contain' | 'auto'
  /** Background position */
  position?: string
  /** Background opacity */
  opacity?: number
}

/**
 * Code block within a slide
 */
export interface CodeBlock {
  /** Programming language */
  language?: string
  /** Code content */
  code: string
  /** Filename/label */
  filename?: string
  /** Line highlights */
  highlights?: string
  /** Whether to show line numbers */
  lineNumbers?: boolean
}

/**
 * Presentation data
 *
 * Aligns with the Presentation Noun from digital-tools.
 */
export interface Presentation {
  /** Presentation ID */
  id?: string
  /** Presentation title */
  title?: string
  /** Presentation description */
  description?: string
  /** Author name */
  author?: string
  /** Date */
  date?: string
  /** Theme name */
  theme?: string
  /** Aspect ratio */
  aspectRatio?: '16:9' | '4:3' | '16:10' | '1:1'
  /** Global frontmatter/metadata */
  meta?: Record<string, unknown>
  /** Slides */
  slides: Slide[]
  /** Has speaker notes */
  hasSpeakerNotes?: boolean
  /** Estimated duration in minutes */
  duration?: number
}

// =============================================================================
// Extraction Utilities
// =============================================================================

/**
 * Options for extracting slides from MDX
 */
export interface ExtractOptions {
  /** Separator pattern (default: /^---$/m) */
  separator?: RegExp
  /** Also split on h1 headings */
  splitOnH1?: boolean
  /** Also split on h2 headings */
  splitOnH2?: boolean
  /** Parse slide-level frontmatter */
  parseFrontmatter?: boolean
  /** Extract speaker notes pattern */
  notesPattern?: RegExp
}

const defaultExtractOptions: ExtractOptions = {
  separator: /^---$/m,
  splitOnH1: false,
  splitOnH2: false,
  parseFrontmatter: true,
  notesPattern: /<!--\s*notes?\s*-->\s*([\s\S]*?)(?:<!--|$)/i,
}

/**
 * Extract slides from MDXLD document
 *
 * Converts an MDX document into a structured presentation with slides.
 *
 * @example
 * ```ts
 * import { extractSlides } from '@mdxui/slides'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(mdxContent)
 * const presentation = extractSlides(doc)
 * console.log(presentation.slides.length)
 * ```
 */
export function extractSlides(doc: MDXLDDocument, options: ExtractOptions = {}): Presentation {
  const opts = { ...defaultExtractOptions, ...options }
  const content = doc.content
  const slides: Slide[] = []

  // Split content into sections
  let sections: string[]

  if (opts.separator) {
    sections = content.split(opts.separator)
  } else {
    sections = [content]
  }

  // If no separators found and splitOnH1/H2, try those
  if (sections.length <= 1) {
    if (opts.splitOnH1) {
      sections = content.split(/(?=^#\s)/m)
    } else if (opts.splitOnH2) {
      sections = content.split(/(?=^##\s)/m)
    }
  }

  // Parse each section into a slide
  for (let i = 0; i < sections.length; i++) {
    const sectionContent = sections[i]
    if (!sectionContent) continue
    const section = sectionContent.trim()
    if (!section) continue

    const slide = parseSlideSection(section, i, opts)
    slides.push(slide)
  }

  // Build presentation from document data
  const presentation: Presentation = {
    id: doc.id,
    title: (doc.data?.title as string) || extractFirstHeading(content),
    description: doc.data?.description as string,
    author: doc.data?.author as string,
    date: doc.data?.date as string,
    theme: doc.data?.theme as string,
    aspectRatio: (doc.data?.aspectRatio as Presentation['aspectRatio']) || '16:9',
    meta: doc.data,
    slides,
    hasSpeakerNotes: slides.some((s) => s.notes),
  }

  return presentation
}

/**
 * Parse a single slide section
 */
function parseSlideSection(section: string, index: number, opts: ExtractOptions): Slide {
  const lines = section.split('\n')
  const slide: Slide = {
    index,
    content: section,
  }

  // Check for slide-level frontmatter
  if (opts.parseFrontmatter && lines[0] === '---') {
    const endIndex = lines.findIndex((line, i) => i > 0 && line === '---')
    if (endIndex > 0) {
      const frontmatterLines = lines.slice(1, endIndex)
      slide.meta = parseYamlLike(frontmatterLines.join('\n'))
      slide.content = lines.slice(endIndex + 1).join('\n').trim()

      // Extract known properties from frontmatter
      if (slide.meta?.layout) slide.layout = slide.meta.layout as SlideLayout
      if (slide.meta?.transition) slide.transition = slide.meta.transition as SlideTransition
      if (slide.meta?.hidden) slide.hidden = slide.meta.hidden as boolean
      if (slide.meta?.clicks) slide.clicks = slide.meta.clicks as number
    }
  }

  // Extract title from first heading
  const titleMatch = slide.content.match(/^#{1,2}\s+(.+)$/m)
  if (titleMatch) {
    slide.title = titleMatch[1]
  }

  // Extract speaker notes
  if (opts.notesPattern) {
    const notesMatch = slide.content.match(opts.notesPattern)
    if (notesMatch && notesMatch[1]) {
      slide.notes = notesMatch[1].trim()
      slide.content = slide.content.replace(opts.notesPattern, '').trim()
    }
  }

  // Extract code blocks
  slide.codeBlocks = extractCodeBlocks(slide.content)

  return slide
}

/**
 * Extract code blocks from markdown
 */
function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = []
  const codeBlockRegex = /```(\w*)?(?:\s*\{([^}]*)\})?\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [, language, meta, code] = match
    if (!code) continue
    const block: CodeBlock = {
      language: language || undefined,
      code: code.trim(),
    }

    // Parse meta string for highlights, filename, etc.
    if (meta) {
      const filenameMatch = meta.match(/filename="([^"]+)"/)
      if (filenameMatch) block.filename = filenameMatch[1]

      const highlightMatch = meta.match(/\{([^}]+)\}/)
      if (highlightMatch) block.highlights = highlightMatch[1]

      if (meta.includes('showLineNumbers')) block.lineNumbers = true
    }

    codeBlocks.push(block)
  }

  return codeBlocks
}

/**
 * Simple YAML-like parser
 */
function parseYamlLike(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const key = match[1]
      const value = match[2]
      if (key && value) {
        // Try to parse as JSON, fall back to string
        try {
          result[key] = JSON.parse(value)
        } catch {
          // Handle unquoted strings
          if (value === 'true') result[key] = true
          else if (value === 'false') result[key] = false
          else if (!isNaN(Number(value))) result[key] = Number(value)
          else result[key] = value.trim()
        }
      }
    }
  }

  return result
}

/**
 * Extract first heading from content
 */
function extractFirstHeading(content: string): string | undefined {
  const match = content.match(/^#{1,2}\s+(.+)$/m)
  return match ? match[1] : undefined
}

// =============================================================================
// Rendering Interfaces
// =============================================================================

/**
 * Abstract slide renderer interface
 *
 * Implementations provide specific rendering strategies.
 */
export interface SlideRenderer<TOutput = unknown> {
  /** Renderer name */
  name: string
  /** Render a presentation to output format */
  render(presentation: Presentation, options?: RenderOptions): TOutput
  /** Render a single slide */
  renderSlide?(slide: Slide, options?: RenderOptions): TOutput
}

/**
 * Render options
 */
export interface RenderOptions {
  /** Theme override */
  theme?: string
  /** Include speaker notes */
  includeSpeakerNotes?: boolean
  /** Pretty print output */
  pretty?: boolean
  /** Custom slide template */
  slideTemplate?: (slide: Slide) => string
  /** Additional metadata to include */
  meta?: Record<string, unknown>
}

/**
 * Create a slide renderer with the given implementation
 */
export function createRenderer<TOutput>(
  name: string,
  render: (presentation: Presentation, options?: RenderOptions) => TOutput
): SlideRenderer<TOutput> {
  return { name, render }
}

// =============================================================================
// React Components (Abstract)
// =============================================================================

import type { ReactNode, ComponentType } from 'react'

/**
 * Props for the abstract Slides component
 */
export interface SlidesProps {
  /** MDXLD document or raw MDX string */
  source: MDXLDDocument | string
  /** Current slide index */
  currentSlide?: number
  /** Extraction options */
  extractOptions?: ExtractOptions
  /** Theme name */
  theme?: string
  /** Custom slide component */
  SlideComponent?: ComponentType<SlideComponentProps>
  /** Show slide numbers */
  showNumbers?: boolean
  /** Show progress bar */
  showProgress?: boolean
  /** Keyboard navigation enabled */
  keyboard?: boolean
  /** On slide change callback */
  onSlideChange?: (index: number) => void
  /** Children override */
  children?: ReactNode
}

/**
 * Props passed to custom slide components
 */
export interface SlideComponentProps {
  /** Slide data */
  slide: Slide
  /** Whether this is the current slide */
  isCurrent: boolean
  /** Total number of slides */
  totalSlides: number
  /** Presentation metadata */
  presentation: Presentation
}

/**
 * Props for the Deck component (presentation container)
 */
export interface DeckProps {
  /** Presentation data */
  presentation: Presentation
  /** Children (slides) */
  children: ReactNode
  /** Theme */
  theme?: string
  /** Aspect ratio */
  aspectRatio?: Presentation['aspectRatio']
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get slide count from document
 */
export function getSlideCount(doc: MDXLDDocument, options?: ExtractOptions): number {
  return extractSlides(doc, options).slides.length
}

/**
 * Get slide by index
 */
export function getSlide(doc: MDXLDDocument, index: number, options?: ExtractOptions): Slide | undefined {
  const presentation = extractSlides(doc, options)
  return presentation.slides[index]
}

/**
 * Estimate presentation duration based on slide count
 *
 * @param slideCount Number of slides
 * @param minutesPerSlide Average minutes per slide (default: 2)
 */
export function estimateDuration(slideCount: number, minutesPerSlide = 2): number {
  return slideCount * minutesPerSlide
}

/**
 * Create a presentation from slides array
 */
export function createPresentation(slides: Partial<Slide>[], meta?: Partial<Presentation>): Presentation {
  return {
    ...meta,
    slides: slides.map((s, i) => ({
      index: i,
      content: '',
      ...s,
    })),
  }
}

// Re-export mdxld
export { parse, type MDXLDDocument } from 'mdxld'
