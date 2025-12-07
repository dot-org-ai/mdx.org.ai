import { describe, it, expect } from 'vitest'
import { MDXComponents } from './components.js'
import { defaultHandlers, callout, diff, focus, mark } from './annotations/index.js'

describe('@mdxui/codehike', () => {
  describe('MDXComponents', () => {
    it('should export pre component', () => {
      expect(MDXComponents).toHaveProperty('pre')
      expect(typeof MDXComponents.pre).toBe('function')
    })

    it('should export Code component', () => {
      expect(MDXComponents).toHaveProperty('Code')
      expect(typeof MDXComponents.Code).toBe('function')
    })

    it('should export Block component', () => {
      expect(MDXComponents).toHaveProperty('Block')
      expect(typeof MDXComponents.Block).toBe('function')
    })
  })

  describe('Annotation Handlers', () => {
    it('should export callout handler', () => {
      expect(callout).toBeDefined()
      expect(callout.name).toBe('callout')
    })

    it('should export diff handler', () => {
      expect(diff).toBeDefined()
      expect(diff.name).toBe('diff')
    })

    it('should export focus handler', () => {
      expect(focus).toBeDefined()
      expect(focus.name).toBe('focus')
      expect(focus.onlyIfAnnotated).toBe(true)
    })

    it('should export mark handler', () => {
      expect(mark).toBeDefined()
      expect(mark.name).toBe('mark')
    })

    it('should export defaultHandlers array', () => {
      expect(defaultHandlers).toBeDefined()
      expect(Array.isArray(defaultHandlers)).toBe(true)
      expect(defaultHandlers.length).toBe(4)
      expect(defaultHandlers).toContain(callout)
      expect(defaultHandlers).toContain(diff)
      expect(defaultHandlers).toContain(focus)
      expect(defaultHandlers).toContain(mark)
    })
  })
})
