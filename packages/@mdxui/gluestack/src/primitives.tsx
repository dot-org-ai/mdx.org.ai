/**
 * @mdxui/gluestack/primitives - Low-level styled primitives
 *
 * Provides accessible, styled components for building custom MDX renderers
 * using Gluestack UI.
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
  type BoxProps,
} from '@gluestack-ui/themed'

/**
 * Prose container - optimized width and padding for reading
 */
export function Prose({
  children,
  maxWidth = 680,
  ...props
}: BoxProps & { maxWidth?: number; children: React.ReactNode }) {
  return (
    <Box maxWidth={maxWidth} width="100%" px="$4" {...props}>
      {children}
    </Box>
  )
}

/**
 * Article wrapper with proper spacing
 */
export function Article({ children, ...props }: BoxProps & { children: React.ReactNode }) {
  return (
    <VStack space="md" py="$4" {...props}>
      {children}
    </VStack>
  )
}

/**
 * Section with semantic spacing
 */
export function Section({ children, ...props }: BoxProps & { children: React.ReactNode }) {
  return (
    <VStack space="lg" my="$4" {...props}>
      {children}
    </VStack>
  )
}

/**
 * MDX Heading components
 */
export function MDXHeading1({ children }: { children: React.ReactNode }) {
  return (
    <Heading size="3xl" mt="$6" mb="$3" fontWeight="$extrabold" letterSpacing="$tight">
      {children}
    </Heading>
  )
}

export function MDXHeading2({ children }: { children: React.ReactNode }) {
  return (
    <Heading size="2xl" mt="$5" mb="$2" fontWeight="$bold" letterSpacing="$tight">
      {children}
    </Heading>
  )
}

export function MDXHeading3({ children }: { children: React.ReactNode }) {
  return (
    <Heading size="xl" mt="$4" mb="$2" fontWeight="$semibold">
      {children}
    </Heading>
  )
}

export function MDXHeading4({ children }: { children: React.ReactNode }) {
  return (
    <Heading size="lg" mt="$3" mb="$2" fontWeight="$semibold">
      {children}
    </Heading>
  )
}

export function MDXHeading5({ children }: { children: React.ReactNode }) {
  return (
    <Heading size="md" mt="$3" mb="$1" fontWeight="$semibold">
      {children}
    </Heading>
  )
}

export function MDXHeading6({ children }: { children: React.ReactNode }) {
  return (
    <Heading size="sm" mt="$2" mb="$1" fontWeight="$semibold">
      {children}
    </Heading>
  )
}

/**
 * MDX Paragraph with proper line height
 */
export function MDXParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Text mb="$3" lineHeight="$lg">
      {children}
    </Text>
  )
}

/**
 * Inline code span
 */
export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontFamily="$mono"
      fontSize="$sm"
      bg="$backgroundLight200"
      px="$1"
      py="$0.5"
      borderRadius="$sm"
      sx={{
        _dark: {
          bg: '$backgroundDark800',
        },
      }}
    >
      {children}
    </Text>
  )
}

/**
 * Code block container
 */
export function CodeBlock({
  children,
  language,
}: {
  children: React.ReactNode
  language?: string
}) {
  return (
    <Box
      bg="$backgroundLight100"
      p="$4"
      borderRadius="$lg"
      my="$3"
      overflow="hidden"
      sx={{
        _dark: {
          bg: '$backgroundDark900',
        },
      }}
    >
      {language && (
        <Text fontSize="$xs" color="$textLight500" mb="$2">
          {language}
        </Text>
      )}
      <Text fontFamily="$mono" fontSize="$sm" lineHeight="$md">
        {children}
      </Text>
    </Box>
  )
}

/**
 * Blockquote container
 */
export function Blockquote({ children }: { children: React.ReactNode }) {
  return (
    <Box
      borderLeftWidth={4}
      borderLeftColor="$borderLight300"
      pl="$4"
      my="$3"
      opacity={0.9}
      sx={{
        _dark: {
          borderLeftColor: '$borderDark700',
        },
      }}
    >
      {children}
    </Box>
  )
}

/**
 * Unordered list container
 */
export function UnorderedList({ children }: { children: React.ReactNode }) {
  return (
    <VStack my="$2" pl="$2" space="xs">
      {children}
    </VStack>
  )
}

/**
 * Ordered list container
 */
export function OrderedList({ children }: { children: React.ReactNode }) {
  return (
    <VStack my="$2" pl="$2" space="xs">
      {children}
    </VStack>
  )
}

/**
 * List item
 */
export function ListItem({
  children,
  bullet = '•',
}: {
  children: React.ReactNode
  bullet?: string
}) {
  return (
    <HStack my="$1" space="sm" alignItems="flex-start">
      <Text color="$textLight600">{bullet}</Text>
      <Text flex={1} lineHeight="$md">
        {children}
      </Text>
    </HStack>
  )
}

