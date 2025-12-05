/**
 * Bento Grid Blocks (GAP: Not in @mdxui/html)
 */

import * as React from 'react'
import type { BentoBlockProps } from '../types'

export function BentoGrid({ items, columns = 3 }: BentoBlockProps) {
  return (
    <section aria-label="Features" className="py-20">
      <div className="container mx-auto px-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl border bg-card p-6"
              style={{
                gridColumn: item.span?.cols ? `span ${item.span.cols}` : undefined,
                gridRow: item.span?.rows ? `span ${item.span.rows}` : undefined,
              }}
            >
              {item.image && (
                <div className="absolute inset-0 -z-10">
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover opacity-10 transition-opacity group-hover:opacity-20"
                  />
                </div>
              )}
              {item.icon && (
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {item.icon}
                </div>
              )}
              <h3 className="text-lg font-semibold">{item.title}</h3>
              {item.description && (
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              )}
              {item.href && (
                <a
                  href={item.href}
                  className="absolute inset-0"
                  aria-label={item.title}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const Bento = { Grid: BentoGrid }
