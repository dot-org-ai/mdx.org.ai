/**
 * @mdxe/expo/components - React Native components for MDX rendering
 *
 * Provides base components for rendering MDX content in React Native.
 * These components map MDX elements to React Native primitives.
 *
 * @packageDocumentation
 */

import React from 'react'
import { Text, View, Image, Pressable, Linking, StyleSheet } from 'react-native'
import { parse, toAst, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'

/**
 * Theme configuration for React Native rendering
 */
export interface Theme {
  colors: {
    text: string
    heading: string
    link: string
    code: string
    codeBackground: string
    blockquote: string
    border: string
  }
  fonts: {
    body: string
    heading: string
    mono: string
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
  }
  fontSize: {
    xs: number
    sm: number
    base: number
    lg: number
    xl: number
    '2xl': number
    '3xl': number
    '4xl': number
  }
}

/**
 * Default light theme
 */
export const defaultTheme: Theme = {
  colors: {
    text: '#1a1a1a',
    heading: '#000000',
    link: '#0066cc',
    code: '#e83e8c',
    codeBackground: '#f4f4f4',
    blockquote: '#666666',
    border: '#e0e0e0',
  },
  fonts: {
    body: 'System',
    heading: 'System',
    mono: 'monospace',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
}

/**
 * Default dark theme
 */
export const darkTheme: Theme = {
  ...defaultTheme,
  colors: {
    text: '#e0e0e0',
    heading: '#ffffff',
    link: '#66b3ff',
    code: '#ff79c6',
    codeBackground: '#2d2d2d',
    blockquote: '#999999',
    border: '#404040',
  },
}

/**
 * Props for MDXDocument component
 */
export interface MDXDocumentProps {
  /**
   * MDXLD document to render
   */
  doc: MDXLDDocument

  /**
   * Theme to use
   */
  theme?: Theme

  /**
   * Custom components to override defaults
   */
  components?: Partial<MDXComponents>
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
   * Theme to use
   */
  theme?: Theme

  /**
   * Custom components to override defaults
   */
  components?: Partial<MDXComponents>
}

/**
 * Component map for MDX elements
 * Note: children is optional in type since React.createElement passes it as 3rd argument
 */
export interface MDXComponents {
  h1: React.ComponentType<{ children?: React.ReactNode }>
  h2: React.ComponentType<{ children?: React.ReactNode }>
  h3: React.ComponentType<{ children?: React.ReactNode }>
  h4: React.ComponentType<{ children?: React.ReactNode }>
  h5: React.ComponentType<{ children?: React.ReactNode }>
  h6: React.ComponentType<{ children?: React.ReactNode }>
  p: React.ComponentType<{ children?: React.ReactNode }>
  a: React.ComponentType<{ href: string; children?: React.ReactNode }>
  strong: React.ComponentType<{ children?: React.ReactNode }>
  em: React.ComponentType<{ children?: React.ReactNode }>
  code: React.ComponentType<{ children?: React.ReactNode }>
  pre: React.ComponentType<{ children?: React.ReactNode }>
  blockquote: React.ComponentType<{ children?: React.ReactNode }>
  ul: React.ComponentType<{ children?: React.ReactNode }>
  ol: React.ComponentType<{ children?: React.ReactNode }>
  li: React.ComponentType<{ children?: React.ReactNode }>
  img: React.ComponentType<{ src: string; alt?: string }>
  hr: React.ComponentType<Record<string, never>>
}

/**
 * Create default MDX components with theme
 */
export function createMDXComponents(theme: Theme): MDXComponents {
  const styles = createStyles(theme)

  return {
    h1: ({ children }) =>
      React.createElement(Text, { style: styles.h1 }, children),
    h2: ({ children }) =>
      React.createElement(Text, { style: styles.h2 }, children),
    h3: ({ children }) =>
      React.createElement(Text, { style: styles.h3 }, children),
    h4: ({ children }) =>
      React.createElement(Text, { style: styles.h4 }, children),
    h5: ({ children }) =>
      React.createElement(Text, { style: styles.h5 }, children),
    h6: ({ children }) =>
      React.createElement(Text, { style: styles.h6 }, children),
    p: ({ children }) =>
      React.createElement(Text, { style: styles.p }, children),
    a: ({ href, children }) =>
      React.createElement(
        Pressable,
        { onPress: () => Linking.openURL(href) },
        React.createElement(Text, { style: styles.a }, children)
      ),
    strong: ({ children }) =>
      React.createElement(Text, { style: styles.strong }, children),
    em: ({ children }) =>
      React.createElement(Text, { style: styles.em }, children),
    code: ({ children }) =>
      React.createElement(Text, { style: styles.code }, children),
    pre: ({ children }) =>
      React.createElement(View, { style: styles.pre }, children),
    blockquote: ({ children }) =>
      React.createElement(View, { style: styles.blockquote }, children),
    ul: ({ children }) =>
      React.createElement(View, { style: styles.ul }, children),
    ol: ({ children }) =>
      React.createElement(View, { style: styles.ol }, children),
    li: ({ children }) =>
      React.createElement(
        View,
        { style: styles.li },
        React.createElement(Text, { style: styles.bullet }, '•'),
        React.createElement(Text, { style: styles.liText }, children)
      ),
    img: ({ src, alt }) =>
      React.createElement(Image, {
        source: { uri: src },
        style: styles.img,
        accessibilityLabel: alt,
      }),
    hr: () => React.createElement(View, { style: styles.hr }),
  }
}

/**
 * Create styles from theme
 */
function createStyles(theme: Theme) {
  return StyleSheet.create({
    h1: {
      fontSize: theme.fontSize['4xl'],
      fontWeight: 'bold',
      color: theme.colors.heading,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    h2: {
      fontSize: theme.fontSize['3xl'],
      fontWeight: 'bold',
      color: theme.colors.heading,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    h3: {
      fontSize: theme.fontSize['2xl'],
      fontWeight: 'bold',
      color: theme.colors.heading,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    h4: {
      fontSize: theme.fontSize.xl,
      fontWeight: 'bold',
      color: theme.colors.heading,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    h5: {
      fontSize: theme.fontSize.lg,
      fontWeight: 'bold',
      color: theme.colors.heading,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    h6: {
      fontSize: theme.fontSize.base,
      fontWeight: 'bold',
      color: theme.colors.heading,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    p: {
      fontSize: theme.fontSize.base,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      lineHeight: theme.fontSize.base * 1.6,
    },
    a: {
      color: theme.colors.link,
      textDecorationLine: 'underline',
    },
    strong: {
      fontWeight: 'bold',
    },
    em: {
      fontStyle: 'italic',
    },
    code: {
      fontFamily: theme.fonts.mono,
      fontSize: theme.fontSize.sm,
      color: theme.colors.code,
      backgroundColor: theme.colors.codeBackground,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: 4,
    },
    pre: {
      backgroundColor: theme.colors.codeBackground,
      padding: theme.spacing.md,
      borderRadius: 8,
      marginVertical: theme.spacing.md,
    },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.border,
      paddingLeft: theme.spacing.md,
      marginVertical: theme.spacing.md,
    },
    ul: {
      marginVertical: theme.spacing.sm,
    },
    ol: {
      marginVertical: theme.spacing.sm,
    },
    li: {
      flexDirection: 'row',
      marginVertical: theme.spacing.xs,
    },
    bullet: {
      width: 20,
      color: theme.colors.text,
    },
    liText: {
      flex: 1,
      color: theme.colors.text,
      fontSize: theme.fontSize.base,
    },
    img: {
      width: '100%',
      height: 200,
      resizeMode: 'cover',
      borderRadius: 8,
      marginVertical: theme.spacing.md,
    },
    hr: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
  })
}

/**
 * Render MDX document to React Native components
 *
 * @example
 * ```tsx
 * import { MDXDocument } from '@mdxe/expo/components'
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
  theme = defaultTheme,
  components: customComponents,
}: MDXDocumentProps): React.ReactElement {
  const components = {
    ...createMDXComponents(theme),
    ...customComponents,
  }
  const ast = toAst(doc)

  return React.createElement(
    View,
    null,
    ast.children
      .filter((n) => n.type !== 'yaml')
      .map((node, i) =>
        React.createElement(ASTNode, { key: i, node, components, theme })
      )
  )
}

/**
 * Render raw MDX content to React Native components
 *
 * @example
 * ```tsx
 * import { MDXContent } from '@mdxe/expo/components'
 *
 * function MyScreen() {
 *   return <MDXContent content="# Hello World" />
 * }
 * ```
 */
export function MDXContent({
  content,
  theme = defaultTheme,
  components,
}: MDXContentProps): React.ReactElement {
  const doc = parse(content)
  return React.createElement(MDXDocument, { doc, theme, components })
}

/**
 * AST node renderer
 */
function ASTNode({
  node,
  components,
  theme,
}: {
  node: MDXLDAstNode
  components: MDXComponents
  theme: Theme
}): React.ReactElement | null {
  switch (node.type) {
    case 'heading': {
      const depth = (node.depth as number) || 1
      const Component = components[`h${depth}` as keyof MDXComponents] as React.ComponentType<{
        children: React.ReactNode
      }>
      return React.createElement(
        Component,
        null,
        renderChildren(node.children || [], components, theme)
      )
    }

    case 'paragraph':
      return React.createElement(
        components.p,
        null,
        renderChildren(node.children || [], components, theme)
      )

    case 'text':
      return React.createElement(Text, null, node.value || '')

    case 'strong':
      return React.createElement(
        components.strong,
        null,
        renderChildren(node.children || [], components, theme)
      )

    case 'emphasis':
      return React.createElement(
        components.em,
        null,
        renderChildren(node.children || [], components, theme)
      )

    case 'inlineCode':
      return React.createElement(components.code, null, node.value || '')

    case 'code':
      return React.createElement(
        components.pre,
        null,
        React.createElement(components.code, null, node.value || '')
      )

    case 'link':
      return React.createElement(
        components.a,
        { href: node.url as string || '' },
        renderChildren(node.children || [], components, theme)
      )

    case 'image':
      return React.createElement(components.img, {
        src: node.url as string || '',
        alt: node.alt as string,
      })

    case 'blockquote':
      return React.createElement(
        components.blockquote,
        null,
        (node.children || []).map((child, i) =>
          React.createElement(ASTNode, { key: i, node: child, components, theme })
        )
      )

    case 'list': {
      const ordered = node.ordered as boolean
      const ListComponent = ordered ? components.ol : components.ul
      return React.createElement(
        ListComponent,
        null,
        (node.children || []).map((item, i) =>
          React.createElement(
            components.li,
            { key: i },
            renderChildren(item.children || [], components, theme)
          )
        )
      )
    }

    case 'thematicBreak':
      return React.createElement(components.hr)

    default:
      if (node.children && node.children.length > 0) {
        return React.createElement(
          View,
          null,
          node.children.map((child, i) =>
            React.createElement(ASTNode, { key: i, node: child, components, theme })
          )
        )
      }
      if (node.value) {
        return React.createElement(Text, null, node.value)
      }
      return null
  }
}

/**
 * Render children nodes
 */
function renderChildren(
  children: MDXLDAstNode[],
  components: MDXComponents,
  theme: Theme
): React.ReactNode[] {
  return children.map((child, i) =>
    React.createElement(ASTNode, { key: i, node: child, components, theme })
  )
}

// Re-export types
export type { MDXLDDocument, MDXLDAstNode } from 'mdxld'
