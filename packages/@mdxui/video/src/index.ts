/**
 * @mdxui/video - Abstract video rendering interface for MDX content
 *
 * Provides abstract types and utilities for rendering MDXLD documents as
 * videos. Concrete implementations are provided by runtime packages like
 * @mdxe/remotion.
 *
 * This package defines:
 * - Video/Scene/Frame types aligned with digital-tools Video Noun
 * - Extraction utilities for converting MDX to video scenes
 * - Abstract rendering interfaces
 * - Timeline and animation abstractions
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'

// =============================================================================
// Core Types (aligned with digital-tools Video Noun)
// =============================================================================

/**
 * Video resolution presets
 */
export type VideoResolution = '480p' | '720p' | '1080p' | '1440p' | '2k' | '4k' | '8k'

/**
 * Video aspect ratio
 */
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '21:9'

/**
 * Video format/codec
 */
export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'gif' | 'png-sequence'

/**
 * Scene transition types
 */
export type SceneTransition =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'wipe'

/**
 * Video configuration
 *
 * Aligns with the Video Noun from digital-tools.
 */
export interface VideoConfig {
  /** Video title */
  title?: string
  /** Video description */
  description?: string
  /** Frames per second */
  fps?: number
  /** Video width in pixels */
  width?: number
  /** Video height in pixels */
  height?: number
  /** Resolution preset (overrides width/height) */
  resolution?: VideoResolution
  /** Aspect ratio */
  aspectRatio?: AspectRatio
  /** Output format */
  format?: VideoFormat
  /** Video codec */
  codec?: 'h264' | 'h265' | 'vp9' | 'av1'
  /** Audio codec */
  audioCodec?: 'aac' | 'mp3' | 'opus'
  /** Video bitrate */
  bitrate?: string
  /** Background color */
  backgroundColor?: string
}

/**
 * Default video configuration
 */
export const defaultVideoConfig: Required<VideoConfig> = {
  title: 'Untitled Video',
  description: '',
  fps: 30,
  width: 1920,
  height: 1080,
  resolution: '1080p',
  aspectRatio: '16:9',
  format: 'mp4',
  codec: 'h264',
  audioCodec: 'aac',
  bitrate: '8M',
  backgroundColor: '#000000',
}

/**
 * Resolution dimensions mapping
 */
export const resolutionDimensions: Record<VideoResolution, { width: number; height: number }> = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '2k': { width: 2048, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  '8k': { width: 7680, height: 4320 },
}

/**
 * Individual scene/segment in a video
 */
export interface Scene {
  /** Scene identifier */
  id?: string
  /** Scene index (0-based) */
  index: number
  /** Scene title */
  title?: string
  /** Scene content (markdown) */
  content: string
  /** Duration in seconds */
  duration: number
  /** Start time in seconds (calculated) */
  startTime?: number
  /** Transition to next scene */
  transition?: SceneTransition
  /** Transition duration in seconds */
  transitionDuration?: number
  /** Scene-specific metadata */
  meta?: Record<string, unknown>
  /** Background settings */
  background?: SceneBackground
  /** Audio settings */
  audio?: SceneAudio
  /** Code blocks */
  codeBlocks?: CodeBlock[]
  /** Animation keyframes */
  keyframes?: Keyframe[]
}

/**
 * Scene background configuration
 */
export interface SceneBackground {
  /** Background color */
  color?: string
  /** Background image URL */
  image?: string
  /** Background video URL */
  video?: string
  /** Gradient definition */
  gradient?: string
  /** Background opacity */
  opacity?: number
}

/**
 * Scene audio configuration
 */
export interface SceneAudio {
  /** Audio track URL */
  src?: string
  /** Volume (0-1) */
  volume?: number
  /** Fade in duration */
  fadeIn?: number
  /** Fade out duration */
  fadeOut?: number
  /** Loop audio */
  loop?: boolean
}

/**
 * Code block in scene
 */
export interface CodeBlock {
  /** Programming language */
  language?: string
  /** Code content */
  code: string
  /** Highlighted lines */
  highlights?: string
  /** Filename */
  filename?: string
}

/**
 * Animation keyframe
 */
