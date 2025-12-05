/**
 * @mdxui/tamagui - Tamagui components for MDX rendering
 *
 * Universal React Native & Web components for rendering MDX content
 * with Tamagui's optimized styling system.
 *
 * @packageDocumentation
 */

import React from 'react'
import {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Paragraph,
  Text,
  XStack,
  YStack,
  Separator,
  Anchor,
  Image,
} from 'tamagui'
import { parse, toAst, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'

export { parse, toAst, type MDXLDDocument, type MDXLDAstNode }

/**
 * Props for MDXDocument component
 */
export interface MDXDocumentProps {
  /**
   * MDXLD document to render
   */
  doc: MDXLDDocument

  /**
   * Custom components to override defaults
   */
  components?: Partial<MDXComponents>

  /**
   * Show frontmatter metadata
   */
  showFrontmatter?: boolean
}

/**
 * Props for MDXContent component
 */
export interface MDXContentProps {
  /**
   * Raw MDX content string
   */
  content: string

  /**
   * Custom components to override defaults
   */
  components?: Partial<MDXComponents>

  /**
   * Show frontmatter metadata
   */
  showFrontmatter?: boolean
}

/**
 * Component map for MDX elements
 */
export interface MDXComponents {
  h1: React.ComponentType<{ children: React.ReactNode }>
  h2: React.ComponentType<{ children: React.ReactNode }>
  h3: React.ComponentType<{ children: React.ReactNode }>
  h4: React.ComponentType<{ children: React.ReactNode }>
  h5: React.ComponentType<{ children: React.ReactNode }>
  h6: React.ComponentType<{ children: React.ReactNode }>
  p: React.ComponentType<{ children: React.ReactNode }>
  a: React.ComponentType<{ href: string; children: React.ReactNode }>
  strong: React.ComponentType<{ children: React.ReactNode }>
  em: React.ComponentType<{ children: React.ReactNode }>
  code: React.ComponentType<{ children: React.ReactNode }>
  pre: React.ComponentType<{ children: React.ReactNode; lang?: string }>
  blockquote: React.ComponentType<{ children: React.ReactNode }>
  ul: React.ComponentType<{ children: React.ReactNode }>
  ol: React.ComponentType<{ children: React.ReactNode }>
  li: React.ComponentType<{ children: React.ReactNode }>
  img: React.ComponentType<{ src: string; alt?: string }>
  hr: React.ComponentType<Record<string, never>>
}

/**
 * Default Tamagui MDX components
 */
export const defaultComponents: MDXComponents = {
  h1: ({ children }) => (
    <H1 marginTop="$6" marginBottom="$3">
      {children}
    </H1>
  ),
  h2: ({ children }) => (
    <H2 marginTop="$5" marginBottom="$2">
      {children}
    </H2>
  ),
  h3: ({ children }) => (
    <H3 marginTop="$4" marginBottom="$2">
      {children}
    </H3>
  ),
  h4: ({ children }) => (
    <H4 marginTop="$3" marginBottom="$2">
      {children}
    </H4>
  ),
  h5: ({ children }) => (
    <H5 marginTop="$3" marginBottom="$1">
      {children}
    </H5>
  ),
  h6: ({ children }) => (
    <H6 marginTop="$2" marginBottom="$1">
      {children}
    </H6>
  ),
  p: ({ children }) => (
    <Paragraph marginBottom="$3" lineHeight="$6">
      {children}
    </Paragraph>
  ),
  a: ({ href, children }) => (
    <Anchor href={href} color="$blue10" hoverStyle={{ color: '$blue11' }}>
      {children}
    </Anchor>
  ),
  strong: ({ children }) => <Text fontWeight="bold">{children}</Text>,
  em: ({ children }) => <Text fontStyle="italic">{children}</Text>,
  code: ({ children }) => (
    <Text
      fontFamily="$mono"
      fontSize="$2"
      backgroundColor="$gray4"
      paddingHorizontal="$1"
      borderRadius="$2"
    >
      {children}
    </Text>
  ),
  pre: ({ children }) => (
    <YStack
      backgroundColor="$gray3"
      padding="$4"
      borderRadius="$4"
      marginVertical="$3"
      overflow="hidden"
    >
      <Text fontFamily="$mono" fontSize="$2">
        {children}
      </Text>
    </YStack>
  ),
  blockquote: ({ children }) => (
    <YStack
      borderLeftWidth={4}
      borderLeftColor="$gray8"
      paddingLeft="$4"
      marginVertical="$3"
      opacity={0.9}
    >
      {children}
    </YStack>
  ),
  ul: ({ children }) => (
    <YStack marginVertical="$2" paddingLeft="$2">
      {children}
    </YStack>
  ),
  ol: ({ children }) => (
    <YStack marginVertical="$2" paddingLeft="$2">
      {children}
    </YStack>
  ),
  li: ({ children }) => (
    <XStack marginVertical="$1" gap="$2">
      <Text>•</Text>
      <Text flex={1}>{children}</Text>
    </XStack>
  ),
  img: ({ src, alt }) => (
    <Image
      source={{ uri: src }}
      width="100%"
      height={200}
      borderRadius="$4"
      marginVertical="$3"
      resizeMode="cover"
      accessibilityLabel={alt}
    />
  ),
  hr: () => <Separator marginVertical="$4" />,
}

/**
 * Render MDX document with Tamagui components
 *
 * @example
 * ```tsx
 * import { MDXDocument } from '@mdxui/tamagui'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(content)
 *
 * function MyScreen() {
 *   return <MDXDocument doc={doc} />
 * }
 * ```
 */
export function MDXDocument({
  doc,
  components: customComponents,
  showFrontmatter = false,
}: MDXDocumentProps): React.ReactElement {
  const components = { ...defaultComponents, ...customComponents }
  const ast = toAst(doc)

  return (
    <YStack>
      {showFrontmatter && Object.keys(doc.data).length > 0 && (
        <Frontmatter data={doc.data} />
      )}
      {ast.children
        .filter((n) => n.type !== 'yaml')
        .map((node, i) => (
          <ASTNode key={i} node={node} components={components} />
        ))}
    </YStack>
  )
}

/**
 * Render raw MDX content with Tamagui components
 *
 * @example
 * ```tsx
 * import { MDXContent } from '@mdxui/tamagui'
 *
 * function MyScreen() {
 *   return <MDXContent content="# Hello World" />
 * }
 * ```
 */
export function MDXContent({
  content,
  components,
  showFrontmatter = false,
}: MDXContentProps): React.ReactElement {
  const doc = parse(content)
  return <MDXDocument doc={doc} components={components} showFrontmatter={showFrontmatter} />
}

/**
 * Frontmatter display component
 */
function Frontmatter({ data }: { data: Record<string, unknown> }): React.ReactElement {
  const entries = Object.entries(data)

  return (
    <YStack
      backgroundColor="$gray2"
      padding="$3"
      borderRadius="$4"
      marginBottom="$4"
    >
      {entries.map(([key, value], i) => (
        <XStack key={i} gap="$2">
          <Text color="$gray11" fontWeight="600">
            {key}:
          </Text>
          <Text color="$gray12">{formatValue(value)}</Text>
        </XStack>
      ))}
    </YStack>
  )
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * AST node renderer
 */
function ASTNode({
  node,
  components,
}: {
  node: MDXLDAstNode
  components: MDXComponents
}): React.ReactElement | null {
  switch (node.type) {
    case 'heading': {
      const depth = (node.depth as number) || 1
      const Component = components[`h${depth}` as keyof MDXComponents] as React.ComponentType<{
        children: React.ReactNode
      }>
      return <Component>{renderChildren(node.children || [], components)}</Component>
    }

    case 'paragraph':
      return <components.p>{renderChildren(node.children || [], components)}</components.p>

    case 'text':
      return <>{node.value || ''}</>

    case 'strong':
      return <components.strong>{renderChildren(node.children || [], components)}</components.strong>

    case 'emphasis':
      return <components.em>{renderChildren(node.children || [], components)}</components.em>

    case 'inlineCode':
      return <components.code>{node.value || ''}</components.code>

    case 'code':
      return <components.pre lang={node.lang as string}>{node.value || ''}</components.pre>

    case 'link':
      return (
        <components.a href={(node.url as string) || ''}>
          {renderChildren(node.children || [], components)}
        </components.a>
      )

    case 'image':
      return <components.img src={(node.url as string) || ''} alt={node.alt as string} />

    case 'blockquote':
      return (
        <components.blockquote>
          {(node.children || []).map((child, i) => (
            <ASTNode key={i} node={child} components={components} />
          ))}
        </components.blockquote>
      )

    case 'list': {
      const ordered = node.ordered as boolean
      const ListComponent = ordered ? components.ol : components.ul
      return (
        <ListComponent>
          {(node.children || []).map((item, i) => (
            <components.li key={i}>{renderChildren(item.children || [], components)}</components.li>
          ))}
        </ListComponent>
      )
    }

    case 'thematicBreak':
      return <components.hr />

    default:
      if (node.children && node.children.length > 0) {
        return (
          <YStack>
            {node.children.map((child, i) => (
              <ASTNode key={i} node={child} components={components} />
            ))}
          </YStack>
        )
      }
      if (node.value) {
        return <Text>{node.value}</Text>
      }
      return null
  }
}

/**
 * Render children nodes
 */
function renderChildren(children: MDXLDAstNode[], components: MDXComponents): React.ReactNode[] {
  return children.map((child, i) => <ASTNode key={i} node={child} components={components} />)
}

// Re-export from themes and primitives
export * from './themes'
export * from './primitives'
