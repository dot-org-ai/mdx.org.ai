/**
 * @mdxui/gluestack - Gluestack UI components for MDX rendering
 *
 * Accessible, NativeWind-based components for rendering MDX content
 * in React Native and web applications.
 *
 * @packageDocumentation
 */

import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Link,
  LinkText,
  Image,
  Divider,
  Pressable,
} from '@gluestack-ui/themed'
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

  /**
   * Additional className for NativeWind styling
   */
  className?: string
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

  /**
   * Additional className for NativeWind styling
   */
  className?: string
}

/**
 * Component map for MDX elements
 */
export interface MDXComponents {
  h1: React.ComponentType<{ children: React.ReactNode; className?: string }>
  h2: React.ComponentType<{ children: React.ReactNode; className?: string }>
  h3: React.ComponentType<{ children: React.ReactNode; className?: string }>
  h4: React.ComponentType<{ children: React.ReactNode; className?: string }>
  h5: React.ComponentType<{ children: React.ReactNode; className?: string }>
  h6: React.ComponentType<{ children: React.ReactNode; className?: string }>
  p: React.ComponentType<{ children: React.ReactNode; className?: string }>
  a: React.ComponentType<{ href: string; children: React.ReactNode; className?: string }>
  strong: React.ComponentType<{ children: React.ReactNode }>
  em: React.ComponentType<{ children: React.ReactNode }>
  code: React.ComponentType<{ children: React.ReactNode; className?: string }>
  pre: React.ComponentType<{ children: React.ReactNode; lang?: string; className?: string }>
  blockquote: React.ComponentType<{ children: React.ReactNode; className?: string }>
  ul: React.ComponentType<{ children: React.ReactNode; className?: string }>
  ol: React.ComponentType<{ children: React.ReactNode; className?: string }>
  li: React.ComponentType<{ children: React.ReactNode; className?: string }>
  img: React.ComponentType<{ src: string; alt?: string; className?: string }>
  hr: React.ComponentType<{ className?: string }>
}

/**
 * Default Gluestack MDX components
 */
export const defaultComponents: MDXComponents = {
  h1: ({ children, className }) => (
    <Heading size="3xl" className={className} marginTop="$6" marginBottom="$3">
      {children}
    </Heading>
  ),
  h2: ({ children, className }) => (
    <Heading size="2xl" className={className} marginTop="$5" marginBottom="$2">
      {children}
    </Heading>
  ),
  h3: ({ children, className }) => (
    <Heading size="xl" className={className} marginTop="$4" marginBottom="$2">
      {children}
    </Heading>
  ),
  h4: ({ children, className }) => (
    <Heading size="lg" className={className} marginTop="$3" marginBottom="$2">
      {children}
    </Heading>
  ),
  h5: ({ children, className }) => (
    <Heading size="md" className={className} marginTop="$3" marginBottom="$1">
      {children}
    </Heading>
  ),
  h6: ({ children, className }) => (
    <Heading size="sm" className={className} marginTop="$2" marginBottom="$1">
      {children}
    </Heading>
  ),
  p: ({ children, className }) => (
    <Text className={className} marginBottom="$3" lineHeight="$lg">
      {children}
    </Text>
  ),
  a: ({ href, children, className }) => (
    <Link href={href} className={className}>
      <LinkText color="$blue600">{children}</LinkText>
    </Link>
  ),
  strong: ({ children }) => <Text bold>{children}</Text>,
  em: ({ children }) => <Text italic>{children}</Text>,
  code: ({ children, className }) => (
    <Text
      className={className}
      fontFamily="$mono"
      fontSize="$sm"
      bg="$backgroundLight200"
      px="$1"
      borderRadius="$sm"
      sx={{
        _dark: {
          bg: '$backgroundDark800',
        },
      }}
    >
      {children}
    </Text>
  ),
  pre: ({ children, className }) => (
    <Box
      className={className}
      bg="$backgroundLight100"
      p="$4"
      borderRadius="$lg"
      marginVertical="$3"
      sx={{
        _dark: {
          bg: '$backgroundDark900',
        },
      }}
    >
      <Text fontFamily="$mono" fontSize="$sm">
        {children}
      </Text>
    </Box>
  ),
  blockquote: ({ children, className }) => (
    <Box
      className={className}
      borderLeftWidth={4}
      borderLeftColor="$borderLight300"
      pl="$4"
      marginVertical="$3"
      opacity={0.9}
      sx={{
        _dark: {
          borderLeftColor: '$borderDark700',
        },
      }}
    >
      {children}
    </Box>
  ),
  ul: ({ children, className }) => (
    <VStack className={className} marginVertical="$2" pl="$2" space="xs">
      {children}
    </VStack>
  ),
  ol: ({ children, className }) => (
    <VStack className={className} marginVertical="$2" pl="$2" space="xs">
      {children}
    </VStack>
  ),
  li: ({ children, className }) => (
    <HStack className={className} marginVertical="$1" space="sm" alignItems="flex-start">
      <Text>•</Text>
      <Text flex={1}>{children}</Text>
    </HStack>
  ),
  img: ({ src, alt, className }) => (
    <Image
      className={className}
      source={{ uri: src }}
      alt={alt || ''}
      width="100%"
      height={200}
      borderRadius="$lg"
      marginVertical="$3"
      resizeMode="cover"
    />
  ),
  hr: ({ className }) => <Divider className={className} marginVertical="$4" />,
}

/**
 * Render MDX document with Gluestack components
 *
 * @example
 * ```tsx
 * import { MDXDocument } from '@mdxui/gluestack'
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
  className,
}: MDXDocumentProps): React.ReactElement {
  const components = { ...defaultComponents, ...customComponents }
  const ast = toAst(doc)

  return (
    <VStack className={className}>
      {showFrontmatter && Object.keys(doc.data).length > 0 && (
        <Frontmatter data={doc.data} />
      )}
      {ast.children
        .filter((n) => n.type !== 'yaml')
        .map((node, i) => (
          <ASTNode key={i} node={node} components={components} />
        ))}
    </VStack>
  )
}

/**
 * Render raw MDX content with Gluestack components
 *
 * @example
 * ```tsx
 * import { MDXContent } from '@mdxui/gluestack'
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
  className,
}: MDXContentProps): React.ReactElement {
  const doc = parse(content)
  return (
    <MDXDocument
      doc={doc}
      components={components}
      showFrontmatter={showFrontmatter}
      className={className}
    />
  )
}

/**
 * Frontmatter display component
 */
function Frontmatter({ data }: { data: Record<string, unknown> }): React.ReactElement {
  const entries = Object.entries(data)

  return (
    <Box
      bg="$backgroundLight100"
      p="$3"
      borderRadius="$lg"
      marginBottom="$4"
      sx={{
        _dark: {
          bg: '$backgroundDark800',
        },
      }}
    >
      {entries.map(([key, value], i) => (
        <HStack key={i} space="sm">
          <Text color="$textLight600" fontWeight="$semibold">
            {key}:
          </Text>
          <Text color="$textLight900">{formatValue(value)}</Text>
        </HStack>
      ))}
    </Box>
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
          <VStack>
            {node.children.map((child, i) => (
              <ASTNode key={i} node={child} components={components} />
            ))}
          </VStack>
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
