/**
 * Features Blocks
 *
 * Various feature section layouts.
 */

import * as React from 'react'
import type { FeaturesBlockProps } from '../types'

/**
 * Features Grid
 *
 * Features displayed in a responsive grid.
 */
export function FeaturesGrid({
  headline,
  description,
  features,
  columns = 3,
}: FeaturesBlockProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section aria-label="Features" className="py-20">
      <div className="container mx-auto px-4">
        {(headline || description) && (
          <div className="mb-12 text-center">
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {headline}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className={`grid gap-8 ${gridCols[columns]}`}>
          {features.map((feature, i) => (
            <div key={i} className="text-center">
              {feature.icon && (
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
              )}
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Features Cards
 *
 * Features displayed as cards with shadows.
 */
export function FeaturesCards({
  headline,
  description,
  features,
  columns = 3,
}: FeaturesBlockProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section aria-label="Features" className="py-20">
      <div className="container mx-auto px-4">
        {(headline || description) && (
          <div className="mb-12 text-center">
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {headline}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className={`grid gap-6 ${gridCols[columns]}`}>
          {features.map((feature, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {feature.icon && (
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {feature.icon}
                </div>
              )}
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
              {feature.href && (
                <a
                  href={feature.href}
                  className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Learn more →
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Features Alternating
 *
 * Features with alternating image/text layout.
 */
export function FeaturesAlternating({
  headline,
  description,
  features,
}: FeaturesBlockProps) {
  return (
    <section aria-label="Features" className="py-20">
      <div className="container mx-auto px-4">
        {(headline || description) && (
          <div className="mb-16 text-center">
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                {headline}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="space-y-24">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`flex flex-col gap-12 md:flex-row md:items-center ${
                i % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1">
                {feature.icon && (
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                )}
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="mt-4 text-lg text-muted-foreground">
                  {feature.description}
                </p>
                {feature.href && (
                  <a
                    href={feature.href}
                    className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    Learn more →
                  </a>
                )}
              </div>
              <div className="flex-1">
                <div className="aspect-video rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Re-export all feature variants
export const Features = {
  Grid: FeaturesGrid,
  Cards: FeaturesCards,
  Alternating: FeaturesAlternating,
}
