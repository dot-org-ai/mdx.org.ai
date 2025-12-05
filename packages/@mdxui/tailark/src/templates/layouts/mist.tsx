/**
 * Mist Layout
 *
 * Soft, muted style layout translated from Tailark's Mist theme.
 *
 * ## Design Characteristics
 *
 * - **Background**: Soft gray, off-white
 * - **Accent**: Teal/emerald
 * - **Typography**: Soft, rounded (Inter, SF Pro)
 * - **Borders**: Rounded corners, soft shadows
 * - **Effects**: Subtle hover transitions
 *
 * ## Use Cases
 *
 * - Health & wellness apps
 * - Productivity tools
 * - Note-taking apps
 * - Collaboration platforms
 * - Education products
 */

import * as React from 'react'
import { MarketingLayout } from './marketing'
import type { MarketingLayoutProps } from './marketing'

export interface MistLayoutProps extends Omit<MarketingLayoutProps, 'variant'> {
  /** Accent color (default: teal) */
  accentColor?: 'teal' | 'emerald' | 'sky' | 'rose'
  /** Background warmth */
  warmth?: 'cool' | 'neutral' | 'warm'
}

/**
 * MistLayout Component
 *
 * Renders a soft, muted marketing page with rounded elements.
 *
 * @example
 * ```tsx
 * <MistLayout
 *   accentColor="teal"
 *   warmth="neutral"
 *   header={{
 *     brand: { name: 'Mindful', logo: <Logo /> },
 *     navigation: [
 *       { label: 'Features', href: '#features' },
 *       { label: 'Pricing', href: '#pricing' },
 *     ],
 *   }}
 *   hero={{
 *     headline: 'Focus on what matters',
 *     description: 'A calm space for your thoughts.',
 *     primaryAction: { label: 'Try Free', href: '/signup' },
 *   }}
 *   footer={{
 *     brand: { name: 'Mindful' },
 *     columns: [],
 *   }}
 * />
 * ```
 */
export function MistLayout({ accentColor = 'teal', warmth = 'neutral', ...props }: MistLayoutProps) {
  return (
    <div data-tailark-style="mist" data-accent={accentColor} data-warmth={warmth}>
      <MarketingLayout {...props} variant="light" />
    </div>
  )
}
