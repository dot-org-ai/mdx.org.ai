/**
 * Hero Blocks
 *
 * Various hero section layouts for landing pages.
 */

import * as React from 'react'
import type { HeroBlockProps } from '../types'

/**
 * Centered Hero
 *
 * Classic centered hero with headline, description, and CTAs.
 */
export function HeroCentered({
  badge,
  title,
  description,
  primaryAction,
  secondaryAction,
  image,
  background = 'none',
}: HeroBlockProps) {
  return (
    <section
      aria-label="Hero"
      className="relative overflow-hidden py-20 md:py-32"
      data-background={background}
    >
      <div className="container mx-auto px-4 text-center">
        {badge && (
          <div className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm">
            {badge}
          </div>
        )}
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {primaryAction && (
              <a
                href={primaryAction.href}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                {primaryAction.label}
              </a>
            )}
            {secondaryAction && (
              <a
                href={secondaryAction.href}
                className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
              >
                {secondaryAction.label}
              </a>
            )}
          </div>
        )}
        {image && (
          <div className="mt-12">
            <img
              src={image.src}
              alt={image.alt}
              className="mx-auto rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Split Hero
 *
 * Hero with content on left and image on right.
 */
export function HeroSplit({
  badge,
  title,
  description,
  primaryAction,
  secondaryAction,
  image,
}: HeroBlockProps) {
  return (
    <section aria-label="Hero" className="py-20 md:py-32">
      <div className="container mx-auto grid gap-12 px-4 md:grid-cols-2 md:items-center">
        <div>
          {badge && (
            <div className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm">
              {badge}
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-6 text-lg text-muted-foreground">{description}</p>
          )}
          {(primaryAction || secondaryAction) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {primaryAction && (
                <a
                  href={primaryAction.href}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  {primaryAction.label}
                </a>
              )}
              {secondaryAction && (
                <a
                  href={secondaryAction.href}
                  className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
                >
                  {secondaryAction.label}
                </a>
              )}
            </div>
          )}
        </div>
        {image && (
          <div>
            <img
              src={image.src}
              alt={image.alt}
              className="rounded-lg shadow-2xl"
            />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Video Hero
 *
 * Hero with video background or embedded video.
 */
export function HeroVideo({
  badge,
  title,
  description,
  primaryAction,
  secondaryAction,
  video,
}: HeroBlockProps) {
  return (
    <section aria-label="Hero" className="relative py-20 md:py-32">
      {video && (
        <div className="absolute inset-0 -z-10">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster={video.poster}
            className="h-full w-full object-cover"
          >
            <source src={video.src} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-background/80" />
        </div>
      )}
      <div className="container mx-auto px-4 text-center">
        {badge && (
          <div className="mb-4 inline-flex items-center rounded-full border bg-background/50 px-3 py-1 text-sm backdrop-blur">
            {badge}
          </div>
        )}
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
        )}
        {(primaryAction || secondaryAction) && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {primaryAction && (
              <a
                href={primaryAction.href}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                {primaryAction.label}
              </a>
            )}
            {secondaryAction && (
              <a
                href={secondaryAction.href}
                className="inline-flex items-center justify-center rounded-md border bg-background/50 px-6 py-3 text-sm font-medium backdrop-blur hover:bg-accent"
              >
                {secondaryAction.label}
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// Re-export all hero variants
export const Hero = {
  Centered: HeroCentered,
  Split: HeroSplit,
  Video: HeroVideo,
}
