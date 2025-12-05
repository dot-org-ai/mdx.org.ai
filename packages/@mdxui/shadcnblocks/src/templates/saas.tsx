/**
 * SaaS Template
 *
 * A complete SaaS marketing page template.
 *
 * This is now a wrapper around SonicLayout for backward compatibility.
 * Use SonicLayout directly from './layouts/sonic' for new code.
 */

import * as React from 'react'
import { SonicLayout } from './layouts/sonic'
import type { DemoProps } from './layouts/sonic'

export interface SaaSTemplateProps {
  /** Brand name */
  name: string
  /** Tagline */
  tagline?: string
  /** Main headline */
  headline: string
  /** Description */
  description?: string
  /** Primary CTA */
  cta: {
    label: string
    href: string
  }
  /** Demo video/image */
  demo?: {
    type: 'image' | 'video'
    src: string
  }
  /** Features list */
  features?: Array<{
    icon?: React.ReactNode
    title: string
    description: string
  }>
  /** Pricing tiers */
  pricing?: Array<{
    name: string
    price: string
    features: string[]
    cta: string
  }>
}

/**
 * SaaS landing page template
 *
 * Optimized for SaaS product marketing with hero, features, and pricing.
 *
 * @deprecated Use SonicLayout from './layouts/sonic' for more features
 */
export function SaaSTemplate({
  name,
  tagline,
  headline,
  description,
  cta,
  demo,
  features,
  pricing,
}: SaaSTemplateProps) {
  // Convert SaaSTemplateProps to SonicLayoutProps
  const demoProps: DemoProps | undefined = demo
    ? {
        type: demo.type === 'image' ? 'image' : 'video',
        image: demo.type === 'image' ? { src: demo.src, alt: 'Product demo' } : undefined,
        video: demo.type === 'video' ? { src: demo.src, autoplay: true } : undefined,
      }
    : undefined

  return (
    <SonicLayout
      header={{
        brand: { name, href: '/' },
        navigation: [],
        actions: [{ label: cta.label, href: cta.href, variant: 'primary' }],
      }}
      hero={{
        badge: tagline,
        title: headline,
        description,
        primaryAction: cta,
        demo: demoProps,
      }}
      features={{
        headline: 'Features',
        features: features || [],
      }}
      pricing={
        pricing
          ? {
              headline: 'Pricing',
              tiers: pricing.map((tier) => ({
                name: tier.name,
                price: { monthly: tier.price },
                features: tier.features,
                cta: tier.cta,
              })),
            }
          : undefined
      }
      footer={{
        brand: { name },
        columns: [],
        legal: {
          copyright: `© ${new Date().getFullYear()} ${name}. All rights reserved.`,
        },
      }}
    />
  )
}
