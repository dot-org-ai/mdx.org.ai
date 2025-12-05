/**
 * @mdxui/tamagui/primitives - Low-level styled primitives
 *
 * Provides styled Tamagui primitives for building custom MDX components.
 *
 * @packageDocumentation
 */

import { styled, Text, YStack, XStack, Paragraph as TamaguiParagraph, H1 as TamaguiH1, H2 as TamaguiH2, H3 as TamaguiH3, H4 as TamaguiH4, H5 as TamaguiH5, H6 as TamaguiH6 } from 'tamagui'

/**
 * Prose container - optimized for reading long-form content
 */
export const Prose = styled(YStack, {
  name: 'Prose',
  maxWidth: 680,
  width: '100%',
  paddingHorizontal: '$4',
  gap: '$2',
})

/**
 * Article wrapper with proper spacing
 */
export const Article = styled(YStack, {
  name: 'Article',
  gap: '$3',
  paddingVertical: '$4',
})

/**
 * Section with semantic spacing
 */
export const Section = styled(YStack, {
  name: 'Section',
  gap: '$4',
  marginVertical: '$4',
})

/**
 * MDX Heading 1 - Large title
 */
export const Heading1 = styled(TamaguiH1, {
  name: 'MDXHeading1',
  marginTop: '$6',
  marginBottom: '$3',
  fontWeight: '800',
  letterSpacing: -1,
})

/**
 * MDX Heading 2 - Section title
 */
export const Heading2 = styled(TamaguiH2, {
  name: 'MDXHeading2',
  marginTop: '$5',
  marginBottom: '$2',
  fontWeight: '700',
  letterSpacing: -0.5,
})

/**
 * MDX Heading 3 - Subsection title
 */
export const Heading3 = styled(TamaguiH3, {
  name: 'MDXHeading3',
  marginTop: '$4',
  marginBottom: '$2',
  fontWeight: '600',
})

/**
 * MDX Heading 4
 */
export const Heading4 = styled(TamaguiH4, {
  name: 'MDXHeading4',
  marginTop: '$3',
  marginBottom: '$2',
  fontWeight: '600',
})

/**
 * MDX Heading 5
 */
export const Heading5 = styled(TamaguiH5, {
  name: 'MDXHeading5',
  marginTop: '$3',
  marginBottom: '$1',
  fontWeight: '600',
})

/**
 * MDX Heading 6
 */
export const Heading6 = styled(TamaguiH6, {
  name: 'MDXHeading6',
  marginTop: '$2',
  marginBottom: '$1',
  fontWeight: '600',
})

/**
 * MDX Paragraph with proper line height
 */
export const Paragraph = styled(TamaguiParagraph, {
  name: 'MDXParagraph',
  marginBottom: '$3',
  lineHeight: '$6',
})

/**
 * Inline code span
 */
export const InlineCode = styled(Text, {
  name: 'InlineCode',
  fontFamily: '$mono',
  fontSize: '$2',
  backgroundColor: '$gray4',
  paddingHorizontal: '$1',
  paddingVertical: '$0.5',
  borderRadius: '$2',
})

/**
 * Code block container
 */
export const CodeBlock = styled(YStack, {
  name: 'CodeBlock',
  backgroundColor: '$gray3',
  padding: '$4',
  borderRadius: '$4',
  marginVertical: '$3',
  overflow: 'hidden',

  variants: {
    language: {
      typescript: {
        backgroundColor: '$blue2',
      },
      javascript: {
        backgroundColor: '$yellow2',
      },
      python: {
        backgroundColor: '$green2',
      },
      rust: {
        backgroundColor: '$orange2',
      },
      go: {
        backgroundColor: '$cyan2',
      },
    },
  },
})

/**
 * Code text styling
 */
export const CodeText = styled(Text, {
  name: 'CodeText',
  fontFamily: '$mono',
  fontSize: '$2',
  lineHeight: '$4',
})

/**
 * Blockquote container
 */
export const Blockquote = styled(YStack, {
  name: 'Blockquote',
  borderLeftWidth: 4,
  borderLeftColor: '$gray8',
  paddingLeft: '$4',
  marginVertical: '$3',
  opacity: 0.9,
})

