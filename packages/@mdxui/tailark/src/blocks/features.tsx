/**
 * Tailark Features Blocks
 */

import * as React from 'react'
import type { TailarkFeaturesProps } from '../types'

export function FeaturesGrid({ title, description, features, columns = 3 }: TailarkFeaturesProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section aria-label="Features" className="py-20">
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="mx-auto mb-16 max-w-2xl text-center">
            {title && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
            {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className={`grid gap-8 ${gridCols[columns]}`}>
          {features.map((feature, i) => (
            <div key={i} className="group">
              {feature.icon && (
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {feature.icon}
                </div>
              )}
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
              {feature.href && (
                <a href={feature.href} className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
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

export function FeaturesCards({ title, description, features, columns = 3 }: TailarkFeaturesProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section aria-label="Features" className="py-20">
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="mx-auto mb-16 max-w-2xl text-center">
            {title && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
            {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className={`grid gap-6 ${gridCols[columns]}`}>
          {features.map((feature, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              {feature.image && <img src={feature.image} alt="" className="mb-4 h-40 w-full rounded-lg object-cover" />}
              {feature.icon && <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">{feature.icon}</div>}
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const Features = {
  Grid: FeaturesGrid,
  Cards: FeaturesCards,
}
