/**
 * Abstract Code component types for @mdxui/codehike
 *
 * Defines the abstract Code interface with variants:
 * - block: Standard syntax-highlighted code block
 * - scrolly: Scrollytelling code walkthrough (multiple steps)
 * - spotlight: Focus/highlight specific code regions
 *
 * @packageDocumentation
 */

import type { ReactNode, ComponentType } from 'react'
import type { HighlightedCode, AnnotationHandler } from 'codehike/code'

// =============================================================================
// Code Variants
// =============================================================================

/**
 * Code display variant
 *
 * - `block`: Standard syntax-highlighted code block
 * - `scrolly`: Scrollytelling code walkthrough with multiple steps
 * - `spotlight`: Focus mode highlighting specific code regions
 * - `inline`: Inline code snippet
 */
export type CodeVariant = 'block' | 'scrolly' | 'spotlight' | 'inline'

/**
 * Code language identifier
 */
export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'scala'
  | 'shell'
  | 'bash'
  | 'sql'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'mdx'
  | 'jsx'
  | 'tsx'
  | string

// =============================================================================
// Code Block Types
// =============================================================================

/**
 * Base code content
 */
export interface CodeContent {
  /** Raw code string */
  code: string
  /** Programming language */
  language?: CodeLanguage
  /** Filename or title */
  filename?: string
  /** Line highlights (e.g., "1,3-5,10") */
  highlights?: string
  /** Show line numbers */
  lineNumbers?: boolean
  /** Starting line number */
  startingLineNumber?: number
  /** Annotation meta string */
  meta?: string
}

/**
 * Code step for scrollytelling
 */
export interface CodeStep extends CodeContent {
  /** Step title */
  title?: string
  /** Step description/narrative */
  description?: string
  /** Focus specific lines */
  focus?: string
  /** Annotations for this step */
  annotations?: CodeAnnotation[]
}

/**
 * Code annotation
 */
export interface CodeAnnotation {
  /** Annotation name (e.g., 'mark', 'focus', 'callout') */
  name: string
  /** Line range or token pattern */
  query?: string
  /** Additional data */
  data?: Record<string, unknown>
}

/**
 * Spotlight region
 */
export interface SpotlightRegion {
  /** Region identifier */
  id?: string
  /** Lines to spotlight */
  lines?: string
  /** Token pattern to spotlight */
  pattern?: RegExp | string
  /** Region label */
  label?: string
  /** Callout content */
  callout?: string
}

// =============================================================================
// Component Props
// =============================================================================

/**
 * Base props for all Code variants
 */
export interface CodeBaseProps {
  /** Code variant (auto-detected if not provided) */
  variant?: CodeVariant
  /** Code content */
  code?: string
  /** Language */
  language?: CodeLanguage
  /** Filename/title */
  filename?: string
  /** Theme name */
  theme?: string
  /** Custom annotation handlers */
  handlers?: AnnotationHandler[]
  /** Custom className */
  className?: string
  /** Show copy button */
  copyButton?: boolean
  /** Show language badge */
  showLanguage?: boolean
}

/**
 * Props for block variant
 */
export interface CodeBlockProps extends CodeBaseProps {
  variant?: 'block'
  /** Line highlights */
  highlights?: string
  /** Show line numbers */
  lineNumbers?: boolean
  /** Starting line number */
  startingLineNumber?: number
  /** Word wrap */
  wordWrap?: boolean
  /** Max height before scrolling */
  maxHeight?: string | number
}

/**
 * Props for scrolly variant (scrollytelling)
 */
export interface CodeScrollyProps extends CodeBaseProps {
  variant: 'scrolly'
  /** Code steps */
  steps: CodeStep[]
  /** Progress indicator style */
  progressStyle?: 'dots' | 'line' | 'numbers' | 'none'
  /** Scroll trigger position (0-1) */
  triggerPosition?: number
  /** Sticky code panel position */
  stickyPosition?: 'left' | 'right'
  /** Show step navigation */
  navigation?: boolean
  /** On step change callback */
  onStepChange?: (step: number) => void
  /** Current step (controlled) */
  currentStep?: number
  /** Children as steps (alternative to steps prop) */
  children?: ReactNode
}

/**
 * Props for spotlight variant
 */
export interface CodeSpotlightProps extends CodeBaseProps {
  variant: 'spotlight'
  /** Regions to spotlight */
  regions: SpotlightRegion[]
  /** Dim non-spotlighted code opacity */
  dimOpacity?: number
  /** Spotlight transition duration */
  transitionDuration?: number
  /** Current spotlight index (controlled) */
  currentSpotlight?: number
  /** On spotlight change callback */
  onSpotlightChange?: (index: number) => void
  /** Auto-advance interval */
  autoAdvance?: number
  /** Show spotlight navigation */
  navigation?: boolean
}

