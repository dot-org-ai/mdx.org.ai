/**
 * Layout Components
 *
 * React wrappers for semantic HTML layouts.
 * These components render semantic HTML with data-layout attributes.
 */

import * as React from 'react'

export type LayoutType = 'site' | 'docs' | 'app' | 'dashboard' | 'fullscreen' | 'centered' | 'split'

export interface LayoutProps {
  /** Layout type determines the overall page structure */
  layout: LayoutType
  /** Theme: light, dark, or auto (system) */
  theme?: 'light' | 'dark' | 'auto'
  children: React.ReactNode
}

/**
 * Root layout wrapper that sets data-layout on body.
 * Use in your app's root layout component.
 */
export function Layout({ layout, theme = 'auto', children }: LayoutProps) {
  React.useEffect(() => {
    document.body.setAttribute('data-layout', layout)
    if (theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    return () => {
      document.body.removeAttribute('data-layout')
      document.documentElement.removeAttribute('data-theme')
    }
  }, [layout, theme])

  return <>{children}</>
}

export interface SiteLayoutProps {
  theme?: 'light' | 'dark' | 'auto'
  children: React.ReactNode
}

/**
 * Site layout for marketing/landing pages.
 * Vertical stack: header > main > footer
 */
export function SiteLayout({ theme, children }: SiteLayoutProps) {
  return (
    <Layout layout="site" theme={theme}>
      {children}
    </Layout>
  )
}

export interface DocsLayoutProps {
  theme?: 'light' | 'dark' | 'auto'
  children: React.ReactNode
}

/**
 * Documentation layout with sidebar and TOC.
 * Grid: header | sidebar | main (article + TOC) | footer
 */
export function DocsLayout({ theme, children }: DocsLayoutProps) {
  return (
    <Layout layout="docs" theme={theme}>
      {children}
    </Layout>
  )
}

export interface AppLayoutProps {
  theme?: 'light' | 'dark' | 'auto'
  children: React.ReactNode
}

/**
 * Application shell layout.
 * Grid: sidebar | header | main
 */
export function AppLayout({ theme, children }: AppLayoutProps) {
  return (
    <Layout layout="app" theme={theme}>
      {children}
    </Layout>
  )
}

export interface DashboardLayoutProps {
  theme?: 'light' | 'dark' | 'auto'
  children: React.ReactNode
}

/**
 * Dashboard layout with collapsible sidebar.
 * Grid: sidebar (narrow) | header | main
 */
export function DashboardLayout({ theme, children }: DashboardLayoutProps) {
  return (
    <Layout layout="dashboard" theme={theme}>
      {children}
    </Layout>
  )
}

export interface CenteredLayoutProps {
  theme?: 'light' | 'dark' | 'auto'
  children: React.ReactNode
}

/**
 * Centered layout for auth pages, single forms.
 * Content centered on page.
 */
export function CenteredLayout({ theme, children }: CenteredLayoutProps) {
  return (
    <Layout layout="centered" theme={theme}>
      {children}
    </Layout>
  )
}

export interface SplitLayoutProps {
  theme?: 'light' | 'dark' | 'auto'
  /** Split direction: horizontal (side by side) or vertical (stacked) */
  direction?: 'horizontal' | 'vertical'
  children: React.ReactNode
}

/**
 * Split layout for two-pane views (editor/preview, master/detail).
 */
export function SplitLayout({ theme, direction = 'horizontal', children }: SplitLayoutProps) {
  React.useEffect(() => {
    if (direction === 'vertical') {
      document.body.setAttribute('data-direction', 'vertical')
    } else {
      document.body.removeAttribute('data-direction')
    }
    return () => {
      document.body.removeAttribute('data-direction')
    }
  }, [direction])

  return (
    <Layout layout="split" theme={theme}>
      {children}
    </Layout>
  )
}
