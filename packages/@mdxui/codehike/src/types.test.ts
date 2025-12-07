import { describe, it, expect } from 'vitest'
import {
  inferVariant,
  isScrollyProps,
  isSpotlightProps,
  isInlineProps,
  createStep,
  createSpotlight,
  parseHighlights,
  type CodeBlockProps,
  type CodeScrollyProps,
  type CodeSpotlightProps,
  type CodeInlineProps,
} from './types.js'

describe('@mdxui/codehike types', () => {
  describe('inferVariant', () => {
    it('should return scrolly when steps prop is present', () => {
      const props: CodeScrollyProps = {
        variant: 'scrolly',
        steps: [{ code: 'const x = 1' }],
      }
      expect(inferVariant(props)).toBe('scrolly')
    })

    it('should return spotlight when regions prop is present', () => {
      const props: CodeSpotlightProps = {
        variant: 'spotlight',
        regions: [{ lines: '1-3' }],
      }
      expect(inferVariant(props)).toBe('spotlight')
    })

    it('should return block by default', () => {
      const props: CodeBlockProps = {
        code: 'const x = 1',
      }
      expect(inferVariant(props)).toBe('block')
    })

    it('should respect explicit variant', () => {
      const props: CodeBlockProps = {
        variant: 'block',
        code: 'const x = 1',
      }
      expect(inferVariant(props)).toBe('block')
    })
  })

  describe('isScrollyProps', () => {
    it('should return true for scrolly props', () => {
      const props: CodeScrollyProps = {
        variant: 'scrolly',
        steps: [{ code: 'test' }],
      }
      expect(isScrollyProps(props)).toBe(true)
    })

    it('should return true when steps array is present', () => {
      const props = {
        steps: [{ code: 'test' }],
      } as CodeScrollyProps
      expect(isScrollyProps(props)).toBe(true)
    })

    it('should return false for non-scrolly props', () => {
      const props: CodeBlockProps = { code: 'test' }
      expect(isScrollyProps(props)).toBe(false)
    })
  })

  describe('isSpotlightProps', () => {
    it('should return true for spotlight props', () => {
      const props: CodeSpotlightProps = {
        variant: 'spotlight',
        regions: [{ lines: '1' }],
      }
      expect(isSpotlightProps(props)).toBe(true)
    })

    it('should return true when regions array is present', () => {
      const props = {
        regions: [{ lines: '1' }],
      } as CodeSpotlightProps
      expect(isSpotlightProps(props)).toBe(true)
    })

    it('should return false for non-spotlight props', () => {
      const props: CodeBlockProps = { code: 'test' }
      expect(isSpotlightProps(props)).toBe(false)
    })
  })

  describe('isInlineProps', () => {
    it('should return true for inline props', () => {
      const props: CodeInlineProps = {
        variant: 'inline',
        children: 'code',
      }
      expect(isInlineProps(props)).toBe(true)
    })

    it('should return false for non-inline props', () => {
      const props: CodeBlockProps = { code: 'test' }
      expect(isInlineProps(props)).toBe(false)
    })
  })

  describe('createStep', () => {
    it('should create a step with code', () => {
      const step = createStep('const x = 1')
      expect(step.code).toBe('const x = 1')
    })

    it('should create a step with options', () => {
      const step = createStep('const x = 1', {
        title: 'Step 1',
        description: 'Declare a variable',
        focus: '1',
        language: 'typescript',
      })

      expect(step.code).toBe('const x = 1')
      expect(step.title).toBe('Step 1')
      expect(step.description).toBe('Declare a variable')
      expect(step.focus).toBe('1')
      expect(step.language).toBe('typescript')
    })
  })

  describe('createSpotlight', () => {
    it('should create a spotlight with lines', () => {
      const spotlight = createSpotlight('1-3')
      expect(spotlight.lines).toBe('1-3')
    })

    it('should create a spotlight with options', () => {
      const spotlight = createSpotlight('1-3', {
        id: 'region-1',
        label: 'Function header',
        callout: 'This is the function signature',
      })

      expect(spotlight.lines).toBe('1-3')
      expect(spotlight.id).toBe('region-1')
      expect(spotlight.label).toBe('Function header')
      expect(spotlight.callout).toBe('This is the function signature')
    })
  })

  describe('parseHighlights', () => {
    it('should parse single line number', () => {
      expect(parseHighlights('1')).toEqual([1])
    })

    it('should parse comma-separated line numbers', () => {
      expect(parseHighlights('1,3,5')).toEqual([1, 3, 5])
    })

    it('should parse line ranges', () => {
      expect(parseHighlights('1-3')).toEqual([1, 2, 3])
    })

    it('should parse mixed lines and ranges', () => {
      expect(parseHighlights('1,3-5,10')).toEqual([1, 3, 4, 5, 10])
    })

    it('should handle whitespace', () => {
      expect(parseHighlights('1, 3-5, 10')).toEqual([1, 3, 4, 5, 10])
    })

    it('should sort results', () => {
      expect(parseHighlights('10,1,5')).toEqual([1, 5, 10])
    })
  })
})
