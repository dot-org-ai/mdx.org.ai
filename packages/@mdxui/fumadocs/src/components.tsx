/**
 * @mdxe/fumadocs/components - React components for Fumadocs
 *
 * Provides React components for rendering MDX content and
 * documentation elements with Fumadocs.
 *
 * @packageDocumentation
 */

'use client'

import React, { type ReactNode, type ComponentType } from 'react'
import type { MDXLDDocument } from 'mdxld'
import { parse, toAst, type MDXLDAstNode } from 'mdxld'

/**
 * MDX component map type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MDXComponents = Record<string, ComponentType<any>>

/**
 * Props for MDXContent component
 */
export interface MDXContentProps {
  /** MDXLDDocument or raw MDX string */
  content: MDXLDDocument | string
  /** Custom components to use for rendering */
  components?: MDXComponents
  /** Class name for wrapper */
  className?: string
}

/**
 * Default heading component
 */
function createHeading(level: number) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return function Heading({ children, id }: { children: ReactNode; id?: string }) {
    const headingId =
      id ||
      (typeof children === 'string'
        ? children
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
        : undefined)

    return React.createElement(Tag, { id: headingId, className: `heading-${level}` }, children)
  }
}

/**
 * Default code block component
 */
function CodeBlock({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
  [key: string]: unknown
}) {
  const language = className?.replace('language-', '') || ''

  return React.createElement(
    'pre',
    { className: `code-block ${className || ''}`, 'data-language': language },
    React.createElement('code', props, children)
  )
}

/**
 * Default inline code component
 */
function InlineCode({ children }: { children: ReactNode }) {
  return React.createElement('code', { className: 'inline-code' }, children)
}

/**
 * Default components for MDX rendering
 */
export const defaultComponents: MDXComponents = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  pre: CodeBlock,
  code: InlineCode,
}

/**
 * Render an AST node to React elements
 */
