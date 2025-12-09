/**
 * @mdxui/jsx/hono - Hono JSX DOM runtime exports
 *
 * Re-exports Hono JSX DOM hooks and utilities for use in @mdxui components.
 * This runtime is used for lightweight client-side rendering (2.8KB vs React's 47.8KB).
 */

// Core Hono JSX DOM exports
export {
  // Hooks
  useState,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
  useReducer,
  useId,
  useSyncExternalStore,
  useImperativeHandle,
  useDebugValue,
  useDeferredValue,
  useTransition,
  // Component utilities
  forwardRef,
  memo,
  createContext,
  createRef,
  // Elements
  createElement,
  cloneElement,
  isValidElement,
  Fragment,
  // Render
  render,
  // View Transitions
  startViewTransition,
  useViewTransition,
  // Types
  type RefObject,
} from 'hono/jsx/dom'

// Hono doesn't have Children utility, provide a minimal implementation
export const Children = {
  map: <T, C>(children: C | C[] | null | undefined, fn: (child: C, index: number) => T): T[] => {
    if (children == null) return []
    const arr = Array.isArray(children) ? children : [children]
    return arr.map(fn)
  },
  forEach: <C>(children: C | C[] | null | undefined, fn: (child: C, index: number) => void): void => {
    if (children == null) return
    const arr = Array.isArray(children) ? children : [children]
    arr.forEach(fn)
  },
  count: <C>(children: C | C[] | null | undefined): number => {
    if (children == null) return 0
    return Array.isArray(children) ? children.length : 1
  },
  only: <C>(children: C | C[] | null | undefined): C => {
    if (children == null) {
      throw new Error('Children.only expected to receive a single child')
    }
    if (Array.isArray(children)) {
      if (children.length !== 1) {
        throw new Error('Children.only expected to receive a single child')
      }
      return children[0] as C
    }
    return children as C
  },
  toArray: <C>(children: C | C[] | null | undefined): C[] => {
    if (children == null) return []
    return Array.isArray(children) ? children : [children]
  },
}

// Portal implementation for Hono
export function createPortal(children: unknown, container: Element): unknown {
  // Hono doesn't have built-in portal support
  // We'll render directly to the container
  if (typeof document !== 'undefined' && container) {
    const { render } = require('hono/jsx/dom')
    render(children, container)
  }
  return null
}

// Hono doesn't have flushSync, provide a passthrough
export function flushSync<R>(fn: () => R): R {
  return fn()
}

// Re-export the runtime identifier
export const RUNTIME = 'hono' as const
export type Runtime = typeof RUNTIME

// Type aliases for compatibility
export type ReactNode = unknown
export type ReactElement = unknown
export type MutableRefObject<T> = { current: T }
export type Ref<T> = ((instance: T | null) => void) | { current: T | null } | null
export type ForwardedRef<T> = Ref<T>
export type ComponentProps<T> = T extends (props: infer P) => unknown ? P : never
export type ComponentPropsWithRef<T> = ComponentProps<T>
export type ComponentPropsWithoutRef<T> = ComponentProps<T>
export type ElementRef<T> = T extends (props: { ref?: infer R }) => unknown ? (R extends { current: infer E } ? E : never) : never
export type PropsWithChildren<P = unknown> = P & { children?: ReactNode }
export type PropsWithoutRef<P> = P
export type FC<P = object> = (props: P) => ReactNode
export type FunctionComponent<P = object> = FC<P>
export type ComponentType<P = object> = FC<P>
export type JSX = {
  Element: unknown
  IntrinsicElements: Record<string, unknown>
}
