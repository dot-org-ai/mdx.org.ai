/**
 * Testimonials Blocks
 *
 * Various testimonial section layouts.
 */

import * as React from 'react'
import type { TestimonialsBlockProps } from '../types'

/**
 * Testimonials Cards
 *
 * Grid of testimonial cards.
 */
export function TestimonialsCards({
  headline,
  testimonials,
}: TestimonialsBlockProps) {
  return (
    <section aria-label="Testimonials" className="py-20">
      <div className="container mx-auto px-4">
        {headline && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
            {headline}
          </h2>
        )}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              {testimonial.rating && (
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg
                      key={j}
                      className={`h-5 w-5 ${
                        j < testimonial.rating!
                          ? 'text-yellow-400'
                          : 'text-muted'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
              <blockquote className="mb-6 text-muted-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-4">
                {testimonial.author.avatar && (
                  <img
                    src={testimonial.author.avatar}
                    alt={testimonial.author.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold">{testimonial.author.name}</div>
                  {(testimonial.author.title || testimonial.author.company) && (
                    <div className="text-sm text-muted-foreground">
                      {testimonial.author.title}
                      {testimonial.author.title && testimonial.author.company && ' at '}
                      {testimonial.author.company}
                    </div>
                  )}
                </div>
              </div>
              {testimonial.logo && (
                <img
                  src={testimonial.logo}
                  alt=""
                  className="mt-4 h-8 object-contain opacity-50"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Testimonials Carousel
 *
 * Single testimonial with navigation.
 */
export function TestimonialsCarousel({
  headline,
  testimonials,
}: TestimonialsBlockProps) {
  const [current, setCurrent] = React.useState(0)

  const next = () => setCurrent((c) => (c + 1) % testimonials.length)
  const prev = () =>
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)

  const testimonial = testimonials[current]

  return (
    <section aria-label="Testimonials" className="py-20">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        {headline && (
          <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-4xl">
            {headline}
          </h2>
        )}
        <div className="relative">
          {testimonial.logo && (
            <img
              src={testimonial.logo}
              alt=""
              className="mx-auto mb-8 h-12 object-contain"
            />
          )}
          <blockquote className="text-xl text-muted-foreground md:text-2xl">
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center justify-center gap-4">
            {testimonial.author.avatar && (
              <img
                src={testimonial.author.avatar}
                alt={testimonial.author.name}
                className="h-14 w-14 rounded-full object-cover"
              />
            )}
            <div className="text-left">
              <div className="font-semibold">{testimonial.author.name}</div>
              {(testimonial.author.title || testimonial.author.company) && (
                <div className="text-sm text-muted-foreground">
                  {testimonial.author.title}
                  {testimonial.author.title && testimonial.author.company && ' at '}
                  {testimonial.author.company}
                </div>
              )}
            </div>
          </div>
          {testimonials.length > 1 && (
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={prev}
                className="rounded-full border p-2 hover:bg-muted"
                aria-label="Previous testimonial"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={next}
                className="rounded-full border p-2 hover:bg-muted"
                aria-label="Next testimonial"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Re-export all testimonial variants
export const Testimonials = {
  Cards: TestimonialsCards,
  Carousel: TestimonialsCarousel,
}
