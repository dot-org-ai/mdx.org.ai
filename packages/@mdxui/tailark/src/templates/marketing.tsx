/**
 * Marketing Page Template
 *
 * Complete marketing landing page using Tailark blocks.
 */

import * as React from 'react'
import type {
  TailarkHeroProps,
  TailarkFeaturesProps,
  TailarkTestimonialsProps,
  TailarkPricingProps,
  TailarkFAQProps,
  TailarkFooterProps,
} from '../types'

export interface MarketingTemplateProps {
  /** Header/nav */
  header: {
    logo: React.ReactNode
    navigation: Array<{ label: string; href: string }>
    cta?: { label: string; href: string }
  }
  /** Hero section */
  hero: TailarkHeroProps
  /** Features section */
  features?: TailarkFeaturesProps
  /** Testimonials */
  testimonials?: TailarkTestimonialsProps
  /** Pricing */
  pricing?: TailarkPricingProps
  /** FAQ */
  faq?: TailarkFAQProps
  /** Footer */
  footer: TailarkFooterProps
}

export function MarketingTemplate({
  header,
  hero,
  features,
  testimonials,
  pricing,
  faq,
  footer,
}: MarketingTemplateProps) {
  return (
    <div data-layout="site" className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {header.logo}
          <nav className="hidden md:flex md:items-center md:gap-8">
            {header.navigation.map((item, i) => (
              <a key={i} href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
          {header.cta && (
            <a href={header.cta.href} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {header.cta.label}
            </a>
          )}
        </div>
      </header>

      <main>
        {/* Hero - simplified inline render */}
        <section aria-label="Hero" className="py-20 text-center">
          <div className="container mx-auto max-w-4xl px-4">
            <h1 className="text-4xl font-bold md:text-6xl">{hero.headline}</h1>
            {hero.description && <p className="mt-6 text-lg text-muted-foreground">{hero.description}</p>}
            {hero.primaryCta && (
              <a href={hero.primaryCta.href} className="mt-8 inline-block rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground">
                {hero.primaryCta.text}
              </a>
            )}
          </div>
        </section>

        {/* Features */}
        {features && (
          <section aria-label="Features" className="py-20">
            <div className="container mx-auto px-4">
              {features.title && <h2 className="mb-12 text-center text-3xl font-bold">{features.title}</h2>}
              <div className="grid gap-8 md:grid-cols-3">
                {features.features.map((f, i) => (
                  <div key={i}>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-2 text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        {pricing && (
          <section aria-label="Pricing" className="py-20">
            <div className="container mx-auto px-4">
              {pricing.title && <h2 className="mb-12 text-center text-3xl font-bold">{pricing.title}</h2>}
              <div className="grid gap-8 md:grid-cols-3">
                {pricing.tiers.map((tier, i) => (
                  <div key={i} className={`rounded-xl border p-8 ${tier.featured ? 'border-primary shadow-lg' : ''}`}>
                    <h3 className="font-bold">{tier.name}</h3>
                    <p className="mt-4 text-3xl font-bold">{tier.price.monthly}</p>
                    <a href={tier.ctaHref} className="mt-6 block w-full rounded-lg bg-primary py-2 text-center text-primary-foreground">
                      {tier.cta}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between">
            <span className="font-bold">{footer.brand.name}</span>
            <div className="flex gap-8">
              {footer.columns.map((col, i) => (
                <div key={i}>
                  <h4 className="font-semibold">{col.title}</h4>
                  <ul className="mt-2 space-y-1">
                    {col.links.map((link, j) => (
                      <li key={j}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground">{link.text}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
