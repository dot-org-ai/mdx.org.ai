/**
 * Logo Cloud Blocks
 */

import * as React from 'react'
import type { LogoCloudBlockProps } from '../types'

export function LogoGrid({ title, logos }: LogoCloudBlockProps) {
  return (
    <section aria-label="Logos" className="py-12">
      <div className="container mx-auto px-4">
        {title && (
          <p className="mb-8 text-center text-sm text-muted-foreground">{title}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {logos.map((logo, i) =>
            logo.href ? (
              <a key={i} href={logo.href} className="opacity-60 transition-opacity hover:opacity-100">
                <img src={logo.src} alt={logo.alt} className="h-8 md:h-10" />
              </a>
            ) : (
              <img key={i} src={logo.src} alt={logo.alt} className="h-8 opacity-60 md:h-10" />
            )
          )}
        </div>
      </div>
    </section>
  )
}

export function LogoMarquee({ title, logos }: LogoCloudBlockProps) {
  return (
    <section aria-label="Logos" className="overflow-hidden py-12">
      <div className="container mx-auto px-4">
        {title && (
          <p className="mb-8 text-center text-sm text-muted-foreground">{title}</p>
        )}
        <div className="relative">
          <div className="animate-marquee flex gap-12">
            {[...logos, ...logos].map((logo, i) => (
              <img
                key={i}
                src={logo.src}
                alt={logo.alt}
                className="h-8 flex-shrink-0 opacity-60 md:h-10"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export const Logos = { Grid: LogoGrid, Marquee: LogoMarquee }