function renderNode(
  node: MDXLDAstNode,
  components: MDXComponents,
  key: string | number
): ReactNode {
  switch (node.type) {
    case 'root':
      return React.createElement(
        React.Fragment,
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'heading': {
      const depth = (node.depth as number) || 1
      const Comp = components[`h${depth}`] || createHeading(depth)
      return React.createElement(
        Comp,
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )
    }

    case 'paragraph':
      return React.createElement(
        'p',
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'text':
      return node.value

    case 'strong':
      return React.createElement(
        'strong',
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'emphasis':
      return React.createElement(
        'em',
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'link':
      return React.createElement(
        'a',
        { key, href: node.url },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'image':
      return React.createElement('img', {
        key,
        src: node.url,
        alt: node.alt || '',
      })

    case 'code': {
      const Pre = components.pre || CodeBlock
      const Code = components.code || InlineCode
      return React.createElement(
        Pre,
        { key, className: node.lang ? `language-${node.lang}` : undefined },
        React.createElement(Code, {}, node.value)
      )
    }

    case 'inlineCode': {
      const Code = components.code || InlineCode
      return React.createElement(Code, { key }, node.value)
    }

    case 'list':
      return React.createElement(
        node.ordered ? 'ol' : 'ul',
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'listItem':
      return React.createElement(
        'li',
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'blockquote':
      return React.createElement(
        'blockquote',
        { key },
        node.children?.map((child, i) => renderNode(child, components, i))
      )

    case 'thematicBreak':
      return React.createElement('hr', { key })

    default:
      // For unknown types, try to render children or value
      if (node.children) {
        return React.createElement(
          'div',
          { key },
          node.children.map((child, i) => renderNode(child, components, i))
        )
      }
      if (node.value) {
        return node.value
      }
      return null
  }
}

/**
 * Render MDX content from an mdxld document
 *
 * This component parses mdxld documents and renders them
 * using React components. It supports custom component overrides.
 *
 * @example
 * ```tsx
 * import { MDXContent } from '@mdxe/fumadocs/components'
 *
 * export default function Page({ doc }) {
 *   return (
 *     <MDXContent
 *       content={doc}
 *       components={{
 *         h1: CustomHeading,
 *         code: CustomCodeBlock,
 *       }}
 *     />
 *   )
 * }
 * ```
 */
export function MDXContent({ content, components = {}, className }: MDXContentProps) {
  const doc = typeof content === 'string' ? parse(content) : content
  const ast = toAst(doc)

  const mergedComponents = { ...defaultComponents, ...components }

  return React.createElement(
    'div',
    { className: className || 'mdx-content' },
    renderNode(ast, mergedComponents, 'root')
  )
}

/**
 * Props for Frontmatter component
 */
export interface FrontmatterProps {
  /** MDXLDDocument or frontmatter data */
  data: MDXLDDocument | Record<string, unknown>
  /** Fields to display (default: all) */
  fields?: string[]
  /** Fields to exclude */
  exclude?: string[]
  /** Custom renderer for values */
  renderValue?: (key: string, value: unknown) => ReactNode
  /** Class name for wrapper */
  className?: string
}

/**
 * Display document frontmatter
 *
 * @example
 * ```tsx
 * import { Frontmatter } from '@mdxe/fumadocs/components'
 *
 * export default function Page({ doc }) {
 *   return <Frontmatter data={doc} exclude={['content']} />
 * }
 * ```
 */
export function Frontmatter({
  data,
  fields,
  exclude = [],
  renderValue,
  className,
}: FrontmatterProps) {
  const frontmatter = ('data' in data ? data.data : data) as Record<string, unknown>

  const entries = Object.entries(frontmatter).filter(([key]) => {
    if (exclude.includes(key)) return false
    if (fields && !fields.includes(key)) return false
    return true
  })

  if (entries.length === 0) return null

  return React.createElement(
    'dl',
    { className: className || 'frontmatter' },
    entries.map(([key, value]) =>
      React.createElement(
        React.Fragment,
        { key },
        React.createElement('dt', {}, key),
        React.createElement(
          'dd',
          {},
          renderValue ? renderValue(key, value) : String(value)
        )
      )
    )
  )
}

/**
 * Props for TOC component
 */
export interface TOCProps {
  /** Table of contents items */
  items: Array<{ title: string; url: string; depth: number; items?: TOCProps['items'] }>
  /** Class name for wrapper */
  className?: string
  /** Active item URL */
  activeUrl?: string
}

/**
 * Table of contents component
 *
 * @example
 * ```tsx
 * import { TOC, getTableOfContents } from '@mdxe/fumadocs'
 *
 * export default function Page({ doc }) {
 *   const toc = getTableOfContents(doc)
 *   return <TOC items={toc} />
 * }
 * ```
 */
export function TOC({ items, className, activeUrl }: TOCProps) {
  if (!items.length) return null

  const renderItems = (tocItems: TOCProps['items']): React.ReactElement =>
    React.createElement(
      'ul',
      {},
      tocItems.map((item) =>
        React.createElement(
          'li',
          { key: item.url },
          React.createElement(
            'a',
            {
              href: item.url,
              className: activeUrl === item.url ? 'active' : undefined,
            },
            item.title
          ),
          item.items && item.items.length > 0 ? renderItems(item.items) : null
        )
      )
    )

  return React.createElement('nav', { className: className || 'toc' }, renderItems(items))
}

/**
 * Props for Breadcrumbs component
 */
export interface BreadcrumbsProps {
  /** Breadcrumb items */
  items: Array<{ title: string; href: string }>
  /** Separator between items */
  separator?: ReactNode
  /** Class name for wrapper */
  className?: string
}

/**
 * Breadcrumbs component
 *
 * @example
 * ```tsx
 * import { Breadcrumbs, getBreadcrumbs } from '@mdxe/fumadocs'
 *
 * export default function Page({ slugs, pages }) {
 *   const breadcrumbs = getBreadcrumbs(slugs, pages)
 *   return <Breadcrumbs items={breadcrumbs} />
 * }
 * ```
 */
export function Breadcrumbs({ items, separator = '/', className }: BreadcrumbsProps) {
  if (!items.length) return null

  return React.createElement(
    'nav',
    { className: className || 'breadcrumbs', 'aria-label': 'Breadcrumb' },
    React.createElement(
      'ol',
      {},
      items.map((item, i) =>
        React.createElement(
          'li',
          { key: item.href },
          i > 0 &&
            React.createElement('span', { className: 'separator', 'aria-hidden': true }, separator),
          i < items.length - 1
            ? React.createElement('a', { href: item.href }, item.title)
            : React.createElement('span', { 'aria-current': 'page' }, item.title)
        )
      )
    )
  )
}

/**
 * Props for PageNavigation component
 */
export interface PageNavigationProps {
  /** Previous page */
  previous?: { title: string; href: string }
  /** Next page */
  next?: { title: string; href: string }
  /** Class name for wrapper */
  className?: string
}

/**
 * Previous/Next page navigation component
 *
 * @example
 * ```tsx
 * import { PageNavigation, getPageNavigation } from '@mdxe/fumadocs'
 *
 * export default function Page({ slugs, pages }) {
 *   const nav = getPageNavigation(slugs, pages)
 *   return (
 *     <PageNavigation
 *       previous={nav.previous && { title: nav.previous.data.title, href: '/' + nav.previous.slugs.join('/') }}
 *       next={nav.next && { title: nav.next.data.title, href: '/' + nav.next.slugs.join('/') }}
 *     />
 *   )
 * }
 * ```
 */
export function PageNavigation({ previous, next, className }: PageNavigationProps) {
  if (!previous && !next) return null

  return React.createElement(
    'nav',
    { className: className || 'page-navigation', 'aria-label': 'Page navigation' },
    previous &&
      React.createElement(
        'a',
        { href: previous.href, className: 'previous' },
        React.createElement('span', { className: 'label' }, 'Previous'),
        React.createElement('span', { className: 'title' }, previous.title)
      ),
    next &&
      React.createElement(
        'a',
        { href: next.href, className: 'next' },
        React.createElement('span', { className: 'label' }, 'Next'),
        React.createElement('span', { className: 'title' }, next.title)
      )
  )
}
