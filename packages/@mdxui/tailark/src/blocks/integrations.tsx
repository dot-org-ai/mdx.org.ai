/**
 * Tailark Integrations Block
 *
 * GAP: Specialized logo cloud with categories not in @mdxui/html.
 */

import * as React from 'react'
import type { TailarkIntegrationsProps } from '../types'

export function Integrations({
  title,
  description,
  integrations,
  showCategories = false,
  cta,
}: TailarkIntegrationsProps) {
  const categories = React.useMemo(() => {
    if (!showCategories) return []
    const cats = new Set(integrations.map((i) => i.category).filter(Boolean))
    return ['All', ...Array.from(cats)] as string[]
  }, [integrations, showCategories])

  const [activeCategory, setActiveCategory] = React.useState('All')

  const filteredIntegrations = React.useMemo(() => {
    if (!showCategories || activeCategory === 'All') return integrations
    return integrations.filter((i) => i.category === activeCategory)
  }, [integrations, activeCategory, showCategories])

  return (
    <section aria-label="Integrations" className="py-20">
      <div className="container mx-auto px-4">
        {(title || description) && (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {title && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
            {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          </div>
        )}

        {showCategories && categories.length > 1 && (
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'border hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredIntegrations.map((integration, i) => (
            <a
              key={i}
              href={integration.href}
              className="group flex flex-col items-center justify-center rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-md"
            >
              <img
                src={integration.logo}
                alt={integration.name}
                className="h-12 w-12 object-contain grayscale transition-all group-hover:grayscale-0"
              />
              <span className="mt-3 text-sm font-medium">{integration.name}</span>
            </a>
          ))}
        </div>

        {cta && (
          <div className="mt-12 text-center">
            <a
              href={cta.href}
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              {cta.text} →
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
