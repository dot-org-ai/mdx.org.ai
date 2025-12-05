/**
 * Marketing Layout
 *
 * Full marketing landing page layout translated from Tailark templates.
 * Provides unified props interface for conversion-optimized landing pages.
 *
 * ## Original: Tailark Marketing Template
 *
 * This layout translates Tailark's marketing template to our unified system.
 *
 * ## Props Mapping
 *
 * | Tailark | Unified | Notes |
 * |---------|---------|-------|
 * | header | header | Nav and branding |
 * | hero | hero | Main headline section |
 * | features | features | Feature grid |
 * | integrations | integrations | Logo grid |
 * | testimonials | testimonials | Social proof |
 * | pricing | pricing | Pricing tiers |
 * | faq | faq | FAQ accordion |
 * | footer | footer | Site footer |
 */

import * as React from 'react'

// Shared types
export interface BrandProps {
  name: string
  logo?: React.ReactNode
  href?: string
  description?: string
}

export interface NavigationItem {
  label: string
  href: string
}

export interface ActionProps {
  label: string
  href: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

export interface HeaderProps {
  brand: BrandProps
  navigation: NavigationItem[]
  actions?: ActionProps[]
}

export interface HeroProps {
  /** Announcement badge */
  announcement?: {
    text: string
    href?: string
  }
  /** Main headline */
  headline: string
  /** Supporting description */
  description?: string
  /** Primary CTA */
  primaryAction?: ActionProps
  /** Secondary CTA */
  secondaryAction?: ActionProps
  /** Trusted by logos */
  trustedBy?: Array<{
    name: string
    logo: React.ReactNode
  }>
  /** Hero image or media */
  media?: React.ReactNode
}

export interface FeatureItem {
  icon?: React.ReactNode
  title: string
  description: string
}

export interface FeaturesProps {
  headline?: string
  description?: string
  features: FeatureItem[]
  layout?: 'grid' | 'list' | 'alternating'
}

export interface IntegrationsProps {
  headline?: string
  description?: string
  integrations: Array<{
    name: string
    logo: React.ReactNode
    category?: string
  }>
}

export interface TestimonialItem {
  quote: string
  author: {
    name: string
    title?: string
    company?: string
    avatar?: string
  }
}

export interface TestimonialsProps {
  headline?: string
  testimonials: TestimonialItem[]
}

export interface PricingTier {
  name: string
  description?: string
  price: {
    monthly: string
    yearly?: string
  }
  features: string[]
  cta: string
  ctaHref?: string
  featured?: boolean
}

export interface PricingProps {
  headline?: string
  description?: string
  tiers: PricingTier[]
  billingToggle?: boolean
}

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQProps {
  headline?: string
  items: FAQItem[]
}

export interface FooterColumn {
  title: string
  links: Array<{
    text: string
    href: string
  }>
}

export interface FooterProps {
  brand: BrandProps
  columns: FooterColumn[]
  social?: Array<{
    platform: string
    href: string
    icon?: React.ReactNode
  }>
  legal?: {
    copyright?: string
    links?: Array<{ text: string; href: string }>
  }
}

export interface MarketingLayoutProps {
  header: HeaderProps
  hero: HeroProps
  features?: FeaturesProps
  integrations?: IntegrationsProps
  testimonials?: TestimonialsProps
  pricing?: PricingProps
  faq?: FAQProps
  cta?: {
    headline: string
    description?: string
    action: ActionProps
  }
  footer: FooterProps
  /** Theme variant */
  variant?: 'light' | 'dark' | 'auto'
}

/**
 * MarketingLayout Component
 *
 * Renders a complete marketing landing page with all standard sections.
 */
export function MarketingLayout({
  header,
  hero,
  features,
  integrations,
  testimonials,
  pricing,
  faq,
  cta,
  footer,
  variant = 'light',
}: MarketingLayoutProps) {
  return (
    <div data-layout="marketing" data-variant={variant}>
      {/* Header */}
      <header data-marketing="header">
        <div data-marketing="header-inner">
          <a href={header.brand.href || '/'} data-marketing="brand">
            {header.brand.logo || header.brand.name}
          </a>

          <nav data-marketing="nav" aria-label="Main navigation">
            {header.navigation.map((item, i) => (
              <a key={i} href={item.href} data-marketing="nav-link">
                {item.label}
              </a>
            ))}
          </nav>

          {header.actions && (
            <div data-marketing="actions">
              {header.actions.map((action, i) => (
                <a key={i} href={action.href} data-marketing="action" data-variant={action.variant}>
                  {action.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero */}
        <section data-marketing="hero" aria-label="Hero">
          <div data-marketing="hero-inner">
            {hero.announcement && (
              <div data-marketing="announcement">
                {hero.announcement.href ? (
                  <a href={hero.announcement.href}>{hero.announcement.text}</a>
                ) : (
                  hero.announcement.text
                )}
              </div>
            )}

            <h1 data-marketing="headline">{hero.headline}</h1>

            {hero.description && <p data-marketing="description">{hero.description}</p>}

            <div data-marketing="hero-actions">
              {hero.primaryAction && (
                <a href={hero.primaryAction.href} data-marketing="action" data-variant="primary">
                  {hero.primaryAction.label}
                </a>
              )}
              {hero.secondaryAction && (
                <a href={hero.secondaryAction.href} data-marketing="action" data-variant="secondary">
                  {hero.secondaryAction.label}
                </a>
              )}
            </div>

            {hero.trustedBy && hero.trustedBy.length > 0 && (
              <div data-marketing="trusted-by">
                <span>Trusted by</span>
                <div data-marketing="logo-grid">
                  {hero.trustedBy.map((company, i) => (
                    <div key={i} data-marketing="logo" aria-label={company.name}>
                      {company.logo}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hero.media && <div data-marketing="hero-media">{hero.media}</div>}
          </div>
        </section>

        {/* Features */}
        {features && (
          <section data-marketing="features" aria-label="Features">
            <div data-marketing="section-inner">
              {features.headline && <h2 data-marketing="section-headline">{features.headline}</h2>}
              {features.description && <p data-marketing="section-description">{features.description}</p>}
              <div data-marketing="feature-grid" data-layout={features.layout || 'grid'}>
                {features.features.map((feature, i) => (
                  <div key={i} data-marketing="feature-item">
                    {feature.icon && <div data-marketing="feature-icon">{feature.icon}</div>}
                    <h3 data-marketing="feature-title">{feature.title}</h3>
                    <p data-marketing="feature-description">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Integrations */}
        {integrations && (
          <section data-marketing="integrations" aria-label="Integrations">
            <div data-marketing="section-inner">
              {integrations.headline && <h2 data-marketing="section-headline">{integrations.headline}</h2>}
              {integrations.description && <p data-marketing="section-description">{integrations.description}</p>}
              <div data-marketing="integration-grid">
                {integrations.integrations.map((integration, i) => (
                  <div key={i} data-marketing="integration-item" data-category={integration.category}>
                    {integration.logo}
                    <span>{integration.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {testimonials && (
          <section data-marketing="testimonials" aria-label="Testimonials">
            <div data-marketing="section-inner">
              {testimonials.headline && <h2 data-marketing="section-headline">{testimonials.headline}</h2>}
              <div data-marketing="testimonial-grid">
                {testimonials.testimonials.map((testimonial, i) => (
                  <blockquote key={i} data-marketing="testimonial-item">
                    <p data-marketing="testimonial-quote">{testimonial.quote}</p>
                    <footer data-marketing="testimonial-author">
                      {testimonial.author.avatar && (
                        <img src={testimonial.author.avatar} alt="" data-marketing="author-avatar" />
                      )}
                      <div>
                        <cite data-marketing="author-name">{testimonial.author.name}</cite>
                        {testimonial.author.title && (
                          <span data-marketing="author-title">
                            {testimonial.author.title}
                            {testimonial.author.company && ` at ${testimonial.author.company}`}
                          </span>
                        )}
                      </div>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pricing */}
        {pricing && (
          <section data-marketing="pricing" aria-label="Pricing">
            <div data-marketing="section-inner">
              {pricing.headline && <h2 data-marketing="section-headline">{pricing.headline}</h2>}
              {pricing.description && <p data-marketing="section-description">{pricing.description}</p>}
              <div data-marketing="pricing-grid">
                {pricing.tiers.map((tier, i) => (
                  <div key={i} data-marketing="pricing-tier" data-featured={tier.featured}>
                    <h3 data-marketing="tier-name">{tier.name}</h3>
                    {tier.description && <p data-marketing="tier-description">{tier.description}</p>}
                    <div data-marketing="tier-price">{tier.price.monthly}</div>
                    <ul data-marketing="tier-features">
                      {tier.features.map((feature, j) => (
                        <li key={j}>{feature}</li>
                      ))}
                    </ul>
                    <a href={tier.ctaHref || '#'} data-marketing="tier-cta" data-featured={tier.featured}>
                      {tier.cta}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        {faq && (
          <section data-marketing="faq" aria-label="Frequently Asked Questions">
            <div data-marketing="section-inner">
              {faq.headline && <h2 data-marketing="section-headline">{faq.headline}</h2>}
              <div data-marketing="faq-list">
                {faq.items.map((item, i) => (
                  <details key={i} data-marketing="faq-item">
                    <summary data-marketing="faq-question">{item.question}</summary>
                    <p data-marketing="faq-answer">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        {cta && (
          <section data-marketing="cta" aria-label="Call to Action">
            <div data-marketing="section-inner">
              <h2 data-marketing="cta-headline">{cta.headline}</h2>
              {cta.description && <p data-marketing="cta-description">{cta.description}</p>}
              <a href={cta.action.href} data-marketing="action" data-variant="primary">
                {cta.action.label}
              </a>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer data-marketing="footer">
        <div data-marketing="footer-inner">
          <div data-marketing="footer-brand">
            {footer.brand.logo || footer.brand.name}
            {footer.brand.description && <p>{footer.brand.description}</p>}
          </div>

          <div data-marketing="footer-columns">
            {footer.columns.map((column, i) => (
              <div key={i} data-marketing="footer-column">
                <h4>{column.title}</h4>
                <ul>
                  {column.links.map((link, j) => (
                    <li key={j}>
                      <a href={link.href}>{link.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {footer.social && (
            <div data-marketing="footer-social">
              {footer.social.map((item, i) => (
                <a key={i} href={item.href} aria-label={item.platform}>
                  {item.icon || item.platform}
                </a>
              ))}
            </div>
          )}

          {footer.legal && (
            <div data-marketing="footer-legal">
              {footer.legal.copyright && <span>{footer.legal.copyright}</span>}
              {footer.legal.links && (
                <nav>
                  {footer.legal.links.map((link, i) => (
                    <a key={i} href={link.href}>
                      {link.text}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
