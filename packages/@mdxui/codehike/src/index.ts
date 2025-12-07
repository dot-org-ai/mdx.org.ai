/**
 * @mdxui/codehike - Code Hike components for annotated code walkthroughs in MDX
 *
 * Provides React components for rendering annotated code with highlights,
 * focus, and step-by-step explanations using the Code Hike library.
 *
 * ## Code Variants
 *
 * The abstract Code interface supports three main variants:
 *
 * - **block**: Standard syntax-highlighted code block
 * - **scrolly**: Scrollytelling code walkthrough with multiple steps
 * - **spotlight**: Focus mode highlighting specific code regions
 *
 * The variant can be auto-inferred from props:
 * - Has `steps` array → scrolly
 * - Has `regions` array → spotlight
 * - Otherwise → block
 *
 * @packageDocumentation
 */

// Re-export all Code Hike components and utilities
export {
  Block,
  Code,
  CodeContent,
  Pre,
  highlight,
  type AnnotationHandler,
  type BlockProps,
  type CustomPreProps,
  type HighlightedCode,
  type InlineAnnotation,
  type InnerLine,
  type InnerPre,
  type InnerToken,
  type PreProps,
  type RawCode,
  type Token,
  type TokenGroup,
} from 'codehike'

// Re-export MDX components
export { MDXComponents } from './components.js'

// Re-export custom annotation handlers
export * from './annotations/index.js'

// Re-export abstract Code types and utilities
export * from './types.js'
