/**
 * Quartz Layout
 *
 * Light, minimal style layout translated from Tailark's Quartz theme.
 *
 * ## Design Characteristics
 *
 * - **Background**: White/light gray
 * - **Accent**: Indigo/violet
 * - **Typography**: Clean, sharp sans-serif
 * - **Spacing**: Generous whitespace
 * - **Borders**: Subtle, light borders
 *
 * ## Use Cases
 *
 * - SaaS landing pages
 * - Developer tools
 * - Professional services
 * - B2B products
 */

import * as React from 'react'
import { MarketingLayout } from './marketing'
import type { MarketingLayoutProps } from './marketing'

export interface QuartzLayoutProps extends Omit<MarketingLayoutProps, 'variant'> {
  /** Accent color override (default: indigo) */
  accentColor?: 'indigo' | 'violet' | 'blue' | 'cyan'
}

/**
 * QuartzLayout Component
 *
 * Renders a light, minimal marketing page with clean typography.
 *
 * @example
 * ```tsx
 * <QuartzLayout
 *   header={{
 *     brand: { name: 'DevTools', logo: <Logo /> },
 *     navigation: [
 *       { label: 'Features', href: '#features' },
 *       { label: 'Pricing', href: '#pricing' },
 *     ],
 *   }}
 *   hero={{
 *     headline: 'Ship faster with modern tools',
 *     description: 'Everything you need to build production-ready apps.',
 *     primaryAction: { label: 'Get Started', href: '/signup' },
 *   }}
 *   footer={{
 *     brand: { name: 'DevTools' },
 *     columns: [],
 *   }}
 * />
 * ```
 */
export function QuartzLayout({ accentColor = 'indigo', ...props }: QuartzLayoutProps) {
  return (
    <div data-tailark-style="quartz" data-accent={accentColor}>
      <MarketingLayout {...props} variant="light" />
    </div>
  )
}
