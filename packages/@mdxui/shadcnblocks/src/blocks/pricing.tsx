/**
 * Pricing Blocks
 *
 * Various pricing section layouts.
 */

import * as React from 'react'
import type { PricingBlockProps } from '../types'

/**
 * Pricing Cards
 *
 * Classic pricing cards layout.
 */
export function PricingCards({
  headline,
  description,
  billingToggle,
  tiers,
}: PricingBlockProps) {
  const [annual, setAnnual] = React.useState(false)

  return (
    <section aria-label="Pricing" className="py-20">
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
        {billingToggle && (
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center gap-4 rounded-full border p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  !annual ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  annual ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                Annual
              </button>
            </div>
          </div>
        )}
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`relative rounded-lg border p-8 ${
                tier.featured
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'bg-card'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    {tier.badge}
                  </span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold">{tier.name}</h3>
                {tier.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                )}
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {annual && tier.price.annual
                    ? tier.price.annual
                    : tier.price.monthly}
                </span>
                <span className="text-muted-foreground">
                  /{annual ? 'year' : 'month'}
                </span>
              </div>
              <ul className="mb-8 space-y-3">
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
                href={tier.ctaHref}
                className={`block w-full rounded-md py-3 text-center text-sm font-medium transition-colors ${
                  tier.featured
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border hover:bg-accent'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Pricing Table
 *
 * Comparison table layout for pricing.
 */
export function PricingTable({
  headline,
  description,
  tiers,
}: PricingBlockProps) {
  return (
    <section aria-label="Pricing" className="py-20">
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b p-4 text-left">Features</th>
                {tiers.map((tier, i) => (
                  <th key={i} className="border-b p-4 text-center">
                    <div className="font-bold">{tier.name}</div>
                    <div className="text-2xl font-bold">
                      {tier.price.monthly}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Render feature comparison rows */}
              {tiers[0]?.features.map((_, featureIndex) => (
                <tr key={featureIndex}>
                  <td className="border-b p-4">
                    {tiers[0].features[featureIndex]}
                  </td>
                  {tiers.map((tier, tierIndex) => (
                    <td key={tierIndex} className="border-b p-4 text-center">
                      {tier.features[featureIndex] ? (
                        <svg
                          className="mx-auto h-5 w-5 text-primary"
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
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// Re-export all pricing variants
export const Pricing = {
  Cards: PricingCards,
  Table: PricingTable,
}
