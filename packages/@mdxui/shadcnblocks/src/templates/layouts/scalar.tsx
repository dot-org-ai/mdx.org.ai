/**
 * Scalar Layout - SaaS Landing Template
 *
 * Based on shadcnblocks' Scalar template - a complete SaaS landing page
 * with all standard marketing sections.
 *
 * Use case: Full-featured SaaS product landing pages
 */

import * as React from 'react'
import type {
  HeroBlockProps,
  FeaturesBlockProps,
  PricingBlockProps,
  TestimonialsBlockProps,
  CTABlockProps,
  HeaderBlockProps,
  FooterBlockProps,
  StatsBlockProps,
  LogoCloudBlockProps,
} from '../../types'

/**
 * Scalar Layout Props
 *
 * Complete SaaS landing page structure with all major sections:
 * - Header with navigation
 * - Hero with CTA
 * - Logo cloud (social proof)
 * - Features showcase
 * - Stats/metrics
 * - Testimonials
 * - Pricing tiers
 * - FAQ section
 * - Final CTA
 * - Footer
 */
export interface ScalarLayoutProps {
  /** Sticky header with brand and navigation */
  header: HeaderBlockProps

  /** Hero section - main value proposition */
  hero: HeroBlockProps

  /** Logo cloud - trusted by companies (optional) */
  logoCloud?: LogoCloudBlockProps

  /** Features section - product capabilities */
  features: FeaturesBlockProps

  /** Stats section - key metrics (optional) */
  stats?: StatsBlockProps

  /** Testimonials - social proof */
  testimonials: TestimonialsBlockProps

  /** Pricing tiers */
  pricing: PricingBlockProps

  /** FAQ section (optional) */
  faq?: {
    headline?: string
    description?: string
    items: Array<{
      question: string
      answer: string
    }>
  }

  /** Final CTA section */
  cta: CTABlockProps

  /** Footer with links and legal */
  footer: FooterBlockProps
}

/**
 * Scalar Layout Component
 *
 * Renders a complete SaaS landing page with all major sections.
 * This is the most comprehensive template.
 *
 * @example
 * ```tsx
 * <ScalarLayout
 *   header={{
 *     brand: { name: 'Acme SaaS', href: '/' },
 *     navigation: [
 *       { label: 'Features', href: '#features' },
 *       { label: 'Pricing', href: '#pricing' },
 *     ],
 *     actions: [
 *       { label: 'Sign In', href: '/login', variant: 'ghost' },
 *       { label: 'Get Started', href: '/signup', variant: 'primary' },
 *     ],
 *   }}
 *   hero={{
 *     badge: 'New: AI-powered insights',
 *     title: 'Build faster with modern SaaS tools',
 *     description: 'The complete platform for building...',
 *     primaryAction: { label: 'Start Free Trial', href: '/signup' },
 *     secondaryAction: { label: 'View Demo', href: '/demo' },
 *   }}
 *   // ... other sections
 * />
 * ```
 */
