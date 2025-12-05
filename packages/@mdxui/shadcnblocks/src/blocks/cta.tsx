/**
 * CTA Blocks
 */

import * as React from 'react'
import type { CTABlockProps } from '../types'

export function CTACentered({ headline, description, primaryAction, secondaryAction }: CTABlockProps) {
  return (
    <section aria-label="CTA" className="py-20">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{headline}</h2>
        {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href={primaryAction.href}
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            {primaryAction.label}
          </a>
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export function CTABanner({ headline, description, primaryAction }: CTABlockProps) {
  return (
    <section aria-label="CTA" className="bg-primary py-12 text-primary-foreground">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row">
        <div>
          <h2 className="text-2xl font-bold">{headline}</h2>
          {description && <p className="mt-2 opacity-90">{description}</p>}
        </div>
        <a
          href={primaryAction.href}
          className="inline-flex items-center justify-center rounded-md bg-primary-foreground px-6 py-3 text-sm font-medium text-primary shadow hover:bg-primary-foreground/90"
        >
          {primaryAction.label}
        </a>
      </div>
    </section>
  )
}

export const CTA = { Centered: CTACentered, Banner: CTABanner }
