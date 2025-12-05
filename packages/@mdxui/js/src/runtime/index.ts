/**
 * Hono JSX DOM Runtime
 *
 * Re-exports from hono/jsx/dom for client-side rendering.
 * Only 2.8KB vs React's 47.8KB!
 *
 * @example Basic usage
 * ```tsx
 * import { render, useState } from '@mdxui/js/runtime'
 *
 * function Counter() {
 *   const [count, setCount] = useState(0)
 *   return (
 *     <button onClick={() => setCount(c => c + 1)}>
 *       Count: {count}
 *     </button>
 *   )
 * }
 *
 * render(<Counter />, document.getElementById('app'))
 * ```
 *
 * @example Hydration (SSR)
 * ```tsx
 * import { hydrate } from '@mdxui/js/runtime'
 *
 * // Hydrate server-rendered HTML
 * hydrate(<App />, document.getElementById('app'))
 * ```
 */

// Re-export render and hydrate
export { render } from 'hono/jsx/dom'

// In hono/jsx/dom, hydrate is equivalent to render
export { render as hydrate } from 'hono/jsx/dom'

// Re-export hooks from hono/jsx
export {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
  useContext,
  createContext,
  memo,
  Fragment,
} from 'hono/jsx'

// Re-export View Transition API helpers (if available)
export { startViewTransition, useViewTransition } from 'hono/jsx/dom'