export interface Keyframe {
  /** Time offset in seconds from scene start */
  time: number
  /** CSS properties to animate */
  properties: Record<string, string | number>
  /** Easing function */
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

/**
 * Complete video composition
 */
export interface VideoComposition {
  /** Video ID */
  id?: string
  /** Configuration */
  config: VideoConfig
  /** Scenes */
  scenes: Scene[]
  /** Total duration in seconds */
  duration: number
  /** Total frame count */
  totalFrames: number
  /** Global audio track */
  audio?: SceneAudio
  /** Metadata from source document */
  meta?: Record<string, unknown>
}

// =============================================================================
// Extraction Utilities
// =============================================================================

/**
 * Options for extracting video scenes from MDX
 */
export interface ExtractOptions {
  /** Default scene duration in seconds */
  defaultDuration?: number
  /** Scene separator pattern */
  separator?: RegExp
  /** Also split on h1 headings */
  splitOnH1?: boolean
  /** Default transition */
  defaultTransition?: SceneTransition
  /** Default transition duration */
  defaultTransitionDuration?: number
}

const defaultExtractOptions: ExtractOptions = {
  defaultDuration: 5,
  separator: /^---$/m,
  splitOnH1: false,
  defaultTransition: 'fade',
  defaultTransitionDuration: 0.5,
}

/**
 * Extract video scenes from MDXLD document
 *
 * Converts an MDX document into a video composition with scenes.
 *
 * @example
 * ```ts
 * import { extractScenes } from '@mdxui/video'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(mdxContent)
 * const video = extractScenes(doc, { fps: 60 })
 * console.log(video.duration)
 * ```
 */
export function extractScenes(
  doc: MDXLDDocument,
  config: Partial<VideoConfig> = {},
  options: ExtractOptions = {}
): VideoComposition {
  const opts = { ...defaultExtractOptions, ...options }
  const videoConfig = { ...defaultVideoConfig, ...config }

  // Apply resolution preset
  if (videoConfig.resolution && resolutionDimensions[videoConfig.resolution]) {
    const dims = resolutionDimensions[videoConfig.resolution]
    videoConfig.width = dims.width
    videoConfig.height = dims.height
  }

  const content = doc.content
  const scenes: Scene[] = []

  // Split content into sections
  let sections: string[]

  if (opts.separator) {
    sections = content.split(opts.separator)
  } else {
    sections = [content]
  }

  // If no separators found and splitOnH1, try that
  if (sections.length <= 1 && opts.splitOnH1) {
    sections = content.split(/(?=^#\s)/m)
  }

  // Parse each section into a scene
  let currentTime = 0
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim()
    if (!section) continue

    const scene = parseSceneSection(section, i, currentTime, opts)
    scenes.push(scene)
    currentTime += scene.duration + (scene.transitionDuration || 0)
  }

  // Calculate totals
  const duration = scenes.reduce((acc, s) => acc + s.duration, 0)
  const totalFrames = Math.ceil(duration * videoConfig.fps)

  // Build composition
  const composition: VideoComposition = {
    id: doc.id,
    config: videoConfig,
    scenes,
    duration,
    totalFrames,
    meta: {
      ...doc.data,
      title: doc.data?.title || videoConfig.title,
      description: doc.data?.description || videoConfig.description,
    },
  }

  return composition
}

/**
 * Parse a single scene section
 */
function parseSceneSection(
  section: string,
  index: number,
  startTime: number,
  opts: ExtractOptions
): Scene {
  const lines = section.split('\n')
  const scene: Scene = {
    index,
    content: section,
    duration: opts.defaultDuration!,
    startTime,
    transition: opts.defaultTransition,
    transitionDuration: opts.defaultTransitionDuration,
  }

  // Check for scene-level frontmatter
  if (lines[0] === '---') {
    const endIndex = lines.findIndex((line, i) => i > 0 && line === '---')
    if (endIndex > 0) {
      const frontmatterLines = lines.slice(1, endIndex)
      scene.meta = parseYamlLike(frontmatterLines.join('\n'))
      scene.content = lines.slice(endIndex + 1).join('\n').trim()

      // Extract known properties
      if (scene.meta?.duration) scene.duration = scene.meta.duration as number
      if (scene.meta?.transition) scene.transition = scene.meta.transition as SceneTransition
      if (scene.meta?.transitionDuration) scene.transitionDuration = scene.meta.transitionDuration as number
    }
  }

  // Extract title from first heading
  const titleMatch = scene.content.match(/^#{1,2}\s+(.+)$/m)
  if (titleMatch) {
    scene.title = titleMatch[1]
  }

  // Extract code blocks
  scene.codeBlocks = extractCodeBlocks(scene.content)

  return scene
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
    const block: CodeBlock = {
      language: language || undefined,
      code: code.trim(),
    }

    if (meta) {
      const filenameMatch = meta.match(/filename="([^"]+)"/)
      if (filenameMatch) block.filename = filenameMatch[1]

      const highlightMatch = meta.match(/\{([^}]+)\}/)
      if (highlightMatch) block.highlights = highlightMatch[1]
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
      const [, key, value] = match
      try {
        result[key] = JSON.parse(value)
      } catch {
        if (value === 'true') result[key] = true
        else if (value === 'false') result[key] = false
        else if (!isNaN(Number(value))) result[key] = Number(value)
        else result[key] = value.trim()
      }
    }
  }

  return result
}

// =============================================================================
// Timeline Utilities
// =============================================================================

/**
 * Get scene at a specific time
 */
