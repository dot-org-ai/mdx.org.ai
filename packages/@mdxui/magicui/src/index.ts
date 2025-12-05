/**
 * @mdxui/magicui - Animated UI Components
 *
 * Beautiful, animated React components for hero sections, landing pages,
 * and interactive UIs. Inspired by MagicUI.
 *
 * @example Backgrounds
 * ```tsx
 * import { Waves, StripedPattern } from '@mdxui/magicui/backgrounds'
 *
 * <section style={{ position: 'relative' }}>
 *   <Waves />
 *   <h1>Hero Content</h1>
 * </section>
 * ```
 *
 * @example Background Types
 * ```tsx
 * import { BackgroundType, requiresWebGL } from '@mdxui/magicui'
 *
 * const bg: BackgroundType = 'waves'
 * if (requiresWebGL(bg)) {
 *   // Load WebGL dependencies
 * }
 * ```
 */

// Types
export * from './backgrounds/types'

// SVG Backgrounds (lightweight, no dependencies)
export { Waves, type WavesProps } from './backgrounds/Waves'
export { StripedPattern, type StripedPatternProps } from './backgrounds/StripedPattern'

// Re-export submodules
export * as backgrounds from './backgrounds'
export * as text from './text'
export * as effects from './effects'
