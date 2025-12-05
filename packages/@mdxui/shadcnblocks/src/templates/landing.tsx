/**
 * Landing Page Template
 *
 * A complete landing page using ShadcnBlocks components.
 * Maps to SiteLayout from @mdxui/html.
 *
 * This is now a re-export of ScalarLayout for backward compatibility.
 * Use ScalarLayout directly from './layouts/scalar' for new code.
 */

import * as React from 'react'
import { ScalarLayout } from './layouts/scalar'
import type { ScalarLayoutProps } from './layouts/scalar'

/**
 * @deprecated Use ScalarLayoutProps from './layouts/scalar' instead
 */
export interface LandingPageProps extends ScalarLayoutProps {}

/**
 * LandingPage Template
 *
 * Composes header, hero, features, testimonials, pricing, CTA, and footer
 * into a complete landing page layout.
 *
 * @deprecated Use ScalarLayout from './layouts/scalar' instead
 *
 * @example
 * ```tsx
 * <LandingPage
 *   header={{
 *     brand: { name: 'Acme', href: '/' },
 *     navigation: [{ label: 'Features', href: '#features' }],
 *   }}
 *   hero={{
 *     title: 'Build faster with blocks',
 *     description: 'Copy-paste components for modern web apps',
 *     primaryAction: { label: 'Get Started', href: '/signup' },
 *   }}
 *   footer={{
 *     brand: { name: 'Acme', description: 'Making the web better' },
 *     columns: [...],
 *   }}
 * />
 * ```
 */
export function LandingPage(props: LandingPageProps) {
  return <ScalarLayout {...props} />
}
