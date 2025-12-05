import * as React from 'react'

export interface LayoutLogo {
  src: string
  alt: string
  text: string
}

export interface LayoutLink {
  href: string
  label: string
}

export interface LayoutSection {
  title: string
  links: LayoutLink[]
}

export interface LayoutTocItem {
  href: string
  label: string
}

export interface LayoutPromo {
  badge?: string
  headline: string
  description: string
  cta: {
    label: string
    href: string
  }
}

export interface LayoutProps {
  logo: LayoutLogo
  sections: LayoutSection[]
  toc: LayoutTocItem[]
  promo?: LayoutPromo
  children: React.ReactNode
}

/**
 * Shared layout with nav sidebar, main content, and TOC aside.
 * Uses data-layout="ontology" for CSS styling.
 */
export function Layout({ logo, sections, toc, promo, children }: LayoutProps) {
  return (
    <div data-layout="ontology">
      <header>
        <a href="/">
          <img src={logo.src} alt={logo.alt} />
          <span>{logo.text}</span>
        </a>
        <button aria-label="Open menu">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      <nav>
        <a href="/">
          <img src={logo.src} alt={logo.alt} />
          <span>{logo.text}</span>
        </a>

        {sections.map((section, i) => (
          <section key={i}>
            <h2>{section.title}</h2>
            <menu>
              {section.links.map((link, j) => (
                <li key={j}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </menu>
          </section>
        ))}
      </nav>

      <main>{children}</main>

      <aside>
        <h2>On this page</h2>
        <menu>
          {toc.map((item, i) => (
            <li key={i}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </menu>

        {promo && (
          <article>
            {promo.badge && <small>{promo.badge}</small>}
            <strong>{promo.headline}</strong>
            <p>{promo.description}</p>
            <a href={promo.cta.href}>{promo.cta.label}</a>
          </article>
        )}
      </aside>
    </div>
  )
}
