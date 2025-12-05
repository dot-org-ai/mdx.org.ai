/**
 * Tailark Hero Blocks
 *
 * Conversion-optimized hero sections.
 */

import * as React from 'react'
import type { TailarkHeroProps } from '../types'

/**
 * Hero with announcement banner, centered layout
 */
export function HeroCentered({
  announcement,
  headline,
  description,
  primaryCta,
  secondaryCta,
  image,
  trustedBy,
}: TailarkHeroProps) {
  return (
    <section aria-label="Hero" className="relative overflow-hidden py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement badge */}
          {announcement && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {announcement.href ? (
                <a href={announcement.href} className="hover:underline">
                  {announcement.text}
                </a>
              ) : (
                announcement.text
              )}
            </div>
          )}

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            {headline}
          </h1>

          {/* Description */}
          {description && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {description}
            </p>
          )}

          {/* CTAs */}
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {primaryCta && (
                <a
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
                >
                  {primaryCta.text}
                </a>
              )}
              {secondaryCta && (
                <a
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg border px-8 py-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {secondaryCta.text}
                </a>
              )}
            </div>
          )}

          {/* Trusted by */}
          {trustedBy && trustedBy.length > 0 && (
            <div className="mt-12">
              <p className="mb-6 text-sm text-muted-foreground">
                Trusted by teams at
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {trustedBy.map((logo, i) => (
                  <img
                    key={i}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-8 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hero image */}
        {image && (
          <div className="mt-16">
            <img
              src={image.src}
              alt={image.alt}
              className="mx-auto rounded-xl shadow-2xl"
            />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Split hero with image
 */
export function HeroSplit({
  announcement,
  headline,
  description,
  primaryCta,
  secondaryCta,
  image,
  trustedBy,
}: TailarkHeroProps) {
  return (
    <section aria-label="Hero" className="py-20 md:py-32">
      <div className="container mx-auto grid gap-12 px-4 md:grid-cols-2 md:items-center">
        <div>
          {announcement && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
              {announcement.text}
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {headline}
          </h1>
          {description && (
            <p className="mt-6 text-lg text-muted-foreground">{description}</p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {primaryCta && (
                <a
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  {primaryCta.text}
                </a>
              )}
              {secondaryCta && (
                <a
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-medium hover:bg-accent"
                >
                  {secondaryCta.text}
                </a>
              )}
            </div>
          )}
          {trustedBy && trustedBy.length > 0 && (
            <div className="mt-12">
              <p className="mb-4 text-sm text-muted-foreground">Trusted by</p>
              <div className="flex flex-wrap items-center gap-6">
                {trustedBy.map((logo, i) => (
                  <img key={i} src={logo.src} alt={logo.alt} className="h-6 opacity-60" />
                ))}
              </div>
            </div>
          )}
        </div>
        {image && (
          <div>
            <img src={image.src} alt={image.alt} className="rounded-xl shadow-2xl" />
          </div>
        )}
      </div>
    </section>
  )
}

export const Hero = {
  Centered: HeroCentered,
  Split: HeroSplit,
}