/**
 * Horizontal rule
 */
export function HorizontalRule() {
  return <Divider my="$4" />
}

/**
 * Link with proper styling
 */
export function MDXLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <LinkText
        color="$blue600"
        sx={{
          ':hover': {
            color: '$blue700',
          },
          _dark: {
            color: '$blue400',
            ':hover': {
              color: '$blue300',
            },
          },
        }}
      >
        {children}
      </LinkText>
    </Link>
  )
}

/**
 * Image with responsive sizing
 */
export function MDXImage({ src, alt }: { src: string; alt?: string }) {
  return (
    <Image
      source={{ uri: src }}
      alt={alt || ''}
      width="100%"
      height={200}
      borderRadius="$lg"
      my="$3"
      resizeMode="cover"
    />
  )
}

/**
 * Figure with caption
 */
export function Figure({
  src,
  alt,
  caption,
}: {
  src: string
  alt?: string
  caption?: string
}) {
  return (
    <VStack my="$4" alignItems="center" space="sm">
      <MDXImage src={src} alt={alt} />
      {caption && (
        <Text fontSize="$sm" color="$textLight500" textAlign="center">
          {caption}
        </Text>
      )}
    </VStack>
  )
}

/**
 * Callout/Admonition types
 */
export type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'note'

/**
 * Callout/Admonition box
 */
export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: CalloutType
  title?: string
  children: React.ReactNode
}) {
  const colors = {
    info: { bg: '$blue50', border: '$blue500', icon: 'info' },
    warning: { bg: '$yellow50', border: '$yellow500', icon: 'alert-triangle' },
    error: { bg: '$red50', border: '$red500', icon: 'alert-circle' },
    success: { bg: '$green50', border: '$green500', icon: 'check-circle' },
    note: { bg: '$gray50', border: '$gray500', icon: 'bookmark' },
  }

  const color = colors[type]

  return (
    <Box
      bg={color.bg}
      borderLeftWidth={4}
      borderLeftColor={color.border}
      p="$4"
      borderRadius="$lg"
      my="$3"
      sx={{
        _dark: {
          bg: `${color.bg.replace('50', '900')}/20`,
        },
      }}
    >
      {title && (
        <Text fontWeight="$semibold" mb="$1">
          {title}
        </Text>
      )}
      <Text>{children}</Text>
    </Box>
  )
}

/**
 * Table components
 */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <Box
      borderWidth={1}
      borderColor="$borderLight300"
      borderRadius="$lg"
      overflow="hidden"
      my="$3"
      sx={{
        _dark: {
          borderColor: '$borderDark700',
        },
      }}
    >
      {children}
    </Box>
  )
}

export function TableRow({
  children,
  isHeader = false,
}: {
  children: React.ReactNode
  isHeader?: boolean
}) {
  return (
    <HStack
      borderBottomWidth={1}
      borderBottomColor="$borderLight300"
      bg={isHeader ? '$backgroundLight100' : undefined}
      sx={{
        _dark: {
          borderBottomColor: '$borderDark700',
          bg: isHeader ? '$backgroundDark800' : undefined,
        },
      }}
    >
      {children}
    </HStack>
  )
}

export function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      flex={1}
      p="$3"
      borderRightWidth={1}
      borderRightColor="$borderLight300"
      sx={{
        _dark: {
          borderRightColor: '$borderDark700',
        },
        ':last-child': {
          borderRightWidth: 0,
        },
      }}
    >
      <Text>{children}</Text>
    </Box>
  )
}

/**
 * Keyboard shortcut display
 */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontFamily="$mono"
      fontSize="$xs"
      bg="$backgroundLight200"
      px="$1.5"
      py="$0.5"
      borderRadius="$sm"
      borderWidth={1}
      borderColor="$borderLight400"
      sx={{
        _dark: {
          bg: '$backgroundDark700',
          borderColor: '$borderDark600',
        },
      }}
    >
      {children}
    </Text>
  )
}

/**
 * Badge/Tag component
 */
export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}) {
  const colors = {
    default: { bg: '$gray100', text: '$gray800' },
    success: { bg: '$green100', text: '$green800' },
    warning: { bg: '$yellow100', text: '$yellow800' },
    error: { bg: '$red100', text: '$red800' },
    info: { bg: '$blue100', text: '$blue800' },
  }

  const color = colors[variant]

  return (
    <Text
      fontSize="$xs"
      fontWeight="$medium"
      bg={color.bg}
      color={color.text}
      px="$2"
      py="$0.5"
      borderRadius="$full"
    >
      {children}
    </Text>
  )
}
