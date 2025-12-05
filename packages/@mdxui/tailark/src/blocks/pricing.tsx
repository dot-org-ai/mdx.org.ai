/**
 * Tailark Pricing Blocks
 */

import * as React from 'react'
import type { TailarkPricingProps } from '../types'

export function PricingCards({ title, description, billingToggle, tiers, faq }: TailarkPricingProps) {
  const [annual, setAnnual] = React.useState(false)

  return (
    <section aria-label="Pricing" className="py-20">
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {title && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
            {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}

        {billingToggle && (
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center rounded-full border p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${!annual ? 'bg-primary text-primary-foreground' : ''}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${annual ? 'bg-primary text-primary-foreground' : ''}`}
              >
                Annual <span className="ml-1 text-xs opacity-75">Save 20%</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <div key={i} className={`relative rounded-xl border p-8 ${tier.featured ? 'border-primary shadow-xl' : 'bg-card'}`}>
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  {tier.badge}
                </div>
              )}
              <h3 className="text-xl font-bold">{tier.name}</h3>
              {tier.description && <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>}
              <div className="my-6">
                <span className="text-4xl font-bold">{annual && tier.price.annual ? tier.price.annual : tier.price.monthly}</span>
                <span className="text-muted-foreground">/{annual ? 'year' : 'month'}</span>
              </div>
              <ul className="mb-8 space-y-3">
                {tier.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    <span className={feature.included ? '' : 'text-muted-foreground line-through'}>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <a href={tier.ctaHref} className={`block w-full rounded-lg py-3 text-center text-sm font-medium ${tier.featured ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}>
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        {faq && faq.length > 0 && (
          <div className="mx-auto mt-20 max-w-2xl">
            <h3 className="mb-8 text-center text-xl font-bold">Frequently Asked Questions</h3>
            <div className="divide-y">
              {faq.map((item, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer items-center justify-between font-medium">
                    {item.question}
                    <svg className="h-5 w-5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export const Pricing = { Cards: PricingCards }
