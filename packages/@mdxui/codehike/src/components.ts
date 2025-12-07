/**
 * MDX components configuration for Code Hike
 */

import { Pre, Inline, type CustomPreProps } from 'codehike/code'
import { Block } from 'codehike/blocks'
import type { ComponentType, ReactNode } from 'react'

/**
 * Props for the CodeHike wrapper component
 */
export interface CodeHikeProps {
  /** The code content to render */
  children?: ReactNode
  /** Optional className for styling */
  className?: string
}

/**
 * MDX component overrides for Code Hike integration
 *
 * Use these components in your MDX provider to enable
 * Code Hike features in code blocks.
 *
 * @example
 * ```tsx
 * import { MDXProvider } from '@mdx-js/react'
 * import { MDXComponents } from '@mdxui/codehike'
 *
 * function App({ children }) {
 *   return (
 *     <MDXProvider components={MDXComponents}>
 *       {children}
 *     </MDXProvider>
 *   )
 * }
 * ```
 */
export const MDXComponents: Record<string, ComponentType<unknown>> = {
  // Code Hike's Pre component for code blocks
  pre: Pre as ComponentType<unknown>,
  // Code Hike's Inline component for inline code
  code: Inline as ComponentType<unknown>,
}

// Note: Block from codehike/blocks is a Zod schema, not a React component
// Use it for parsing MDX content structure, not as a direct component

export type { CustomPreProps }
