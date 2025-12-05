/**
 * @mdxui/js - Lightweight Client-Side Interactivity
 *
 * Uses Hono JSX DOM (2.8KB) for minimal bundle size.
 *
 * ## Usage
 *
 * ### NPM Package (SSR/Node)
 * ```tsx
 * import { Counter, ThemeToggle } from '@mdxui/js/components'
 * import { render } from '@mdxui/js/runtime'
 * ```
 *
 * ### Browser Bundles (Selective Hydration)
 * ```html
 * <!-- Theme script (inline to prevent FOUC) -->
 * <script src="https://js.mdxui.org/theme?theme=auto"></script>
 *
 * <!-- Selective hydration (only loads specified components) -->
 * <div data-hydrate="Counter" data-props='{"initial":5}'></div>
 * <div data-hydrate="ThemeToggle"></div>
 *
 * <script src="https://js.mdxui.org/hydrate?components=Counter,ThemeToggle"></script>
 * ```
 *
 * ## Architecture
 *
 * - **Runtime**: Hono JSX DOM (2.8KB) - Re-exported from hono/jsx/dom
 * - **Components**: Individual bundles for tree-shaking
 * - **Hydration**: Selective loading via data-hydrate attributes
 * - **Theme**: System preference detection with localStorage sync
 *
 * @packageDocumentation
 */

// Re-export everything for npm package consumers
export * from './runtime'
export * from './components'
export * from './hooks'

// Re-export worker utilities (for advanced usage)
export { generateHydrateScript, generateInlineHydrateScript } from './worker/hydrate'
export { generateThemeScript, generateInlineThemeScript, generateThemeToggleSnippet } from './worker/theme'
