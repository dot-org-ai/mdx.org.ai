/**
 * Tailark Testimonials Blocks
 */

import * as React from 'react'
import type { TailarkTestimonialsProps } from '../types'

export function TestimonialsCards({ title, testimonials }: TailarkTestimonialsProps) {
  return (
    <section aria-label="Testimonials" className="py-20">
      <div className="container mx-auto px-4">
        {title && <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className={`rounded-xl border bg-card p-6 ${t.featured ? 'border-primary shadow-lg' : ''}`}>
              {t.rating && (
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className={`h-5 w-5 ${j < t.rating! ? 'text-yellow-400' : 'text-muted'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
              <blockquote className="text-muted-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="mt-6 flex items-center gap-4">
                {t.author.avatar && <img src={t.author.avatar} alt="" className="h-12 w-12 rounded-full" />}
                <div>
                  <div className="font-semibold">{t.author.name}</div>
                  {t.author.title && <div className="text-sm text-muted-foreground">{t.author.title}</div>}
                </div>
              </div>
              {t.logo && <img src={t.logo} alt="" className="mt-4 h-6 opacity-60" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TestimonialsWall({ title, testimonials }: TailarkTestimonialsProps) {
  return (
    <section aria-label="Testimonials" className="py-20">
      <div className="container mx-auto px-4">
        {title && <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
          {testimonials.map((t, i) => (
            <div key={i} className="mb-6 break-inside-avoid rounded-xl border bg-card p-6">
              <blockquote className="text-muted-foreground">&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="mt-4 flex items-center gap-3">
                {t.author.avatar && <img src={t.author.avatar} alt="" className="h-10 w-10 rounded-full" />}
                <div>
                  <div className="text-sm font-semibold">{t.author.name}</div>
                  {t.author.title && <div className="text-xs text-muted-foreground">{t.author.title}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export const Testimonials = {
  Cards: TestimonialsCards,
  Wall: TestimonialsWall,
}
