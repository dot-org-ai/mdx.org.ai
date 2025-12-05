import { describe, it, expect } from 'vitest'
import {
  Prose,
  Article,
  Section,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Paragraph,
  InlineCode,
  CodeBlock,
  Blockquote,
  UnorderedList,
  OrderedList,
  ListItem,
  ListBullet,
  ListContent,
  HorizontalRule,
  LinkText,
  ImageContainer,
  Figure,
  FigureCaption,
  Table,
  TableRow,
  TableCell,
  Callout,
  CalloutTitle,
} from './primitives.js'

describe('@mdxui/tamagui/primitives', () => {
  describe('layout primitives', () => {
    it('should export Prose component', () => {
      expect(Prose).toBeDefined()
      expect(typeof Prose).toBe('object') // styled component
    })

    it('should export Article component', () => {
      expect(Article).toBeDefined()
    })

    it('should export Section component', () => {
      expect(Section).toBeDefined()
    })
  })

  describe('heading primitives', () => {
    it('should export all heading levels', () => {
      expect(Heading1).toBeDefined()
      expect(Heading2).toBeDefined()
      expect(Heading3).toBeDefined()
      expect(Heading4).toBeDefined()
      expect(Heading5).toBeDefined()
      expect(Heading6).toBeDefined()
    })
  })

  describe('text primitives', () => {
    it('should export Paragraph component', () => {
      expect(Paragraph).toBeDefined()
    })

    it('should export InlineCode component', () => {
      expect(InlineCode).toBeDefined()
    })

    it('should export LinkText component', () => {
      expect(LinkText).toBeDefined()
    })
  })

  describe('code primitives', () => {
    it('should export CodeBlock component', () => {
      expect(CodeBlock).toBeDefined()
    })

    it('CodeBlock should support language variants', () => {
      // CodeBlock is a styled component with variants
      expect(CodeBlock.staticConfig?.variants?.language).toBeDefined()
    })
  })

  describe('list primitives', () => {
    it('should export list components', () => {
      expect(UnorderedList).toBeDefined()
      expect(OrderedList).toBeDefined()
      expect(ListItem).toBeDefined()
      expect(ListBullet).toBeDefined()
      expect(ListContent).toBeDefined()
    })
  })

  describe('block primitives', () => {
    it('should export Blockquote component', () => {
      expect(Blockquote).toBeDefined()
    })

    it('should export HorizontalRule component', () => {
      expect(HorizontalRule).toBeDefined()
    })
  })

  describe('media primitives', () => {
    it('should export ImageContainer component', () => {
      expect(ImageContainer).toBeDefined()
    })

    it('should export Figure and FigureCaption components', () => {
      expect(Figure).toBeDefined()
      expect(FigureCaption).toBeDefined()
    })
  })

  describe('table primitives', () => {
    it('should export table components', () => {
      expect(Table).toBeDefined()
      expect(TableRow).toBeDefined()
      expect(TableCell).toBeDefined()
    })

    it('TableRow should support header variant', () => {
      expect(TableRow.staticConfig?.variants?.header).toBeDefined()
    })
  })

  describe('callout primitives', () => {
    it('should export Callout components', () => {
      expect(Callout).toBeDefined()
      expect(CalloutTitle).toBeDefined()
    })

    it('Callout should support type variants', () => {
      const variants = Callout.staticConfig?.variants?.type
      expect(variants).toBeDefined()
      expect(variants?.info).toBeDefined()
      expect(variants?.warning).toBeDefined()
      expect(variants?.error).toBeDefined()
      expect(variants?.success).toBeDefined()
      expect(variants?.note).toBeDefined()
    })
  })
})