export function ScalarLayout({
  header,
  hero,
  logoCloud,
  features,
  stats,
  testimonials,
  pricing,
  faq,
  cta,
  footer,
}: ScalarLayoutProps) {
  return (
    <div data-layout="scalar" data-template="saas-landing" className="min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="banner"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Brand */}
          <a href={header.brand?.href || '/'} className="flex items-center gap-2 font-bold">
            {header.logo}
            <span>{header.brand?.name}</span>
          </a>

          {/* Navigation */}
          <nav className="hidden md:flex md:gap-6" aria-label="Main navigation">
            {header.navigation.map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex gap-3">
            {header.actions?.map((action, i) => (
              <a
                key={i}
                href={action.href}
                className={
                  action.variant === 'primary'
                    ? 'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
                    : action.variant === 'secondary'
                      ? 'rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent'
                      : 'px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
                }
              >
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main role="main">
        {/* Hero */}
        <section aria-label="Hero" className="relative py-20 lg:py-32">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="text-center">
              {hero.badge && (
                <div className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm">
                  {hero.badge}
                </div>
              )}
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                {hero.title}
              </h1>
              {hero.description && (
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-xl">
                  {hero.description}
                </p>
              )}
              {(hero.primaryAction || hero.secondaryAction) && (
                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                  {hero.primaryAction && (
                    <a
                      href={hero.primaryAction.href}
                      className="rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      {hero.primaryAction.label}
                    </a>
                  )}
                  {hero.secondaryAction && (
                    <a
                      href={hero.secondaryAction.href}
                      className="rounded-md border border-input bg-background px-8 py-3 text-base font-medium transition-colors hover:bg-accent"
                    >
                      {hero.secondaryAction.label}
                    </a>
                  )}
                </div>
              )}
              {hero.image && (
                <div className="mt-16">
                  <img
                    src={hero.image.src}
                    alt={hero.image.alt}
                    className="mx-auto rounded-lg border shadow-2xl"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Logo Cloud */}
        {logoCloud && (
          <section aria-label="Trusted by" className="border-y bg-muted/50 py-12">
            <div className="container mx-auto px-4">
              {logoCloud.title && (
                <p className="mb-8 text-center text-sm font-medium text-muted-foreground">
                  {logoCloud.title}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                {logoCloud.logos.map((logo, i) => (
                  <img
                    key={i}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-8 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section aria-label="Features" className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            {features.headline && (
              <div className="mb-16 text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {features.headline}
                </h2>
                {features.description && (
                  <p className="mt-4 text-lg text-muted-foreground">{features.description}</p>
                )}
              </div>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.features.map((feature, i) => (
                <div key={i} className="relative">
                  {feature.icon && <div className="mb-4 text-primary">{feature.icon}</div>}
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <section aria-label="Stats" className="border-y bg-muted/50 py-20">
            <div className="container mx-auto px-4">
              <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4">
                {stats.stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-4xl font-bold">{stat.value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        <section aria-label="Testimonials" className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            {testimonials.headline && (
              <h2 className="mb-16 text-center text-3xl font-bold tracking-tight sm:text-4xl">
                {testimonials.headline}
              </h2>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.testimonials.map((testimonial, i) => (
                <div key={i} className="rounded-lg border bg-card p-6">
                  <p className="text-muted-foreground">"{testimonial.quote}"</p>
                  <div className="mt-4 flex items-center gap-3">
                    {testimonial.author.avatar && (
                      <img
                        src={testimonial.author.avatar}
                        alt={testimonial.author.name}
                        className="h-10 w-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{testimonial.author.name}</p>
                      {testimonial.author.title && (
                        <p className="text-sm text-muted-foreground">
                          {testimonial.author.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section aria-label="Pricing" className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            {pricing.headline && (
              <div className="mb-16 text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {pricing.headline}
                </h2>
                {pricing.description && (
                  <p className="mt-4 text-lg text-muted-foreground">{pricing.description}</p>
                )}
              </div>
            )}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {pricing.tiers.map((tier, i) => (
                <div
                  key={i}
                  className={`relative rounded-lg border p-8 ${tier.featured ? 'border-primary shadow-lg' : ''}`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      {tier.badge}
                    </div>
                  )}
                  <h3 className="text-2xl font-bold">{tier.name}</h3>
                  {tier.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                  )}
                  <p className="mt-6 text-4xl font-bold">
                    {tier.price.monthly}
                    <span className="text-lg font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-8 space-y-3">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <svg
                          className="h-4 w-4 text-primary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={tier.ctaHref || '#'}
                    className={`mt-8 block w-full rounded-md py-3 text-center text-sm font-medium transition-colors ${
                      tier.featured
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-input bg-background hover:bg-accent'
                    }`}
                  >
                    {tier.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        {faq && (
          <section aria-label="FAQ" className="border-t bg-muted/50 py-20 lg:py-32">
            <div className="container mx-auto max-w-3xl px-4">
              {faq.headline && (
                <div className="mb-12 text-center">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {faq.headline}
                  </h2>
                  {faq.description && (
                    <p className="mt-4 text-lg text-muted-foreground">{faq.description}</p>
                  )}
                </div>
              )}
              <div className="space-y-6">
                {faq.items.map((item, i) => (
                  <div key={i} className="rounded-lg border bg-background p-6">
                    <h3 className="font-semibold">{item.question}</h3>
                    <p className="mt-2 text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section aria-label="Call to action" className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {cta.headline}
              </h2>
              {cta.description && (
                <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{cta.description}</p>
              )}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <a
                  href={cta.primaryAction.href}
                  className="rounded-md bg-background px-8 py-3 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-background/90"
                >
                  {cta.primaryAction.label}
                </a>
                {cta.secondaryAction && (
                  <a
                    href={cta.secondaryAction.href}
                    className="rounded-md border border-primary-foreground/20 px-8 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                  >
                    {cta.secondaryAction.label}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 lg:py-16" role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 font-bold">
                {footer.logo}
                <span>{footer.brand?.name}</span>
              </div>
              {footer.brand?.description && (
                <p className="mt-4 text-sm text-muted-foreground">{footer.brand.description}</p>
              )}
            </div>

            {/* Link columns */}
            {footer.columns.map((column, i) => (
              <div key={i}>
                <h4 className="font-semibold">{column.title}</h4>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link, j) => (
                    <li key={j}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer bottom */}
          <div className="mt-12 border-t pt-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-muted-foreground">
                {footer.legal?.copyright || `© ${new Date().getFullYear()} ${footer.brand?.name}. All rights reserved.`}
              </p>
              {footer.legal?.links && (
                <div className="flex gap-6">
                  {footer.legal.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
