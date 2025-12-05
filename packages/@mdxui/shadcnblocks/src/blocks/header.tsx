/**
 * Header/Navbar Blocks (GAP: Only container in @mdxui/html)
 */

import * as React from 'react'
import type { HeaderBlockProps } from '../types'

export function HeaderSimple({ logo, brand, navigation, actions, sticky = true }: HeaderBlockProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className={`border-b bg-background ${sticky ? 'sticky top-0 z-50' : ''}`}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href={brand?.href || '/'} className="flex items-center gap-2">
          {logo}
          {brand?.name && <span className="font-bold">{brand.name}</span>}
        </a>
        <nav className="hidden md:flex md:items-center md:gap-6">
          {navigation.map((item, i) => (
            <a key={i} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>
        {actions && (
          <div className="hidden gap-4 md:flex">
            {actions.map((action, i) => (
              <a
                key={i}
                href={action.href}
                className={
                  action.variant === 'primary'
                    ? 'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
                    : action.variant === 'secondary'
                    ? 'rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent'
                    : 'text-sm font-medium text-muted-foreground hover:text-foreground'
                }
              >
                {action.label}
              </a>
            ))}
          </div>
        )}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="border-t px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navigation.map((item, i) => (
              <a key={i} href={item.href} className="text-sm font-medium">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

export const Header = { Simple: HeaderSimple }
