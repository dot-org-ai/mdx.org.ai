/**
 * Solar Layout
 *
 * One-page website layout based on Tremor's Solar template.
 * Designed for landing pages, marketing sites, and product pages.
 *
 * @see https://github.com/tremorlabs/template-solar
 */

import * as React from 'react'
import { Card, Title, Text } from '@tremor/react'

/**
 * Hero section props
 */
export interface HeroProps {
  /** Main headline */
  headline: string
  /** Subheadline or description */
  subheadline?: string
  /** Call-to-action buttons */
  cta?: React.ReactNode
  /** Hero image or visual */
  media?: React.ReactNode
  /** Background variant */
  variant?: 'default' | 'gradient' | 'image'
  /** Background image URL (when variant='image') */
  backgroundImage?: string
}

/**
 * Feature item
 */
export interface FeatureItem {
  icon?: React.ReactNode
  title: string
  description: string
  link?: {
    href: string
    label: string
  }
}

/**
 * Features section props
 */
export interface FeaturesProps {
  title?: string
  description?: string
  features: FeatureItem[]
  /** Layout variant */
  variant?: 'grid' | 'list' | 'cards'
  /** Number of columns (for grid variant) */
  columns?: 2 | 3 | 4
}

/**
 * Testimonial item
 */
export interface TestimonialItem {
  quote: string
  author: {
    name: string
    title?: string
    company?: string
    avatar?: string
  }
  rating?: number
}

/**
 * Testimonials section props
 */
export interface TestimonialsProps {
  title?: string
  description?: string
  testimonials: TestimonialItem[]
  variant?: 'grid' | 'carousel' | 'featured'
}

/**
 * CTA section props
 */
export interface CTAProps {
  title: string
  description?: string
  actions: React.ReactNode
  variant?: 'default' | 'centered' | 'split'
}

/**
 * Footer link group
 */
export interface FooterLinkGroup {
  title: string
  links: Array<{
    label: string
    href: string
  }>
}

/**
 * Footer props
 */
export interface FooterProps {
  /** Company/site name */
  brand?: string
  /** Brand logo */
  logo?: React.ReactNode
  /** Tagline or description */
  tagline?: string
  /** Link groups */
  linkGroups?: FooterLinkGroup[]
  /** Social links */
  social?: Array<{
    platform: string
    href: string
    icon: React.ReactNode
  }>
  /** Copyright text */
  copyright?: string
  /** Additional footer content */
  children?: React.ReactNode
}

/**
 * Solar Layout Props
 *
 * One-page website layout with semantic sections:
 * - Hero (above the fold)
 * - Features (product highlights)
 * - Testimonials (social proof)
 * - CTA (conversion section)
 * - Footer (navigation and legal)
 */
export interface SolarLayoutProps {
  /** Hero section */
  hero?: HeroProps
  /** Features section */
  features?: FeaturesProps
  /** Testimonials section */
  testimonials?: TestimonialsProps
  /** Call-to-action section */
  cta?: CTAProps
  /** Footer */
  footer?: FooterProps
  /** Additional custom sections */
  sections?: Array<{
    id?: string
    component: React.ReactNode
  }>
  /** Additional children */
  children?: React.ReactNode
}

/**
 * Solar Layout Component
 *
 * Renders a single-page marketing website with:
 * - Hero section with CTA
 * - Features grid
 * - Testimonials
 * - Final CTA
 * - Footer with links
 *
 * Uses semantic HTML5 elements and data attributes:
 * - <section> for each major area
 * - data-layout="solar"
 * - data-region for specific sections
 */
