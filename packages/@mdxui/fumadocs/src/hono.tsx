/**
 * @mdxui/fumadocs/hono - Hono JSX components for Fumadocs-style layouts
 *
 * Provides Hono JSX components for server-side rendering of documentation
 * with fumadocs-style layouts (sidebar, TOC, navigation).
 *
 * @packageDocumentation
 */

import type { FC, PropsWithChildren } from 'hono/jsx'
import type { TOCItem as BaseTOCItem } from './index.js'

/**
 * Navigation item for sidebar
 */
export interface NavItem {
  title: string
  url: string
  icon?: string
  items?: NavItem[]
  active?: boolean
}

/**
 * TOC item (re-export with Hono compatibility)
 */
export interface TOCItem extends BaseTOCItem {}

/**
 * Site configuration
 */
export interface SiteConfig {
  name: string
  url?: string
  description?: string
  logo?: string
  github?: string
}

/**
 * Props for DocsLayout
 */
export interface DocsLayoutProps {
  site: SiteConfig
  sidebar?: NavItem[]
  toc?: TOCItem[]
  breadcrumbs?: { title: string; href: string }[]
  prev?: { title: string; href: string }
  next?: { title: string; href: string }
}

/**
 * Props for page content
 */
export interface DocPageProps {
  title: string
  description?: string
  content: string
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Navbar component - top navigation bar
 */
export const Navbar: FC<{ site: SiteConfig }> = ({ site }) => {
  return (
    <header class="fd-header">
      <nav class="fd-nav">
        <a href="/" class="fd-logo">
          {site.logo ? <img src={site.logo} alt={site.name} /> : null}
          <strong>{site.name}</strong>
        </a>
        <div class="fd-nav-links">
          <a href="/docs">Docs</a>
          <a href="/api">API</a>
          <a href="/llms.txt">LLMs</a>
        </div>
        <div class="fd-nav-actions">
          <button class="fd-search-trigger" type="button" aria-label="Search">
            <span class="fd-search-icon">🔍</span>
            <span class="fd-search-text">Search...</span>
            <kbd>⌘K</kbd>
          </button>
          <button class="fd-theme-toggle" type="button" aria-label="Toggle theme">
            🌙
          </button>
          {site.github ? (
            <a href={site.github} class="fd-github" aria-label="GitHub" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          ) : null}
        </div>
      </nav>
    </header>
  )
}

/**
 * Sidebar navigation item
 */
const SidebarItem: FC<{ item: NavItem; depth?: number }> = ({ item, depth = 0 }) => {
  const hasChildren = item.items && item.items.length > 0

  if (hasChildren) {
    return (
      <li class="fd-sidebar-group">
        <span class="fd-sidebar-group-title">
          {item.title}
        </span>
        <ul class="fd-sidebar-items">
          {item.items!.map((child) => (
            <SidebarItem item={child} depth={depth + 1} />
          ))}
        </ul>
      </li>
    )
  }

  return (
    <li class="fd-sidebar-item">
      <a
        href={item.url}
        class={item.active ? 'fd-sidebar-link active' : 'fd-sidebar-link'}
        aria-current={item.active ? 'page' : undefined}
      >
        {item.title}
      </a>
    </li>
  )
}

/**
 * Sidebar component - left navigation
 */
export const Sidebar: FC<{ items: NavItem[] }> = ({ items }) => {
  return (
    <aside class="fd-sidebar">
      <nav class="fd-sidebar-nav" aria-label="Documentation">
        <ul class="fd-sidebar-list">
          {items.map((item) => (
            <SidebarItem item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/**
 * TOC item component
 */
const TOCItemComponent: FC<{ item: TOCItem }> = ({ item }) => {
  const hasChildren = item.items && item.items.length > 0

  return (
    <li class={`fd-toc-item fd-toc-depth-${item.depth}`}>
      <a href={item.url} class="fd-toc-link">
        {item.title}
      </a>
      {hasChildren ? (
        <ul class="fd-toc-items">
          {item.items!.map((child) => (
            <TOCItemComponent item={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * Table of Contents component - right sidebar
 */
export const TableOfContents: FC<{ items: TOCItem[] }> = ({ items }) => {
  if (!items || items.length === 0) return null

  return (
    <aside class="fd-toc">
      <nav class="fd-toc-nav" aria-label="On this page">
        <strong class="fd-toc-title">On this page</strong>
        <ul class="fd-toc-list">
          {items.map((item) => (
            <TOCItemComponent item={item} />
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/**
 * Breadcrumbs component
 */
export const Breadcrumbs: FC<{ items: { title: string; href: string }[] }> = ({ items }) => {
  if (!items || items.length === 0) return null

  return (
    <nav class="fd-breadcrumbs" aria-label="Breadcrumb">
      <ol class="fd-breadcrumbs-list">
        {items.map((item, i) => (
          <li class="fd-breadcrumbs-item">
            {i < items.length - 1 ? (
              <>
                <a href={item.href}>{item.title}</a>
                <span class="fd-breadcrumbs-sep">/</span>
              </>
            ) : (
              <span aria-current="page">{item.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Page navigation component (prev/next links)
 */
export const PageNavigation: FC<{
  prev?: { title: string; href: string }
  next?: { title: string; href: string }
}> = ({ prev, next }) => {
  if (!prev && !next) return null

  return (
    <footer class="fd-page-nav">
      {prev ? (
        <a href={prev.href} class="fd-page-nav-link fd-page-nav-prev">
          <small>Previous</small>
          <span>{prev.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a href={next.href} class="fd-page-nav-link fd-page-nav-next">
          <small>Next</small>
          <span>{next.title}</span>
        </a>
      ) : (
        <span />
      )}
    </footer>
  )
}

/**
 * Main content area component
 */
export const DocsBody: FC<DocPageProps> = ({ title, description, content }) => {
  return (
    <article class="fd-article">
      <header class="fd-article-header">
        <h1 class="fd-article-title">{title}</h1>
        {description ? <p class="fd-article-description">{description}</p> : null}
      </header>
      <section class="fd-article-content" dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  )
}

/**
 * Main docs layout component
 *
 * Grid layout: sidebar | main content | toc
 */
export const DocsLayout: FC<PropsWithChildren<DocsLayoutProps>> = ({
  site,
  sidebar,
  toc,
  breadcrumbs,
  prev,
  next,
  children,
}) => {
  return (
    <>
      <Navbar site={site} />
      <div class="fd-container">
        {sidebar && sidebar.length > 0 ? <Sidebar items={sidebar} /> : null}
        <main class="fd-main">
          {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}
          {children}
          <PageNavigation prev={prev} next={next} />
        </main>
        {toc && toc.length > 0 ? <TableOfContents items={toc} /> : null}
      </div>
      <footer class="fd-footer">
        <p>Powered by <a href="https://mdx.org.ai">MDX.org.ai</a></p>
      </footer>
    </>
  )
}

/**
 * Full docs page component
 */
export const DocsPage: FC<DocsLayoutProps & DocPageProps> = ({
  site,
  sidebar,
  toc,
  breadcrumbs,
  prev,
  next,
  title,
  description,
  content,
}) => {
  return (
    <DocsLayout
      site={site}
      sidebar={sidebar}
      toc={toc}
      breadcrumbs={breadcrumbs}
      prev={prev}
      next={next}
    >
      <DocsBody title={title} description={description} content={content} />
    </DocsLayout>
  )
}

/**
 * HTML document wrapper
 */
export const DocsDocument: FC<
  PropsWithChildren<{
    title: string
    description?: string
    css?: string
    scripts?: string
  }>
> = ({ title, description, css, scripts, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {description ? <meta name="description" content={description} /> : null}
        <title>{title}</title>
        {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>
        {children}
        {scripts ? <script dangerouslySetInnerHTML={{ __html: scripts }} /> : null}
      </body>
    </html>
  )
}

/**
 * Build sidebar from documents
 */
export function buildSidebar(
  documents: Record<string, { path: string; data: Record<string, unknown> }>,
  currentPath: string
): NavItem[] {
  const groups = new Map<string, NavItem[]>()

  for (const [path, doc] of Object.entries(documents)) {
    const parts = path.split('/').filter(Boolean)
    const group = parts.length > 1 ? parts[0] || 'root' : 'root'
    const title = (doc.data.title as string) || parts[parts.length - 1] || 'Untitled'

    if (!groups.has(group)) {
      groups.set(group, [])
    }

    groups.get(group)!.push({
      title,
      url: path,
      active: path === currentPath,
    })
  }

  const items: NavItem[] = []

  for (const [group, groupItems] of groups.entries()) {
    const sortedItems = groupItems.sort((a, b) => a.title.localeCompare(b.title))

    if (group === 'root') {
      items.push(...sortedItems)
    } else {
      items.push({
        title: group.charAt(0).toUpperCase() + group.slice(1),
        url: `/${group}`,
        items: sortedItems,
      })
    }
  }

  return items.sort((a, b) => {
    // Groups first
    if (a.items && !b.items) return -1
    if (!a.items && b.items) return 1
    return a.title.localeCompare(b.title)
  })
}

/**
 * Extract TOC from markdown content
 */
export function extractTOC(content: string): TOCItem[] {
  const items: TOCItem[] = []
  const regex = /^(#{2,4})\s+(.+)$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    const depth = match[1]!.length
    const title = match[2]!.trim()
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    items.push({ title, url: `#${slug}`, depth })
  }

  return items
}