/**
 * Unordered list container
 */
export const UnorderedList = styled(YStack, {
  name: 'UnorderedList',
  marginVertical: '$2',
  paddingLeft: '$2',
  gap: '$1',
})

/**
 * Ordered list container
 */
export const OrderedList = styled(YStack, {
  name: 'OrderedList',
  marginVertical: '$2',
  paddingLeft: '$2',
  gap: '$1',
})

/**
 * List item container
 */
export const ListItem = styled(XStack, {
  name: 'ListItem',
  marginVertical: '$1',
  gap: '$2',
  alignItems: 'flex-start',
})

/**
 * List bullet/number
 */
export const ListBullet = styled(Text, {
  name: 'ListBullet',
  width: 20,
  color: '$gray10',
})

/**
 * List item content
 */
export const ListContent = styled(Text, {
  name: 'ListContent',
  flex: 1,
  lineHeight: '$5',
})

/**
 * Horizontal rule
 */
export const HorizontalRule = styled(YStack, {
  name: 'HorizontalRule',
  height: 1,
  backgroundColor: '$gray6',
  marginVertical: '$4',
})

/**
 * Link text styling
 */
export const LinkText = styled(Text, {
  name: 'LinkText',
  color: '$blue10',
  textDecorationLine: 'underline',

  hoverStyle: {
    color: '$blue11',
  },

  pressStyle: {
    color: '$blue9',
  },
})

/**
 * Image container with responsive sizing
 */
export const ImageContainer = styled(YStack, {
  name: 'ImageContainer',
  width: '100%',
  marginVertical: '$3',
  borderRadius: '$4',
  overflow: 'hidden',
})

/**
 * Figure with caption support
 */
export const Figure = styled(YStack, {
  name: 'Figure',
  marginVertical: '$4',
  gap: '$2',
  alignItems: 'center',
})

/**
 * Figure caption
 */
export const FigureCaption = styled(Text, {
  name: 'FigureCaption',
  fontSize: '$2',
  color: '$gray11',
  textAlign: 'center',
})

/**
 * Table container
 */
export const Table = styled(YStack, {
  name: 'Table',
  borderWidth: 1,
  borderColor: '$gray6',
  borderRadius: '$4',
  overflow: 'hidden',
  marginVertical: '$3',
})

/**
 * Table row
 */
export const TableRow = styled(XStack, {
  name: 'TableRow',
  borderBottomWidth: 1,
  borderBottomColor: '$gray6',

  variants: {
    header: {
      true: {
        backgroundColor: '$gray3',
        fontWeight: '600',
      },
    },
  },
})

/**
 * Table cell
 */
export const TableCell = styled(YStack, {
  name: 'TableCell',
  flex: 1,
  padding: '$3',
  borderRightWidth: 1,
  borderRightColor: '$gray6',
})

/**
 * Callout/Admonition box
 */
export const Callout = styled(YStack, {
  name: 'Callout',
  padding: '$4',
  borderRadius: '$4',
  marginVertical: '$3',
  gap: '$2',

  variants: {
    type: {
      info: {
        backgroundColor: '$blue2',
        borderLeftWidth: 4,
        borderLeftColor: '$blue8',
      },
      warning: {
        backgroundColor: '$yellow2',
        borderLeftWidth: 4,
        borderLeftColor: '$yellow8',
      },
      error: {
        backgroundColor: '$red2',
        borderLeftWidth: 4,
        borderLeftColor: '$red8',
      },
      success: {
        backgroundColor: '$green2',
        borderLeftWidth: 4,
        borderLeftColor: '$green8',
      },
      note: {
        backgroundColor: '$gray2',
        borderLeftWidth: 4,
        borderLeftColor: '$gray8',
      },
    },
  },

  defaultVariants: {
    type: 'note',
  },
})

/**
 * Callout title
 */
export const CalloutTitle = styled(Text, {
  name: 'CalloutTitle',
  fontWeight: '600',
  marginBottom: '$1',
})
