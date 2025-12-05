/**
 * Sonic Layout - Product Launch Template
 *
 * Based on shadcnblocks' Sonic template - focused on product launches
 * with emphasis on hero, demo, and social proof.
 *
 * Use case: Product launches, new feature announcements, demo-first pages
 */

import * as React from 'react'
import type {
  HeroBlockProps,
  FeaturesBlockProps,
  PricingBlockProps,
  TestimonialsBlockProps,
  LogoCloudBlockProps,
  HeaderBlockProps,
  FooterBlockProps,
} from '../../types'

/**
 * Demo Props
 *
 * Product demo section with video, screenshots, or interactive preview
 */
export interface DemoProps {
  /** Demo type */
  type: 'video' | 'image' | 'interactive'
  /** Video source (if type === 'video') */
  video?: {
    src: string
    poster?: string
    autoplay?: boolean
  }
  /** Image source (if type === 'image') */
  image?: {
    src: string
    alt: string
  }
  /** Interactive iframe (if type === 'interactive') */
  iframe?: {
    src: string
    title: string
  }
  /** Demo caption */
  caption?: string
}

/**
 * Sonic Layout Props
 *
 * Product launch structure with focus on:
 * - Hero with strong CTA
 * - Prominent product demo
 * - Social proof (logos + testimonials)
 * - Key features
 * - Simple pricing
 */
export interface SonicLayoutProps {
  /** Minimal header (less navigation, more focus on CTA) */
  header: HeaderBlockProps

  /** Hero section with product demo emphasis */
  hero: HeroBlockProps & {
    /** Integrated demo in hero */
    demo?: DemoProps
  }

  /** Logo cloud - social proof right after hero */
  logoCloud?: LogoCloudBlockProps

  /** Key features - focused on top 3-6 benefits */
  features: FeaturesBlockProps

  /** Social proof section */
  social?: {
    /** Customer logos */
    logos?: LogoCloudBlockProps
    /** Customer testimonials */
    testimonials: TestimonialsBlockProps
  }

  /** Simple pricing (1-3 tiers) */
  pricing?: PricingBlockProps

  /** Minimal footer */
  footer: FooterBlockProps
}

/**
 * Sonic Layout Component
 *
 * Renders a product launch page optimized for demos and conversion.
 * Simpler than Scalar, more focused on a single product or feature.
 *
 * @example
 * ```tsx
 * <SonicLayout
 *   header={{
 *     brand: { name: 'ProductName', href: '/' },
 *     navigation: [{ label: 'Demo', href: '#demo' }],
 *     actions: [{ label: 'Get Early Access', href: '/signup', variant: 'primary' }],
 *   }}
 *   hero={{
 *     badge: 'Launching Soon',
 *     title: 'The future of productivity',
 *     description: 'Experience the next generation...',
 *     primaryAction: { label: 'Request Access', href: '/signup' },
 *     demo: {
 *       type: 'video',
 *       video: { src: '/demo.mp4', autoplay: true },
 *     },
 *   }}
 *   // ... other sections
 * />
 * ```
 */
