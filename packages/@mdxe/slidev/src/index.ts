/**
 * @mdxe/slidev - Slidev presentation runtime for rendering MDX content as slides
 *
 * Provides utilities for converting MDXLD documents to Slidev markdown format
 * and running Slidev presentations programmatically.
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'

/**
 * Slidev configuration options
 */
export interface SlidevConfig {
  /** Presentation theme (default: 'default') */
  theme?: string
  /** Enable presenter mode highlights */
  highlighter?: 'shiki' | 'prism'
  /** Line numbers in code blocks */
  lineNumbers?: boolean
  /** Enable drawings/annotations */
  drawings?: {
    enabled?: boolean
    persist?: boolean
  }
  /** Transition between slides */
  transition?: string
  /** Custom CSS */
  css?: string
  /** Title of the presentation */
  title?: string
  /** Information about the presentation */
  info?: string
}

/**
 * Default Slidev configuration
 */
export const defaultSlidevConfig: Required<SlidevConfig> = {
  theme: 'default',
  highlighter: 'shiki',
  lineNumbers: false,
  drawings: {
    enabled: true,
    persist: false,
  },
  transition: 'slide-left',
  css: 'unocss',
  title: 'Presentation',
  info: '',
}

/**
 * Slide data extracted from MDXLD
 */
export interface Slide {
  /** Slide content in markdown */
  content: string
  /** Slide-specific frontmatter */
  frontmatter?: Record<string, unknown>
  /** Speaker notes */
  notes?: string
  /** Layout type */
  layout?: string
}

/**
 * Result of converting MDXLD to Slidev
 */
export interface SlidevOutput {
  /** Full Slidev markdown content */
  markdown: string
  /** Individual slides */
  slides: Slide[]
  /** Global frontmatter */
  frontmatter: Record<string, unknown>
}

/**
 * Extract slides from MDXLD document
 *
 * Splits document into slides based on horizontal rules (---) or h1 headings.
 */
export function extractSlides(doc: MDXLDDocument): Slide[] {
  const content = doc.content
  const slides: Slide[] = []

  // Slidev uses --- as slide separators
  // First, try splitting by ---
  const sections = content.split(/^---$/m)

  // If no separators found, split by h1 headings
  if (sections.length <= 1) {
    const h1Sections = content.split(/(?=^#\s)/m)
    for (const section of h1Sections) {
      if (!section.trim()) continue
      slides.push(parseSlide(section))
    }
  } else {
    for (const section of sections) {
      if (!section.trim()) continue
      slides.push(parseSlide(section))
    }
  }

  return slides.length > 0 ? slides : [{ content: content.trim() }]
}

/**
 * Parse a single slide section
 */
function parseSlide(section: string): Slide {
  const lines = section.trim().split('\n')
  const slide: Slide = { content: '' }

  // Check for slide-level frontmatter
  if (lines[0] === '---') {
    const endIndex = lines.findIndex((line, i) => i > 0 && line === '---')
    if (endIndex > 0) {
      // Parse frontmatter
      const frontmatterLines = lines.slice(1, endIndex)
      slide.frontmatter = parseFrontmatter(frontmatterLines.join('\n'))
      slide.content = lines.slice(endIndex + 1).join('\n').trim()

      // Extract layout if present
      if (slide.frontmatter?.layout) {
        slide.layout = slide.frontmatter.layout as string
      }
    } else {
      slide.content = section.trim()
    }
  } else {
    slide.content = section.trim()
  }

  // Extract speaker notes (marked with <!-- notes --> or at bottom after ---)
  const notesMatch = slide.content.match(/<!--\s*notes?\s*-->\s*([\s\S]*?)(?:<!--|$)/)
  if (notesMatch) {
    slide.notes = notesMatch[1].trim()
    slide.content = slide.content.replace(/<!--\s*notes?\s*-->[\s\S]*?(?:<!--|$)/, '').trim()
  }

  return slide
}

/**
 * Simple frontmatter parser
 */
function parseFrontmatter(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      // Try to parse as JSON, fall back to string
      try {
        result[key] = JSON.parse(value)
      } catch {
        result[key] = value.trim()
      }
    }
  }

  return result
}

