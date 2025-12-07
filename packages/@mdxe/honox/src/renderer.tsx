/**
 * @mdxe/honox/renderer - Renderer components for HonoX + MDXLD
 *
 * Provides JSX renderer middleware and components for rendering
 * MDXLD documents with JSON-LD structured data.
 *
 * @packageDocumentation
 */

import type { FC, HtmlEscapedString } from '@mdxld/jsx'
import { jsxRenderer } from '@mdxld/jsx'
import type { MDXLDRendererOptions } from './types.js'

/**
 * Default CSS styles for MDXLD content
 */
const defaultStyles = `
.mdxld-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a1a;
}
.mdxld-content h1, .mdxld-content h2, .mdxld-content h3,
.mdxld-content h4, .mdxld-content h5, .mdxld-content h6 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 600;
}
.mdxld-content h1 { font-size: 2.25rem; }
.mdxld-content h2 { font-size: 1.875rem; }
.mdxld-content h3 { font-size: 1.5rem; }
.mdxld-content p {
  margin-bottom: 1rem;
}
.mdxld-content a {
  color: #0066cc;
  text-decoration: none;
}
.mdxld-content a:hover {
  text-decoration: underline;
}
.mdxld-content pre {
  background: #f4f4f5;
  padding: 1rem;
  overflow-x: auto;
  border-radius: 0.5rem;
  margin: 1.5rem 0;
}
.mdxld-content code {
  font-family: ui-monospace, monospace;
  font-size: 0.875em;
}
.mdxld-content :not(pre) > code {
  background: #f4f4f5;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
.mdxld-content blockquote {
  border-left: 4px solid #e4e4e7;
  margin: 1.5rem 0;
  padding-left: 1rem;
  color: #52525b;
  font-style: italic;
}
.mdxld-content ul, .mdxld-content ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}
.mdxld-content li {
  margin-bottom: 0.5rem;
}
.mdxld-content img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}
.mdxld-content hr {
  border: none;
  border-top: 1px solid #e4e4e7;
  margin: 2rem 0;
}
.mdxld-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}
.mdxld-content th, .mdxld-content td {
  border: 1px solid #e4e4e7;
  padding: 0.75rem;
  text-align: left;
}
.mdxld-content th {
  background: #f4f4f5;
  font-weight: 600;
}
`

/**
 * JSON-LD script component
 */
function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

/**
 * Create MDXLD renderer middleware for HonoX
 *
 * This creates a JSX renderer that wraps content in a proper HTML document
 * with JSON-LD structured data, meta tags, and styling.
 *
 * @param options - Renderer options
 * @returns JSX renderer middleware
 *
 * @example
 * ```tsx
 * // app/routes/_renderer.tsx
 * import { mdxldRenderer } from '@mdxe/honox/renderer'
 *
 * export default mdxldRenderer({
 *   defaultTitle: 'My Site',
 *   baseUrl: 'https://example.com'
 * })
 * ```
 */
export function mdxldRenderer(options: MDXLDRendererOptions = {}) {
  const { defaultTitle = 'MDXLD', defaultStyles: includeDefaultStyles = true, styles = '', head = '' } = options

  return jsxRenderer(({ children }) => {
    return (
      <html lang='en'>
        <head>
          <meta charset='UTF-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1.0' />
          <title>{defaultTitle}</title>
          {includeDefaultStyles && <style dangerouslySetInnerHTML={{ __html: defaultStyles }} />}
          {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
          {head && <div dangerouslySetInnerHTML={{ __html: head }} />}
        </head>
        <body>
          <main class='mdxld-content'>{children}</main>
        </body>
      </html>
    )
  })
}

/**
 * Create a document renderer for MDXLD with full control
 *
 * This is a lower-level function that gives you complete control
 * over the rendering process.
 *
 * @param render - Custom render function
 * @returns JSX renderer middleware
 *
 * @example
 * ```tsx
 * // app/routes/_renderer.tsx
 * import { createDocumentRenderer } from '@mdxe/honox/renderer'
 *
 * export default createDocumentRenderer(({ children, frontmatter }) => (
 *   <html>
 *     <head>
 *       <title>{frontmatter?.title as string}</title>
 *     </head>
 *     <body>{children}</body>
 *   </html>
 * ))
 * ```
 */
export function createDocumentRenderer(
  render: (props: { children: unknown; frontmatter?: Record<string, unknown>; Layout?: FC }) => HtmlEscapedString | Promise<HtmlEscapedString>
) {
  return jsxRenderer(({ children, Layout, ...props }) => {
    return render({
      children,
      frontmatter: props as Record<string, unknown>,
      Layout,
    })
  })
}

/**
 * MDX Provider component for HonoX
 *
 * Wraps MDX content with custom components and styling.
 *
 * @example
 * ```tsx
 * import { MDXProvider } from '@mdxe/honox/renderer'
 *
 * export default function Page() {
 *   return (
 *     <MDXProvider components={{ h1: CustomH1 }}>
 *       <MDXContent />
 *     </MDXProvider>
 *   )
 * }
 * ```
 */
export function MDXProvider({
  children,
  className = 'mdxld-content',
}: {
  children: unknown
  components?: Record<string, FC>
  className?: string
}) {
  return <div class={className}>{children}</div>
}

/**
 * Structured data component for MDXLD
 *
 * Renders JSON-LD structured data in the page head.
 *
 * @example
 * ```tsx
 * <StructuredData
 *   type="BlogPost"
 *   data={{
 *     title: 'My Post',
 *     author: 'John Doe'
 *   }}
 * />
 * ```
 */
export function StructuredData({
  type,
  id,
  context = 'https://schema.org',
  data = {},
}: {
  type?: string
  id?: string
  context?: string
  data?: Record<string, unknown>
}) {
  const jsonld: Record<string, unknown> = {
    '@context': context,
    ...(type && { '@type': type }),
    ...(id && { '@id': id }),
    ...data,
  }

  return <JsonLdScript data={jsonld} />
}

/**
 * Head component for adding meta tags
 *
 * Use this in your MDX files to add custom head content.
 *
 * @example
 * ```mdx
 * import { Head } from '@mdxe/honox/renderer'
 *
 * <Head>
 *   <meta property="og:image" content="/og-image.png" />
 * </Head>
 * ```
 */
export function Head(_props: { children: unknown }): null {
  // In HonoX, head content is managed by the renderer
  // This component is a placeholder for documentation
  return null
}

export default mdxldRenderer
