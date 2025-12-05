import { describe, it, expect } from 'vitest'
import {
  Prose,
  Article,
  Section,
  MDXHeading1,
  MDXHeading2,
  MDXHeading3,
  MDXHeading4,
  MDXHeading5,
  MDXHeading6,
  MDXParagraph,
  InlineCode,
  CodeBlock,
  Blockquote,
  UnorderedList,
  OrderedList,
  ListItem,
  HorizontalRule,
  MDXLink,
  MDXImage,
  Figure,
  Callout,
  Table,
  TableRow,
  TableCell,
  Kbd,
  Badge,
} from './primitives.js'

describe('@mdxui/gluestack/primitives', () => {
  describe('layout primitives', () => {
    it('should export Prose function', () => {
      expect(Prose).toBeDefined()
      expect(typeof Prose).toBe('function')
    })

    it('should export Article function', () => {
      expect(Article).toBeDefined()
      expect(typeof Article).toBe('function')
    })

    it('should export Section function', () => {
      expect(Section).toBeDefined()
      expect(typeof Section).toBe('function')
    })
  })

  describe('heading primitives', () => {
    it('should export all heading levels', () => {
      expect(MDXHeading1).toBeDefined()
      expect(MDXHeading2).toBeDefined()
      expect(MDXHeading3).toBeDefined()
      expect(MDXHeading4).toBeDefined()
      expect(MDXHeading5).toBeDefined()
      expect(MDXHeading6).toBeDefined()
    })

    it('heading functions should be callable', () => {
      expect(typeof MDXHeading1).toBe('function')
      expect(typeof MDXHeading2).toBe('function')
      expect(typeof MDXHeading3).toBe('function')
    })
  })

  describe('text primitives', () => {
    it('should export MDXParagraph function', () => {
      expect(MDXParagraph).toBeDefined()
      expect(typeof MDXParagraph).toBe('function')
    })

    it('should export InlineCode function', () => {
      expect(InlineCode).toBeDefined()
      expect(typeof InlineCode).toBe('function')
    })
  })

  describe('code primitives', () => {
    it('should export CodeBlock function', () => {
      expect(CodeBlock).toBeDefined()
      expect(typeof CodeBlock).toBe('function')
    })
  })

  describe('list primitives', () => {
    it('should export list components', () => {
      expect(UnorderedList).toBeDefined()
      expect(OrderedList).toBeDefined()
      expect(ListItem).toBeDefined()
    })

    it('list functions should be callable', () => {
      expect(typeof UnorderedList).toBe('function')
      expect(typeof OrderedList).toBe('function')
      expect(typeof ListItem).toBe('function')
    })
  })

  describe('block primitives', () => {
    it('should export Blockquote function', () => {
      expect(Blockquote).toBeDefined()
      expect(typeof Blockquote).toBe('function')
    })

    it('should export HorizontalRule function', () => {
      expect(HorizontalRule).toBeDefined()
      expect(typeof HorizontalRule).toBe('function')
    })
  })

  describe('link and media primitives', () => {
    it('should export MDXLink function', () => {
      expect(MDXLink).toBeDefined()
      expect(typeof MDXLink).toBe('function')
    })

    it('should export MDXImage function', () => {
      expect(MDXImage).toBeDefined()
      expect(typeof MDXImage).toBe('function')
    })

    it('should export Figure function', () => {
      expect(Figure).toBeDefined()
      expect(typeof Figure).toBe('function')
    })
  })

  describe('callout primitive', () => {
    it('should export Callout function', () => {
      expect(Callout).toBeDefined()
      expect(typeof Callout).toBe('function')
    })
  })

  describe('table primitives', () => {
    it('should export table components', () => {
      expect(Table).toBeDefined()
      expect(TableRow).toBeDefined()
      expect(TableCell).toBeDefined()
    })

    it('table functions should be callable', () => {
      expect(typeof Table).toBe('function')
      expect(typeof TableRow).toBe('function')
      expect(typeof TableCell).toBe('function')
    })
  })

  describe('utility primitives', () => {
    it('should export Kbd function', () => {
      expect(Kbd).toBeDefined()
      expect(typeof Kbd).toBe('function')
    })

    it('should export Badge function', () => {
      expect(Badge).toBeDefined()
      expect(typeof Badge).toBe('function')
    })
  })
})
