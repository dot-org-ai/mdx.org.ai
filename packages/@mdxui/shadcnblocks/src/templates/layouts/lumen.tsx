/**
 * Lumen Layout - Modern Minimal Template
 *
 * Based on shadcnblocks' Lumen template - clean, minimal structure
 * with focus on content and typography.
 *
 * Use case: Content-first sites, blogs, documentation, portfolios
 */

import * as React from 'react'
import type { ReactNode } from 'react'

/**
 * Header Props - Minimal navigation
 */
export interface LumenHeaderProps {
  /** Brand/logo */
  brand?: {
    name: string
    href: string
    logo?: ReactNode
  }
  /** Minimal navigation (3-5 items max) */
  navigation?: Array<{
    label: string
    href: string
  }>
  /** Optional CTA */
  cta?: {
    label: string
    href: string
  }
}

/**
 * Hero Props - Minimal hero
 */
export interface LumenHeroProps {
  /** Tagline or category */
  tagline?: string
  /** Main title */
  title: string
  /** Description */
  description?: string
  /** Optional single CTA */
  cta?: {
    label: string
    href: string
  }
  /** Optional visual element */
  visual?: ReactNode
}

/**
 * Content Block Props
 *
 * Flexible content blocks for body content
 */
export interface ContentBlockProps {
  /** Block type */
  type:
    | 'text' // Rich text content
    | 'image' // Full-width image
    | 'quote' // Pull quote
    | 'grid' // Grid of items
    | 'divider' // Section divider
    | 'custom' // Custom content

  /** Text content (for type='text') */
  text?: string | ReactNode

  /** Image (for type='image') */
  image?: {
    src: string
    alt: string
    caption?: string
  }

  /** Quote (for type='quote') */
  quote?: {
    text: string
    author?: string
    source?: string
  }

  /** Grid items (for type='grid') */
  grid?: {
    columns?: 2 | 3 | 4
    items: Array<{
      title?: string
      description?: string
      image?: string
      icon?: ReactNode
      href?: string
    }>
  }

  /** Custom content (for type='custom') */
  custom?: ReactNode

  /** Optional block ID for anchoring */
  id?: string

  /** Optional background variant */
  background?: 'none' | 'subtle' | 'accent'
}

/**
 * Footer Props - Minimal footer
 */
export interface LumenFooterProps {
  /** Brand */
  brand?: {
    name: string
    description?: string
  }
  /** Footer links (1-2 columns max) */
  links?: Array<{
    label: string
    href: string
  }>
  /** Social links */
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
  }
  /** Copyright */
  copyright?: string
}

/**
 * Lumen Layout Props
 *
 * Minimal, content-first structure:
 * - Clean header
 * - Hero section
 * - Flexible content blocks
 * - Simple footer
 */
export interface LumenLayoutProps {
  /** Minimal header */
  header: LumenHeaderProps

  /** Hero section */
  hero: LumenHeroProps

  /** Content blocks - flexible array of sections */
  content: ContentBlockProps[]

  /** Minimal footer */
  footer: LumenFooterProps
}

/**
 * Lumen Layout Component
 *
 * Renders a minimal, content-focused page with clean typography
 * and flexible content blocks.
 *
 * @example
 * ```tsx
 * <LumenLayout
 *   header={{
 *     brand: { name: 'Studio', href: '/' },
 *     navigation: [
 *       { label: 'Work', href: '/work' },
 *       { label: 'About', href: '/about' },
 *     ],
 *   }}
 *   hero={{
 *     tagline: 'Design Studio',
 *     title: 'Creating beautiful digital experiences',
 *     description: 'We craft thoughtful solutions...',
 *   }}
 *   content={[
 *     { type: 'text', text: 'Rich content...' },
 *     { type: 'image', image: { src: '/work.jpg', alt: 'Our work' } },
 *     // ... more blocks
 *   ]}
 *   footer={{
 *     brand: { name: 'Studio' },
 *     links: [{ label: 'Contact', href: '/contact' }],
 *   }}
 * />
 * ```
 */
