/**
 * @mdxe/hono Hono JSX Components
 *
 * Re-exports fumadocs-style layout components from @mdxui/fumadocs for
 * server-side rendering with Hono JSX.
 *
 * @packageDocumentation
 */

// Re-export all Hono JSX components from @mdxui/fumadocs
export {
  // Types
  type NavItem,
  type TOCItem,
  type SiteConfig,
  type DocsLayoutProps,
  type DocPageProps,
  // Layout components
  Navbar,
  Sidebar,
  TableOfContents,
  Breadcrumbs,
  PageNavigation,
  DocsBody,
  DocsLayout,
  DocsPage,
  DocsDocument,
  // Utility functions
  buildSidebar,
  extractTOC,
} from '@mdxui/fumadocs/hono'

// Re-export for backwards compatibility as DocContent
export { DocsBody as DocContent } from '@mdxui/fumadocs/hono'