/**
 * Props for inline variant
 */
export interface CodeInlineProps extends CodeBaseProps {
  variant: 'inline'
  /** Code content */
  children: string
}

/**
 * Union type for all Code props
 */
export type CodeProps = CodeBlockProps | CodeScrollyProps | CodeSpotlightProps | CodeInlineProps

// =============================================================================
// Inference Utilities
// =============================================================================

/**
 * Infer code variant from props/children
 *
 * - Has `steps` prop or multiple children → scrolly
 * - Has `regions` prop → spotlight
 * - Single code string → block
 * - Inline context → inline
 */
export function inferVariant(props: Partial<CodeProps>): CodeVariant {
  if ('steps' in props && Array.isArray((props as CodeScrollyProps).steps)) {
    return 'scrolly'
  }
  if ('regions' in props && Array.isArray((props as CodeSpotlightProps).regions)) {
    return 'spotlight'
  }
  if (props.variant) {
    return props.variant
  }
  return 'block'
}

/**
 * Check if props indicate scrolly variant
 */
export function isScrollyProps(props: CodeProps): props is CodeScrollyProps {
  return props.variant === 'scrolly' || ('steps' in props && Array.isArray(props.steps))
}

/**
 * Check if props indicate spotlight variant
 */
export function isSpotlightProps(props: CodeProps): props is CodeSpotlightProps {
  return props.variant === 'spotlight' || ('regions' in props && Array.isArray(props.regions))
}

/**
 * Check if props indicate inline variant
 */
export function isInlineProps(props: CodeProps): props is CodeInlineProps {
  return props.variant === 'inline'
}

// =============================================================================
// Step/Region Builders
// =============================================================================

/**
 * Create a code step for scrollytelling
 */
export function createStep(
  code: string,
  options: Omit<CodeStep, 'code'> = {}
): CodeStep {
  return { code, ...options }
}

/**
 * Create a spotlight region
 */
export function createSpotlight(
  lines: string,
  options: Omit<SpotlightRegion, 'lines'> = {}
): SpotlightRegion {
  return { lines, ...options }
}

/**
 * Parse highlights string to line numbers
 *
 * @example
 * parseHighlights("1,3-5,10") // [1, 3, 4, 5, 10]
 */
export function parseHighlights(highlights: string): number[] {
  const lines: number[] = []
  const parts = highlights.split(',').map((s) => s.trim())

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = Number(startStr)
      const end = Number(endStr)
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          lines.push(i)
        }
      }
    } else {
      const num = Number(part)
      if (!isNaN(num)) {
        lines.push(num)
      }
    }
  }

  return lines.sort((a, b) => a - b)
}

// =============================================================================
// Abstract Component Types
// =============================================================================

/**
 * Abstract Code component interface
 *
 * Implementations should handle all variants and render appropriately.
 */
export type CodeComponent = ComponentType<CodeProps>

/**
 * Props for individual step component (used in scrolly)
 */
export interface StepComponentProps {
  /** Step data */
  step: CodeStep
  /** Step index */
  index: number
  /** Whether this is the current step */
  isCurrent: boolean
  /** Total steps */
  totalSteps: number
  /** Highlighted code */
  highlightedCode?: HighlightedCode
}

/**
 * Props for spotlight callout component
 */
export interface SpotlightCalloutProps {
  /** Region data */
  region: SpotlightRegion
  /** Region index */
  index: number
  /** Whether this spotlight is active */
  isActive: boolean
}

// =============================================================================
// Theme Types
// =============================================================================

/**
 * Code theme configuration
 */
export interface CodeTheme {
  /** Theme name */
  name: string
  /** Background color */
  background?: string
  /** Text color */
  foreground?: string
  /** Line number color */
  lineNumber?: string
  /** Highlight line background */
  highlightBackground?: string
  /** Selection background */
  selectionBackground?: string
  /** Comment color */
  comment?: string
  /** Keyword color */
  keyword?: string
  /** String color */
  string?: string
  /** Number color */
  number?: string
  /** Function color */
  function?: string
  /** Variable color */
  variable?: string
  /** Operator color */
  operator?: string
}

/**
 * Built-in theme names
 */
export type BuiltInTheme =
  | 'github-dark'
  | 'github-light'
  | 'dracula'
  | 'one-dark-pro'
  | 'nord'
  | 'night-owl'
  | 'monokai'
  | 'solarized-dark'
  | 'solarized-light'
  | 'vitesse-dark'
  | 'vitesse-light'
