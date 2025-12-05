/**
 * Tailark FAQ Blocks
 */

import * as React from 'react'
import type { TailarkFAQProps } from '../types'

export function FAQAccordion({ title, description, items }: TailarkFAQProps) {
  return (
    <section aria-label="FAQ" className="py-20">
      <div className="container mx-auto max-w-3xl px-4">
        {(title || description) && (
          <div className="mb-12 text-center">
            {title && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
            {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="divide-y">
          {items.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {item.question}
                <svg className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export const FAQ = { Accordion: FAQAccordion }
