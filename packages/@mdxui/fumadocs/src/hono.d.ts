/**
 * @mdxui/fumadocs/hono - Hono JSX components for Fumadocs-style layouts
 */

import type { FC, PropsWithChildren } from 'hono/jsx'

export interface NavItem {
  title: string
  url: string
  icon?: string
  items?: NavItem[]
  active?: boolean
}

export interface TOCItem {
  title: string
  url: string
  depth: number
  items?: TOCItem[]
}

export interface SiteConfig {
  name: string
  url?: string
  description?: string
  logo?: string
  github?: string
}

export interface DocsLayoutProps {
  site: SiteConfig
  sidebar?: NavItem[]
  toc?: TOCItem[]
  breadcrumbs?: { title: string; href: string }[]
  prev?: { title: string; href: string }
  next?: { title: string; href: string }
}

export interface DocPageProps {
  title: string
  description?: string
  content: string
}

export declare const Navbar: FC<{ site: SiteConfig }>
export declare const Sidebar: FC<{ items: NavItem[] }>
export declare const TableOfContents: FC<{ items: TOCItem[] }>
export declare const Breadcrumbs: FC<{ items: { title: string; href: string }[] }>
export declare const PageNavigation: FC<{
  prev?: { title: string; href: string }
  next?: { title: string; href: string }
}>
export declare const DocsBody: FC<DocPageProps>
export declare const DocsLayout: FC<PropsWithChildren<DocsLayoutProps>>
export declare const DocsPage: FC<DocsLayoutProps & DocPageProps>
export declare const DocsDocument: FC<
  PropsWithChildren<{
    title: string
    description?: string
    css?: string
    scripts?: string
  }>
>

export declare function buildSidebar(
  documents: Record<string, { path: string; data: Record<string, unknown> }>,
  currentPath: string
): NavItem[]

export declare function extractTOC(content: string): TOCItem[]