/**
 * Convert MDXLD document to Slidev markdown format
 *
 * @example
 * ```ts
 * import { toSlidev } from '@mdxe/slidev'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(mdxContent)
 * const slidev = toSlidev(doc, { theme: 'seriph' })
 *
 * // Write to slides.md
 * fs.writeFileSync('slides.md', slidev.markdown)
 * ```
 */
export function toSlidev(doc: MDXLDDocument, config: SlidevConfig = {}): SlidevOutput {
  const opts = { ...defaultSlidevConfig, ...config }
  const slides = extractSlides(doc)

  // Build global frontmatter
  const frontmatter: Record<string, unknown> = {
    theme: opts.theme,
    highlighter: opts.highlighter,
    lineNumbers: opts.lineNumbers,
    drawings: opts.drawings,
    transition: opts.transition,
    css: opts.css,
    title: doc.data?.title || opts.title,
    ...doc.data,
  }

  // Remove undefined values
  Object.keys(frontmatter).forEach((key) => {
    if (frontmatter[key] === undefined) {
      delete frontmatter[key]
    }
  })

  // Build markdown output
  const frontmatterYaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return `${key}:\n${Object.entries(value as Record<string, unknown>)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')}`
      }
      return `${key}: ${value}`
    })
    .join('\n')

  const slidesMarkdown = slides
    .map((slide, index) => {
      let slideContent = ''

      // Add slide-level frontmatter if present
      if (slide.frontmatter || slide.layout) {
        const slideFm = { ...slide.frontmatter }
        if (slide.layout) slideFm.layout = slide.layout
        slideContent += '---\n'
        slideContent += Object.entries(slideFm)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
        slideContent += '\n---\n\n'
      }

      slideContent += slide.content

      // Add speaker notes
      if (slide.notes) {
        slideContent += '\n\n<!--\n' + slide.notes + '\n-->'
      }

      return slideContent
    })
    .join('\n\n---\n\n')

  const markdown = `---\n${frontmatterYaml}\n---\n\n${slidesMarkdown}`

  return { markdown, slides, frontmatter }
}

/**
 * Convert Slidev markdown back to MDXLD document
 *
 * Useful for round-trip editing.
 */
export function fromSlidev(markdown: string): MDXLDDocument {
  // Parse the Slidev markdown
  const doc = parse(markdown)

  // Convert slide separators to h1 headings if needed
  // This is a simplified conversion - full implementation would
  // preserve more Slidev-specific features

  return doc
}

/**
 * Slidev CLI command options
 */
export interface SlidevCliOptions {
  /** Port for dev server (default: 3030) */
  port?: number
  /** Open browser automatically */
  open?: boolean
  /** Remote access */
  remote?: boolean | string
  /** Log level */
  log?: 'error' | 'warn' | 'info' | 'silent'
}

/**
 * Generate Slidev CLI command
 *
 * @example
 * ```ts
 * import { getSlidevCommand } from '@mdxe/slidev'
 * import { exec } from 'child_process'
 *
 * const cmd = getSlidevCommand('slides.md', { port: 3030, open: true })
 * exec(cmd) // npx slidev slides.md --port 3030 --open
 * ```
 */
export function getSlidevCommand(slidesPath: string, options: SlidevCliOptions = {}): string {
  const args = ['npx', 'slidev', slidesPath]

  if (options.port) args.push('--port', String(options.port))
  if (options.open) args.push('--open')
  if (options.remote) {
    args.push('--remote')
    if (typeof options.remote === 'string') {
      args.push(options.remote)
    }
  }
  if (options.log) args.push('--log', options.log)

  return args.join(' ')
}

/**
 * Generate Slidev export command
 */
export function getSlidevExportCommand(
  slidesPath: string,
  outputPath: string,
  format: 'pdf' | 'png' | 'pptx' = 'pdf'
): string {
  return `npx slidev export ${slidesPath} --output ${outputPath} --format ${format}`
}

/**
 * Generate Slidev build command for static site
 */
export function getSlidevBuildCommand(slidesPath: string, outputDir = 'dist'): string {
  return `npx slidev build ${slidesPath} --out ${outputDir}`
}

// Re-export mdxld utilities
export { parse, type MDXLDDocument } from 'mdxld'