export function getSceneAtTime(composition: VideoComposition, time: number): Scene | undefined {
  let currentTime = 0
  for (const scene of composition.scenes) {
    if (time >= currentTime && time < currentTime + scene.duration) {
      return scene
    }
    currentTime += scene.duration
  }
  return composition.scenes[composition.scenes.length - 1]
}

/**
 * Get scene at a specific frame
 */
export function getSceneAtFrame(composition: VideoComposition, frame: number): Scene | undefined {
  const time = frame / composition.config.fps
  return getSceneAtTime(composition, time)
}

/**
 * Convert time to frame number
 */
export function timeToFrame(time: number, fps: number): number {
  return Math.floor(time * fps)
}

/**
 * Convert frame to time
 */
export function frameToTime(frame: number, fps: number): number {
  return frame / fps
}

/**
 * Get progress through composition (0-1)
 */
export function getProgress(composition: VideoComposition, frame: number): number {
  return frame / composition.totalFrames
}

/**
 * Get scene progress (0-1)
 */
export function getSceneProgress(scene: Scene, time: number): number {
  const sceneTime = time - (scene.startTime || 0)
  return Math.max(0, Math.min(1, sceneTime / scene.duration))
}

// =============================================================================
// Rendering Interfaces
// =============================================================================

/**
 * Abstract video renderer interface
 */
export interface VideoRenderer<TOutput = unknown> {
  /** Renderer name */
  name: string
  /** Render a video composition */
  render(composition: VideoComposition, options?: RenderOptions): TOutput
  /** Render a single scene */
  renderScene?(scene: Scene, options?: RenderOptions): TOutput
  /** Render a single frame */
  renderFrame?(composition: VideoComposition, frame: number, options?: RenderOptions): TOutput
}

/**
 * Render options
 */
export interface RenderOptions {
  /** Output path */
  output?: string
  /** Start frame (for partial renders) */
  startFrame?: number
  /** End frame (for partial renders) */
  endFrame?: number
  /** Quality (0-100) */
  quality?: number
  /** Include audio */
  includeAudio?: boolean
  /** Additional metadata */
  meta?: Record<string, unknown>
}

/**
 * Create a video renderer
 */
export function createRenderer<TOutput>(
  name: string,
  render: (composition: VideoComposition, options?: RenderOptions) => TOutput
): VideoRenderer<TOutput> {
  return { name, render }
}

// =============================================================================
// React Components (Abstract)
// =============================================================================

import type { ReactNode, ComponentType } from 'react'

/**
 * Props for the abstract Video component
 */
export interface VideoProps {
  /** MDXLD document or raw MDX string */
  source: MDXLDDocument | string
  /** Video configuration */
  config?: Partial<VideoConfig>
  /** Extraction options */
  extractOptions?: ExtractOptions
  /** Custom scene component */
  SceneComponent?: ComponentType<SceneComponentProps>
  /** On frame change callback */
  onFrameChange?: (frame: number) => void
  /** On scene change callback */
  onSceneChange?: (scene: Scene) => void
  /** Children override */
  children?: ReactNode
}

/**
 * Props passed to custom scene components
 */
export interface SceneComponentProps {
  /** Scene data */
  scene: Scene
  /** Current frame within scene */
  frame: number
  /** Total frames in scene */
  totalFrames: number
  /** Scene progress (0-1) */
  progress: number
  /** Video configuration */
  config: VideoConfig
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get scene count from document
 */
export function getSceneCount(doc: MDXLDDocument, options?: ExtractOptions): number {
  return extractScenes(doc, {}, options).scenes.length
}

/**
 * Get scene by index
 */
export function getScene(
  doc: MDXLDDocument,
  index: number,
  config?: Partial<VideoConfig>,
  options?: ExtractOptions
): Scene | undefined {
  const composition = extractScenes(doc, config, options)
  return composition.scenes[index]
}

/**
 * Calculate total duration from scenes
 */
export function calculateDuration(scenes: Scene[]): number {
  return scenes.reduce((acc, s) => acc + s.duration, 0)
}

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Create a video composition from scenes array
 */
export function createComposition(
  scenes: Partial<Scene>[],
  config?: Partial<VideoConfig>
): VideoComposition {
  const videoConfig = { ...defaultVideoConfig, ...config }
  let currentTime = 0

  const fullScenes = scenes.map((s, i) => {
    const scene: Scene = {
      index: i,
      content: '',
      duration: 5,
      startTime: currentTime,
      ...s,
    }
    currentTime += scene.duration
    return scene
  })

  const duration = calculateDuration(fullScenes)
  const totalFrames = Math.ceil(duration * videoConfig.fps)

  return {
    config: videoConfig,
    scenes: fullScenes,
    duration,
    totalFrames,
  }
}

// Re-export mdxld
export { parse, type MDXLDDocument } from 'mdxld'