export function SolarLayout({
  hero,
  features,
  testimonials,
  cta,
  footer,
  sections,
  children,
}: SolarLayoutProps) {
  return (
    <div data-layout="solar" className="min-h-screen">
      {/* Hero Section */}
      {hero && (
        <section
          data-region="hero"
          className={`relative ${
            hero.variant === 'gradient'
              ? 'bg-gradient-to-br from-blue-50 to-indigo-100'
              : hero.variant === 'image'
              ? 'bg-cover bg-center'
              : 'bg-background'
          }`}
          style={
            hero.variant === 'image' && hero.backgroundImage
              ? { backgroundImage: `url(${hero.backgroundImage})` }
              : undefined
          }
        >
          <div className="container mx-auto px-6 py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
                  {hero.headline}
                </h1>
                {hero.subheadline && (
                  <p className="text-xl text-muted-foreground mb-8">
                    {hero.subheadline}
                  </p>
                )}
                {hero.cta && <div className="flex gap-4">{hero.cta}</div>}
              </div>
              {hero.media && <div className="flex justify-center">{hero.media}</div>}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {features && (
        <section data-region="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-6">
            {(features.title || features.description) && (
              <div className="text-center mb-12">
                {features.title && (
                  <Title className="text-3xl lg:text-4xl mb-4">
                    {features.title}
                  </Title>
                )}
                {features.description && (
                  <Text className="text-lg max-w-2xl mx-auto">
                    {features.description}
                  </Text>
                )}
              </div>
            )}

            {features.variant === 'list' ? (
              <div className="space-y-8 max-w-3xl mx-auto">
                {features.features.map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    {feature.icon && (
                      <div className="flex-shrink-0 text-primary">
                        {feature.icon}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                      {feature.link && (
                        <a
                          href={feature.link.href}
                          className="text-primary hover:underline mt-2 inline-block"
                        >
                          {feature.link.label} →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : features.variant === 'cards' ? (
              <div
                className={`grid gap-6 ${
                  features.columns === 4
                    ? 'md:grid-cols-2 lg:grid-cols-4'
                    : features.columns === 3
                    ? 'md:grid-cols-2 lg:grid-cols-3'
                    : 'md:grid-cols-2'
                }`}
              >
                {features.features.map((feature, i) => (
                  <Card key={i}>
                    {feature.icon && (
                      <div className="text-primary mb-4">{feature.icon}</div>
                    )}
                    <h3 className="font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                    {feature.link && (
                      <a
                        href={feature.link.href}
                        className="text-primary hover:underline mt-4 inline-block text-sm"
                      >
                        {feature.link.label} →
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div
                className={`grid gap-8 ${
                  features.columns === 4
                    ? 'md:grid-cols-2 lg:grid-cols-4'
                    : features.columns === 3
                    ? 'md:grid-cols-2 lg:grid-cols-3'
                    : 'md:grid-cols-2'
                }`}
              >
                {features.features.map((feature, i) => (
                  <div key={i}>
                    {feature.icon && (
                      <div className="text-primary mb-4">{feature.icon}</div>
                    )}
                    <h3 className="font-semibold text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                    {feature.link && (
                      <a
                        href={feature.link.href}
                        className="text-primary hover:underline mt-2 inline-block"
                      >
                        {feature.link.label} →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials && (
        <section data-region="testimonials" className="py-20">
          <div className="container mx-auto px-6">
            {(testimonials.title || testimonials.description) && (
              <div className="text-center mb-12">
                {testimonials.title && (
                  <Title className="text-3xl lg:text-4xl mb-4">
                    {testimonials.title}
                  </Title>
                )}
                {testimonials.description && (
                  <Text className="text-lg max-w-2xl mx-auto">
                    {testimonials.description}
                  </Text>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.testimonials.map((testimonial, i) => (
                <Card key={i}>
                  <div className="flex flex-col h-full">
                    {testimonial.rating && (
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <span
                            key={j}
                            className={
                              j < testimonial.rating!
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                    <blockquote className="flex-1 text-muted-foreground mb-6">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                      {testimonial.author.avatar && (
                        <img
                          src={testimonial.author.avatar}
                          alt={testimonial.author.name}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-semibold">
                          {testimonial.author.name}
                        </p>
                        {(testimonial.author.title ||
                          testimonial.author.company) && (
                          <p className="text-sm text-muted-foreground">
                            {testimonial.author.title}
                            {testimonial.author.title &&
                              testimonial.author.company &&
                              ', '}
                            {testimonial.author.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Additional Custom Sections */}
      {sections && sections.length > 0 && (
        <>
          {sections.map((section, i) => (
            <section key={i} id={section.id} className="py-20">
              {section.component}
            </section>
          ))}
        </>
      )}

      {/* CTA Section */}
      {cta && (
        <section data-region="cta" className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-6">
            <div
              className={
                cta.variant === 'centered'
                  ? 'text-center max-w-3xl mx-auto'
                  : cta.variant === 'split'
                  ? 'grid lg:grid-cols-2 gap-8 items-center'
                  : ''
              }
            >
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                  {cta.title}
                </h2>
                {cta.description && (
                  <p className="text-lg opacity-90 mb-8">{cta.description}</p>
                )}
              </div>
              <div
                className={
                  cta.variant === 'centered'
                    ? 'flex justify-center gap-4'
                    : cta.variant === 'split'
                    ? 'flex justify-end gap-4'
                    : 'flex gap-4'
                }
              >
                {cta.actions}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      {footer && (
        <footer data-region="footer" className="border-t bg-muted/30">
          <div className="container mx-auto px-6 py-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
              {/* Brand Column */}
              <div className="lg:col-span-2">
                {footer.logo && <div className="mb-4">{footer.logo}</div>}
                {footer.brand && !footer.logo && (
                  <p className="font-bold text-lg mb-4">{footer.brand}</p>
                )}
                {footer.tagline && (
                  <p className="text-muted-foreground mb-4">{footer.tagline}</p>
                )}
                {footer.social && (
                  <div className="flex gap-4">
                    {footer.social.map((social, i) => (
                      <a
                        key={i}
                        href={social.href}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={social.platform}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Link Groups */}
              {footer.linkGroups?.map((group, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-4">{group.title}</h3>
                  <ul className="space-y-2">
                    {group.links.map((link, j) => (
                      <li key={j}>
                        <a
                          href={link.href}
                          className="text-muted-foreground hover:text-foreground text-sm"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Copyright */}
            {footer.copyright && (
              <div className="border-t pt-8">
                <p className="text-sm text-muted-foreground text-center">
                  {footer.copyright}
                </p>
              </div>
            )}

            {/* Additional Footer Content */}
            {footer.children}
          </div>
        </footer>
      )}

      {/* Additional Children */}
      {children}
    </div>
  )
}