export function LumenLayout({ header, hero, content, footer }: LumenLayoutProps) {
  return (
    <div data-layout="lumen" data-template="modern-minimal" className="min-h-screen">
      {/* Minimal Header */}
      <header className="border-b" role="banner">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Brand */}
          {header.brand && (
            <a href={header.brand.href} className="flex items-center gap-2 font-medium">
              {header.brand.logo}
              <span>{header.brand.name}</span>
            </a>
          )}

          {/* Navigation */}
          {header.navigation && (
            <nav className="hidden md:flex md:gap-8" aria-label="Main navigation">
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
          )}

          {/* Optional CTA */}
          {header.cta && (
            <a
              href={header.cta.href}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {header.cta.label}
            </a>
          )}
        </div>
      </header>

      {/* Main content */}
      <main role="main">
        {/* Hero */}
        <section aria-label="Hero" className="py-20 lg:py-32">
          <div className="container mx-auto max-w-4xl px-4">
            {hero.tagline && (
              <p className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {hero.tagline}
              </p>
            )}
            <h1 className="text-4xl font-medium tracking-tight sm:text-5xl md:text-6xl">
              {hero.title}
            </h1>
            {hero.description && (
              <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
                {hero.description}
              </p>
            )}
            {hero.cta && (
              <a
                href={hero.cta.href}
                className="mt-8 inline-flex items-center text-base font-medium underline-offset-4 hover:underline"
              >
                {hero.cta.label}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            )}
            {hero.visual && <div className="mt-16">{hero.visual}</div>}
          </div>
        </section>

        {/* Content Blocks */}
        {content.map((block, i) => {
          const bgClass =
            block.background === 'subtle'
              ? 'bg-muted/30'
              : block.background === 'accent'
                ? 'bg-muted/50'
                : ''

          return (
            <section key={i} id={block.id} className={`py-16 ${bgClass}`}>
              <div className="container mx-auto max-w-4xl px-4">
                {/* Text Block */}
                {block.type === 'text' && (
                  <div className="prose prose-lg max-w-none dark:prose-invert">
                    {typeof block.text === 'string' ? (
                      <div dangerouslySetInnerHTML={{ __html: block.text }} />
                    ) : (
                      block.text
                    )}
                  </div>
                )}

                {/* Image Block */}
                {block.type === 'image' && block.image && (
                  <figure>
                    <img
                      src={block.image.src}
                      alt={block.image.alt}
                      className="w-full rounded-lg"
                    />
                    {block.image.caption && (
                      <figcaption className="mt-4 text-center text-sm text-muted-foreground">
                        {block.image.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                {/* Quote Block */}
                {block.type === 'quote' && block.quote && (
                  <blockquote className="border-l-4 border-primary pl-6">
                    <p className="text-2xl font-medium leading-relaxed">{block.quote.text}</p>
                    {(block.quote.author || block.quote.source) && (
                      <footer className="mt-4 text-muted-foreground">
                        {block.quote.author && <cite className="not-italic">{block.quote.author}</cite>}
                        {block.quote.source && (
                          <span>
                            {block.quote.author && ', '}
                            {block.quote.source}
                          </span>
                        )}
                      </footer>
                    )}
                  </blockquote>
                )}

                {/* Grid Block */}
                {block.type === 'grid' && block.grid && (
                  <div
                    className={`grid gap-8 ${
                      block.grid.columns === 4
                        ? 'md:grid-cols-2 lg:grid-cols-4'
                        : block.grid.columns === 3
                          ? 'md:grid-cols-2 lg:grid-cols-3'
                          : 'md:grid-cols-2'
                    }`}
                  >
                    {block.grid.items.map((item, j) => (
                      <div key={j} className="group">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title || ''}
                            className="mb-4 w-full rounded-lg"
                          />
                        )}
                        {item.icon && <div className="mb-4">{item.icon}</div>}
                        {item.title && (
                          <h3 className="mb-2 font-medium">{item.title}</h3>
                        )}
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        {item.href && (
                          <a
                            href={item.href}
                            className="mt-2 inline-flex items-center text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            Learn more
                            <svg
                              className="ml-1 h-3 w-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 8l4 4m0 0l-4 4m4-4H3"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider Block */}
                {block.type === 'divider' && (
                  <hr className="my-8 border-t" />
                )}

                {/* Custom Block */}
                {block.type === 'custom' && block.custom}
              </div>
            </section>
          )
        })}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t py-12" role="contentinfo">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {/* Brand */}
            {footer.brand && (
              <div>
                <p className="font-medium">{footer.brand.name}</p>
                {footer.brand.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {footer.brand.description}
                  </p>
                )}
              </div>
            )}

            {/* Links */}
            {footer.links && (
              <div className="flex flex-wrap gap-6">
                {footer.links.map((link, i) => (
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

          {/* Bottom row */}
          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t pt-8 md:flex-row md:items-center">
            <p className="text-sm text-muted-foreground">
              {footer.copyright || `© ${new Date().getFullYear()} ${footer.brand?.name || 'All rights reserved'}`}
            </p>

            {/* Social */}
            {footer.social && (
              <div className="flex gap-4">
                {footer.social.twitter && (
                  <a
                    href={footer.social.twitter}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Twitter"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                )}
                {footer.social.github && (
                  <a
                    href={footer.social.github}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="GitHub"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                )}
                {footer.social.linkedin && (
                  <a
                    href={footer.social.linkedin}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="LinkedIn"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
