/**
 * Background Types
 *
 * Enum of all available animated backgrounds.
 * Maps to the standard MDX hierarchy for consistent usage across components.
 */

export type BackgroundType =
  // Simple CSS backgrounds (from @mdxui/css)
  | 'none'
  | 'dots'
  | 'grid'
  | 'grid-fade'
  | 'radial'
  | 'gradient'
  | 'striped'
  // Animated SVG backgrounds
  | 'waves'
  | 'striped-pattern'
  | 'striped-dashed'
  | 'striped-radial'
  // WebGL backgrounds (requires client-side JS)
  | 'particles'
  | 'light-rays'
  | 'orb'
  | 'shapes'
  | 'pixel-blast'
  | 'ripple-grid'

/**
 * Background categories for organization
 */
export const BACKGROUND_CATEGORIES = {
  /** Pure CSS backgrounds - no JS required */
  css: ['none', 'dots', 'grid', 'grid-fade', 'radial', 'gradient', 'striped'] as const,
  /** SVG-based animated backgrounds - lightweight */
  svg: ['waves', 'striped-pattern', 'striped-dashed', 'striped-radial'] as const,
  /** WebGL backgrounds - requires ogl library */
  webgl: ['particles', 'light-rays', 'orb', 'shapes', 'pixel-blast', 'ripple-grid'] as const,
}

/**
 * Check if a background requires WebGL
 */
export function requiresWebGL(type: BackgroundType): boolean {
  return (BACKGROUND_CATEGORIES.webgl as readonly string[]).includes(type)
}

/**
 * Check if a background is CSS-only
 */
export function isCSSBackground(type: BackgroundType): boolean {
  return (BACKGROUND_CATEGORIES.css as readonly string[]).includes(type)
}
