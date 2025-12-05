/**
 * Contact Blocks (GAP: Not in @mdxui/html)
 */

import * as React from 'react'
import type { ContactBlockProps } from '../types'

export function ContactSplit({ headline, description, form = true, info }: ContactBlockProps) {
  return (
    <section aria-label="Contact" className="py-20">
      <div className="container mx-auto grid gap-12 px-4 md:grid-cols-2">
        <div>
          {headline && <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{headline}</h2>}
          {description && <p className="mt-4 text-lg text-muted-foreground">{description}</p>}
          {info && (
            <div className="mt-8 space-y-4">
              {info.email && (
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${info.email}`} className="hover:underline">{info.email}</a>
                </div>
              )}
              {info.phone && (
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${info.phone}`} className="hover:underline">{info.phone}</a>
                </div>
              )}
              {info.address && (
                <div className="flex items-start gap-3">
                  <svg className="mt-1 h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{info.address}</span>
                </div>
              )}
            </div>
          )}
        </div>
        {form && (
          <div className="rounded-lg border bg-card p-8">
            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <input type="text" className="mt-1 block w-full rounded-md border px-4 py-2" />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <input type="text" className="mt-1 block w-full rounded-md border px-4 py-2" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" className="mt-1 block w-full rounded-md border px-4 py-2" />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea rows={4} className="mt-1 block w-full rounded-md border px-4 py-2" />
              </div>
              <button type="submit" className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Send Message
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}

export const Contact = { Split: ContactSplit }
