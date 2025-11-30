import { describe, it, expect } from 'vitest'
import {
  validateDocument,
  validateData,
  createValidator,
  createDataValidator,
  createUnionValidator,
  hasType,
  assertType,
  type,
} from './validate.js'
import { parse } from './parse.js'
import type { TypedData } from './types.js'

describe('validate', () => {
  describe('validateDocument', () => {
    it('should validate a correct document', () => {
      const doc = {
        data: { title: 'Test' },
        content: '# Hello',
      }

      const result = validateDocument(doc)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.title).toBe('Test')
        expect(result.data.content).toBe('# Hello')
      }
    })

    it('should validate document with LD properties', () => {
      const doc = {
        id: 'https://example.com/doc',
        type: 'Article',
        context: 'https://schema.org',
        data: { title: 'Test' },
        content: '',
      }

      const result = validateDocument(doc)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('https://example.com/doc')
        expect(result.data.type).toBe('Article')
      }
    })

    it('should fail for invalid document', () => {
      const doc = {
        data: 'not an object',
        content: 123,
      }

      const result = validateDocument(doc)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })

    it('should fail when content is missing', () => {
      const doc = {
        data: {},
      }

      const result = validateDocument(doc)

      expect(result.success).toBe(false)
    })

    it('should validate parsed documents', () => {
      const content = `---
$type: Article
title: Hello
---

# Hello World`

      const doc = parse(content)
      const result = validateDocument(doc)

      expect(result.success).toBe(true)
    })
  })

  describe('validateData', () => {
    it('should validate data object', () => {
      const data = {
        $type: 'Article',
        title: 'Test',
      }

      const result = validateData(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.$type).toBe('Article')
      }
    })

    it('should fail for non-object', () => {
      const result = validateData('string')

      expect(result.success).toBe(false)
    })
  })

  describe('createValidator', () => {
    it('should create typed validator', () => {
      const articleSchema = type({
        $type: '"Article"',
        headline: 'string',
        'author?': 'string',
      })

      const validateArticle = createValidator(articleSchema)

      const doc = {
        type: 'Article',
        data: { $type: 'Article', headline: 'Breaking News' },
        content: '# News',
      }

      const result = validateArticle(doc)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data.headline).toBe('Breaking News')
      }
    })

    it('should fail when required field missing', () => {
      const articleSchema = type({
        $type: '"Article"',
        headline: 'string',
      })

      const validateArticle = createValidator(articleSchema)

      const doc = {
        data: { $type: 'Article' },
        content: '',
      }

      const result = validateArticle(doc)

      expect(result.success).toBe(false)
    })

    it('should fail when $type does not match', () => {
      const articleSchema = type({
        $type: '"Article"',
        headline: 'string',
      })

      const validateArticle = createValidator(articleSchema)

      const doc = {
        data: { $type: 'Person', headline: 'test' },
        content: '',
      }

      const result = validateArticle(doc)

      expect(result.success).toBe(false)
    })
  })

  describe('createDataValidator', () => {
    it('should validate data only', () => {
      const personSchema = type({
        $type: '"Person"',
        name: 'string',
        'email?': 'string',
      })

      const validatePersonData = createDataValidator(personSchema)

      const data = { $type: 'Person', name: 'John Doe' }
      const result = validatePersonData(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
      }
    })
  })

  describe('hasType', () => {
    it('should return true for matching type', () => {
      const doc = {
        type: 'Article',
        data: {},
        content: '',
      }

      expect(hasType(doc, 'Article')).toBe(true)
      expect(hasType(doc, 'Person')).toBe(false)
    })

    it('should check $type in data', () => {
      const doc = {
        data: { $type: 'Event' },
        content: '',
      }

      expect(hasType(doc, 'Event')).toBe(true)
    })

    it('should handle array types', () => {
      const doc = {
        type: ['Article', 'NewsArticle'],
        data: {},
        content: '',
      }

      expect(hasType(doc, 'Article')).toBe(true)
      expect(hasType(doc, 'NewsArticle')).toBe(true)
      expect(hasType(doc, 'Person')).toBe(false)
    })
  })

  describe('assertType', () => {
    it('should not throw for matching type', () => {
      const doc = {
        type: 'Article',
        data: {},
        content: '',
      }

      expect(() => assertType(doc, 'Article')).not.toThrow()
    })

    it('should throw for non-matching type', () => {
      const doc = {
        type: 'Article',
        data: {},
        content: '',
      }

      expect(() => assertType(doc, 'Person')).toThrow('Expected document type "Person" but got "Article"')
    })
  })

  describe('createUnionValidator', () => {
    it('should validate against multiple type schemas', () => {
      const validator = createUnionValidator({
        Article: type({
          $type: '"Article"',
          headline: 'string',
        }).and(type('Record<string, unknown>')),
        Person: type({
          $type: '"Person"',
          name: 'string',
        }).and(type('Record<string, unknown>')),
      })

      const article = {
        type: 'Article',
        data: { $type: 'Article', headline: 'News' },
        content: '',
      }

      const person = {
        type: 'Person',
        data: { $type: 'Person', name: 'John' },
        content: '',
      }

      expect(validator(article).success).toBe(true)
      expect(validator(person).success).toBe(true)
    })

    it('should fail for unknown type', () => {
      const validator = createUnionValidator({
        Article: type({
          $type: '"Article"',
          headline: 'string',
        }).and(type('Record<string, unknown>')),
      })

      const doc = {
        type: 'Event',
        data: { $type: 'Event', name: 'Party' },
        content: '',
      }

      const result = validator(doc)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]).toContain('Unknown document type')
      }
    })

    it('should fail when required field missing for specific type', () => {
      const validator = createUnionValidator({
        Article: type({
          $type: '"Article"',
          headline: 'string',
        }).and(type('Record<string, unknown>')),
      })

      const doc = {
        type: 'Article',
        data: { $type: 'Article' },
        content: '',
      }

      const result = validator(doc)

      expect(result.success).toBe(false)
    })
  })

  describe('type re-export', () => {
    it('should re-export arktype type function', () => {
      const stringSchema = type('string')
      const result = stringSchema('hello')

      expect(result).toBe('hello')
    })
  })
})
