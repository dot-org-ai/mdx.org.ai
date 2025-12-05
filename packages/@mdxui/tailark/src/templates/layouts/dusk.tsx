/**
 * Dusk Layout
 *
 * Dark, bold style layout translated from Tailark's Dusk theme.
 *
 * ## Design Characteristics
 *
 * - **Background**: Dark gray/black
 * - **Accent**: Purple to pink gradient
 * - **Typography**: Bold, impactful headings
 * - **Effects**: Subtle glow effects, gradient borders
 * - **Contrast**: High contrast for readability
 *
 * ## Use Cases
 *
 * - AI/ML products
 * - Gaming platforms
 * - Creative tools
 * - Consumer apps
 * - Fintech products
 */

import * as React from 'react'
import { MarketingLayout } from './marketing'
import type { MarketingLayoutProps } from './marketing'

export interface DuskLayoutProps extends Omit<MarketingLayoutProps, 'variant'> {
  /** Gradient preset (default: purple-pink) */
  gradient?: 'purple-pink' | 'blue-purple' | 'green-cyan' | 'orange-red'
  /** Enable glow effects */
  glow?: boolean
}

/**
 * DuskLayout Component
 *
 * Renders a dark, bold marketing page with gradient accents.
 *
 * @example
 * ```tsx
 * <DuskLayout
 *   gradient="purple-pink"
 *   glow
 *   header={{
 *     brand: { name: 'NeuralAI', logo: <Logo /> },
 *     navigation: [
 *       { label: 'Features', href: '#features' },
 *       { label: 'Pricing', href: '#pricing' },
 *     ],
 *   }}
 *   hero={{
 *     headline: 'The future of AI is here',
 *     description: 'Unlock the power of machine learning.',
 *     primaryAction: { label: 'Start Free', href: '/signup' },
 *   }}
 *   footer={{
 *     brand: { name: 'NeuralAI' },
 *     columns: [],
 *   }}
 * />
 * ```
 */
export function DuskLayout({ gradient = 'purple-pink', glow = true, ...props }: DuskLayoutProps) {
  return (
    <div data-tailark-style="dusk" data-gradient={gradient} data-glow={glow}>
      <MarketingLayout {...props} variant="dark" />
    </div>
  )
}
