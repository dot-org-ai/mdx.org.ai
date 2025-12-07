/**
 * MDX components configuration for Code Hike
 */

import { Block, Code, Pre, type BlockProps, type CustomPreProps } from 'codehike'
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
  // Code Hike's Code component for inline code
  Code: Code as ComponentType<unknown>,
  // Code Hike's Block component for structured content
  Block: Block as ComponentType<unknown>,
}

export type { BlockProps, CustomPreProps }
