/**
 * Custom annotation handlers for Code Hike
 */

import type { AnnotationHandler } from 'codehike'

/**
 * Callout annotation handler
 *
 * Adds callout boxes to code blocks for explanatory notes.
 *
 * @example
 * ```md
 * ```js
 * // !callout[/const/] This declares a constant
 * const x = 1
 * ```
 * ```
 */
export const callout: AnnotationHandler = {
  name: 'callout',
  Block: ({ annotation, children }) => {
    return children
  },
}

/**
 * Diff annotation handler
 *
 * Shows code additions and deletions with diff styling.
 *
 * @example
 * ```md
 * ```js
 * // !diff +
 * const newCode = true
 * // !diff -
 * const oldCode = false
 * ```
 * ```
 */
export const diff: AnnotationHandler = {
  name: 'diff',
  Line: ({ annotation, children, ...props }) => {
    const isDeletion = annotation?.query === '-'
    const isAddition = annotation?.query === '+'
    const style = {
      backgroundColor: isDeletion
        ? 'rgba(248, 81, 73, 0.15)'
        : isAddition
          ? 'rgba(63, 185, 80, 0.15)'
          : undefined,
    }
    return (
      <div style={style} {...props}>
        {children}
      </div>
    )
  },
}

/**
 * Focus annotation handler
 *
 * Highlights specific lines while dimming others.
 */
export const focus: AnnotationHandler = {
  name: 'focus',
  onlyIfAnnotated: true,
  Line: ({ annotation, children, ...props }) => {
    const isFocused = annotation !== undefined
    const style = {
      opacity: isFocused ? 1 : 0.5,
      transition: 'opacity 0.2s ease',
    }
    return (
      <div style={style} {...props}>
        {children}
      </div>
    )
  },
}

/**
 * Mark annotation handler
 *
 * Highlights inline code tokens.
 */
export const mark: AnnotationHandler = {
  name: 'mark',
  Inline: ({ annotation, children }) => {
    const color = annotation?.query || 'yellow'
    const style = {
      backgroundColor: color === 'yellow' ? 'rgba(250, 204, 21, 0.3)' : `var(--ch-${color}, ${color})`,
      borderRadius: '2px',
      padding: '0 2px',
    }
    return <span style={style}>{children}</span>
  },
}

/**
 * Default annotation handlers
 *
 * Include these in your Code Hike configuration for common annotations.
 */
export const defaultHandlers: AnnotationHandler[] = [callout, diff, focus, mark]