export function SonicLayout({
  header,
  hero,
  logoCloud,
  features,
  social,
  pricing,
  footer,
}: SonicLayoutProps) {
  return (
    <div data-layout="sonic" data-template="product-launch" className="min-h-screen">
      {/* Minimal Header */}
      <header
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm"
        role="banner"
      >
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Brand */}
          <a href={header.brand?.href || '/'} className="flex items-center gap-2 font-bold">
            {header.logo}
            <span>{header.brand?.name}</span>
          </a>

          {/* Minimal navigation */}
          <nav className="hidden md:flex md:gap-4" aria-label="Main navigation">
            {header.navigation.slice(0, 3).map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Primary CTA */}
          {header.actions?.[0] && (
            <a
              href={header.actions[0].href}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {header.actions[0].label}
            </a>
          )}
        </div>
      </header>

      {/* Main content */}
      <main role="main">
        {/* Hero with Demo */}
        <section aria-label="Hero" className="relative overflow-hidden py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center">
              {hero.badge && (
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                  {hero.badge}
                </div>
              )}
              <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                {hero.title}
              </h1>
              {hero.description && (
                <p className="mx-auto mt-6 max-w-2xl text-xl text-muted-foreground">
                  {hero.description}
                </p>
              )}
              {hero.primaryAction && (
                <div className="mt-10">
                  <a
                    href={hero.primaryAction.href}
                    className="inline-flex rounded-md bg-primary px-10 py-4 text-base font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
                  >
                    {hero.primaryAction.label}
                  </a>
                </div>
              )}
            </div>

            {/* Demo */}
            {hero.demo && (
              <div className="mt-16 lg:mt-24">
                <div className="relative mx-auto max-w-5xl">
                  {hero.demo.type === 'video' && hero.demo.video && (
                    <video
                      src={hero.demo.video.src}
                      poster={hero.demo.video.poster}
                      autoPlay={hero.demo.video.autoplay}
                      loop
                      muted
                      className="w-full rounded-lg border shadow-2xl"
                    />
                  )}
                  {hero.demo.type === 'image' && hero.demo.image && (
                    <img
                      src={hero.demo.image.src}
                      alt={hero.demo.image.alt}
                      className="w-full rounded-lg border shadow-2xl"
                    />
                  )}
                  {hero.demo.type === 'interactive' && hero.demo.iframe && (
                    <iframe
                      src={hero.demo.iframe.src}
                      title={hero.demo.iframe.title}
                      className="aspect-video w-full rounded-lg border shadow-2xl"
                    />
                  )}
                  {hero.demo.caption && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      {hero.demo.caption}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Logo Cloud - Social Proof */}
        {logoCloud && (
          <section aria-label="Trusted by" className="border-y py-12">
            <div className="container mx-auto px-4">
              <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {logoCloud.title || 'Trusted by leading companies'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
                {logoCloud.logos.map((logo, i) => (
                  <img
                    key={i}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-8 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features - Top Benefits */}
        <section aria-label="Features" className="py-20 lg:py-32">
          <div className="container mx-auto px-4">
            {features.headline && (
              <div className="mb-16 text-center">
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  {features.headline}
                </h2>
                {features.description && (
                  <p className="mt-4 text-xl text-muted-foreground">{features.description}</p>
                )}
              </div>
            )}
            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
              {features.features.map((feature, i) => (
                <div key={i} className="text-center">
                  {feature.icon && (
                    <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center text-primary">
                      {feature.icon}
                    </div>
                  )}
                  <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof - Testimonials */}
        {social?.testimonials && (
          <section aria-label="What people are saying" className="bg-muted/50 py-20 lg:py-32">
            <div className="container mx-auto px-4">
              {social.testimonials.headline && (
                <h2 className="mb-16 text-center text-4xl font-bold tracking-tight sm:text-5xl">
                  {social.testimonials.headline}
                </h2>
              )}
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {social.testimonials.testimonials.slice(0, 6).map((testimonial, i) => (
                  <div key={i} className="rounded-lg border bg-card p-8">
                    {testimonial.rating && (
                      <div className="mb-4 flex gap-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <svg
                            key={j}
                            className={`h-5 w-5 ${j < testimonial.rating! ? 'text-yellow-500' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    )}
                    <p className="mb-6 text-muted-foreground">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-3">
                      {testimonial.author.avatar && (
                        <img
                          src={testimonial.author.avatar}
                          alt={testimonial.author.name}
                          className="h-12 w-12 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-semibold">{testimonial.author.name}</p>
                        {testimonial.author.company && (
                          <p className="text-sm text-muted-foreground">
                            {testimonial.author.title} at {testimonial.author.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing - Simple */}
        {pricing && (
          <section aria-label="Pricing" className="py-20 lg:py-32">
            <div className="container mx-auto px-4">
              {pricing.headline && (
                <div className="mb-16 text-center">
                  <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {pricing.headline}
                  </h2>
                  {pricing.description && (
                    <p className="mt-4 text-xl text-muted-foreground">{pricing.description}</p>
                  )}
                </div>
              )}
              <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
                {pricing.tiers.slice(0, 3).map((tier, i) => (
                  <div
                    key={i}
                    className={`relative rounded-lg border p-8 ${
                      tier.featured
                        ? 'border-primary bg-primary/5 shadow-lg ring-1 ring-primary'
                        : 'bg-background'
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                        {tier.badge}
                      </div>
                    )}
                    <h3 className="text-2xl font-bold">{tier.name}</h3>
                    <p className="mt-8 flex items-baseline gap-1">
                      <span className="text-5xl font-bold">{tier.price.monthly}</span>
                      <span className="text-muted-foreground">/month</span>
                    </p>
                    <ul className="mt-8 space-y-4">
                      {tier.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm">
                          <svg
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
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
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t py-8" role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2 font-bold">
              {footer.logo}
              <span>{footer.brand?.name}</span>
            </div>

            {/* Quick links */}
            <div className="flex gap-6">
              {footer.columns
                .flatMap((col) => col.links)
                .slice(0, 4)
                .map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground">
              {footer.legal?.copyright || `© ${new Date().getFullYear()} ${footer.brand?.name}`}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
