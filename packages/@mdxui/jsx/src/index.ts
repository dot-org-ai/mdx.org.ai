/**
 * @mdxui/jsx - Unified JSX runtime abstraction
 *
 * This package provides a unified interface for React-compatible hooks and utilities
 * that work across React, Preact, and Hono JSX runtimes.
 *
 * Runtime selection is done at build time via package.json conditional exports:
 * - Default: React runtime
 * - With "hono" condition: Hono JSX DOM runtime
 *
 * @example
 * ```ts
 * // Import hooks - runtime is selected at build time
 * import { useState, useEffect, forwardRef } from '@mdxui/jsx'
 *
 * // Import custom Radix-compatible hooks
 * import { useControllableState, useCallbackRef } from '@mdxui/jsx/hooks'
 *
 * // Import primitives
 * import { Slot, Primitive, Portal } from '@mdxui/jsx/primitives'
 * ```
 *
 * @packageDocumentation
 */

// Default to React runtime
export * from './react'

// Re-export custom hooks (avoid conflicts with React's hooks)
export {
  useCallbackRef,
  useControllableState,
  usePrevious,
  useSize,
  useEscapeKeydown,
  useRect,
  useIsHydrated,
  useDirection,
  DirectionProvider,
  // Export our SSR-safe versions with different names if needed
  useLayoutEffect as useSafeLayoutEffect,
  useId as useRadixId,
} from './hooks'

// Re-export primitives
export * from './primitives'

// Re-export utilities
export * from './utils'
