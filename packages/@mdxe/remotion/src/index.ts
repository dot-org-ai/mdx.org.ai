/**
 * @mdxe/remotion - Remotion video runtime for rendering MDX content as videos
 *
 * Provides React components and utilities for rendering MDXLD documents
 * as video compositions using the Remotion framework.
 *
 * @packageDocumentation
 */

import React from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'
import { parse, type MDXLDDocument } from 'mdxld'

/**
 * Configuration for video rendering
 */
export interface VideoConfig {
  /** Frames per second (default: 30) */
  fps?: number
  /** Video width in pixels (default: 1920) */
  width?: number
  /** Video height in pixels (default: 1080) */
  height?: number
  /** Duration in seconds per slide/section */
  durationPerSlide?: number
}

/**
 * Default video configuration
 */
export const defaultVideoConfig: Required<VideoConfig> = {
  fps: 30,
  width: 1920,
  height: 1080,
  durationPerSlide: 5,
}

/**
 * Props for MDXComposition component
 */
export interface MDXCompositionProps {
  /** MDXLD document to render */
  doc: MDXLDDocument
  /** Video configuration */
  config?: VideoConfig
  /** Custom slide component */
  SlideComponent?: React.ComponentType<SlideProps>
}

/**
 * Props for individual slides
 */
export interface SlideProps {
  /** Slide content (heading + body) */
  content: SlideContent
  /** Current frame within this slide */
  frame: number
  /** Total frames for this slide */
  totalFrames: number
  /** Slide index */
  index: number
}

/**
 * Content extracted for a single slide
 */
export interface SlideContent {
  /** Slide title (from heading) */
  title?: string
  /** Slide body content */
  body: string
  /** Code blocks in this slide */
  codeBlocks: CodeBlock[]
}

/**
 * Code block data
 */
export interface CodeBlock {
  /** Programming language */
  language?: string
  /** Code content */
  code: string
}

/**
 * Extract slides from MDXLD document
 *
 * Splits document into slides based on headings (h1/h2).
 */
export function extractSlides(doc: MDXLDDocument): SlideContent[] {
  const content = doc.content
  const slides: SlideContent[] = []

  // Split by h1 or h2 headings
  const sections = content.split(/(?=^#{1,2}\s)/m)

  for (const section of sections) {
    if (!section.trim()) continue

    const lines = section.split('\n')
    const firstLine = lines[0]?.trim() || ''

    // Extract title from heading
    const titleMatch = firstLine.match(/^#{1,2}\s+(.+)$/)
    const title = titleMatch ? titleMatch[1] : undefined

    // Extract body (everything after the heading)
    const body = titleMatch ? lines.slice(1).join('\n').trim() : section.trim()

    // Extract code blocks
    const codeBlocks: CodeBlock[] = []
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
    let match
    while ((match = codeBlockRegex.exec(section)) !== null) {
      codeBlocks.push({
        language: match[1] || undefined,
        code: match[2],
      })
    }

    slides.push({ title, body, codeBlocks })
  }

  return slides.length > 0 ? slides : [{ body: content, codeBlocks: [] }]
}

/**
 * Default slide component
 */
export function DefaultSlide({ content, frame, totalFrames }: SlideProps): React.ReactElement {
  const opacity = Math.min(1, frame / 15) // Fade in over 15 frames

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        backgroundColor: '#1a1a2e',
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        opacity,
      },
    },
    content.title &&
      React.createElement(
        'h1',
        {
          style: {
            color: '#ffffff',
            fontSize: 72,
            fontWeight: 'bold',
            marginBottom: 40,
            fontFamily: 'system-ui, sans-serif',
          },
        },
        content.title
      ),
    content.body &&
      React.createElement(
        'p',
        {
          style: {
            color: '#e0e0e0',
            fontSize: 36,
            lineHeight: 1.6,
            fontFamily: 'system-ui, sans-serif',
          },
        },
        content.body.replace(/```[\s\S]*?```/g, '').trim()
      ),
    content.codeBlocks.length > 0 &&
      React.createElement(
        'pre',
        {
          style: {
            backgroundColor: '#0d0d1a',
            padding: 30,
            borderRadius: 12,
            marginTop: 40,
            overflow: 'hidden',
          },
        },
        React.createElement(
          'code',
          {
            style: {
              color: '#00ff88',
              fontSize: 24,
              fontFamily: 'monospace',
            },
          },
          content.codeBlocks[0]?.code
        )
      )
  )
}

/**
 * MDX Composition component for Remotion
 *
 * Renders an MDXLD document as a video composition with slides.
 *
 * @example
 * ```tsx
 * import { registerRoot } from 'remotion'
 * import { MDXComposition } from '@mdxe/remotion'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(mdxContent)
 *
 * export const RemotionRoot = () => (
 *   <Composition
 *     id="mdx-video"
 *     component={() => <MDXComposition doc={doc} />}
 *     durationInFrames={300}
 *     fps={30}
 *     width={1920}
 *     height={1080}
 *   />
 * )
 *
 * registerRoot(RemotionRoot)
 * ```
 */
export function MDXComposition({ doc, config = {}, SlideComponent = DefaultSlide }: MDXCompositionProps): React.ReactElement {
  const { fps } = useVideoConfig()
  const opts = { ...defaultVideoConfig, ...config }
  const slides = extractSlides(doc)
  const framesPerSlide = opts.durationPerSlide * fps

  return React.createElement(
    AbsoluteFill,
    null,
    slides.map((slide, index) =>
      React.createElement(
        Sequence,
        {
          key: index,
          from: index * framesPerSlide,
          durationInFrames: framesPerSlide,
        },
        React.createElement(SlideContent, {
          content: slide,
          index,
          framesPerSlide,
          SlideComponent,
        })
      )
    )
  )
}

/**
 * Internal component to handle frame calculations per slide
 */
function SlideContent({
  content,
  index,
  framesPerSlide,
  SlideComponent,
}: {
  content: SlideContent
  index: number
  framesPerSlide: number
  SlideComponent: React.ComponentType<SlideProps>
}): React.ReactElement {
  const frame = useCurrentFrame()

  return React.createElement(SlideComponent, {
    content,
    frame,
    totalFrames: framesPerSlide,
    index,
  })
}

/**
 * Calculate total duration in frames for a document
 */
export function calculateDuration(doc: MDXLDDocument, config: VideoConfig = {}): number {
  const opts = { ...defaultVideoConfig, ...config }
  const slides = extractSlides(doc)
  return slides.length * opts.durationPerSlide * opts.fps
}

/**
 * Create a Remotion composition config from MDXLD document
 */
export function createCompositionConfig(doc: MDXLDDocument, config: VideoConfig = {}) {
  const opts = { ...defaultVideoConfig, ...config }
  const durationInFrames = calculateDuration(doc, opts)

  return {
    id: doc.id || 'mdx-video',
    durationInFrames,
    fps: opts.fps,
    width: opts.width,
    height: opts.height,
  }
}

// Re-export useful Remotion components
export { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion'

// Re-export mdxld utilities
export { parse, type MDXLDDocument } from 'mdxld'
