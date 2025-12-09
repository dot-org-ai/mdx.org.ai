/**
 * @mdxui/jsx/react - React runtime exports
 *
 * Re-exports React hooks and utilities for use in @mdxui components.
 * This is the default runtime used when no specific runtime is configured.
 */

// Core React exports
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
  Children,
  Fragment,
  // Types
  type ReactNode,
  type ReactElement,
  type RefObject,
  type MutableRefObject,
  type Ref,
  type ForwardedRef,
  type ComponentProps,
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type PropsWithChildren,
  type PropsWithoutRef,
  type FC,
  type FunctionComponent,
  type ComponentType,
  type JSX,
} from 'react'

export { createPortal, flushSync } from 'react-dom'

// Re-export the runtime identifier
export const RUNTIME = 'react' as const
export type Runtime = typeof RUNTIME
