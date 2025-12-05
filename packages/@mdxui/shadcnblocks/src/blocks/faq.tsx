/**
 * FAQ Blocks
 */

import * as React from 'react'

export interface FAQBlockProps {
  headline?: string
  description?: string
  items: Array<{
    question: string
    answer: string
  }>
}

export function FAQAccordion({ headline, description, items }: FAQBlockProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  return (
    <section aria-label="FAQ" className="py-20">
      <div className="container mx-auto max-w-3xl px-4">
        {(headline || description) && (
          <div className="mb-12 text-center">
            {headline && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{headline}</h2>}
            {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="divide-y">
          {items.map((item, i) => (
            <div key={i} className="py-4">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between text-left font-medium"
              >
                {item.question}
                <svg
                  className={`h-5 w-5 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <p className="mt-4 text-muted-foreground">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const FAQ = { Accordion: FAQAccordion }
