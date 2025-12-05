/**
 * Animated Backgrounds
 *
 * Collection of animated background components for hero sections and landing pages.
 *
 * Categories:
 * - SVG: Lightweight, works everywhere (Waves, StripedPattern)
 * - WebGL: Rich animations, requires ogl (Particles, LightRays, Orb, etc.)
 */

export * from './types'
export * from './Waves'
export * from './StripedPattern'

// WebGL components - exported separately to allow tree-shaking
// These require the 'ogl' peer dependency
// export * from './Particles'
// export * from './LightRays'
// export * from './Orb'
// export * from './Shapes'
// export * from './PixelBlast'
// export * from './RippleGrid'
