import { describe, it, expect } from 'vitest'
import { isType, isOneOfTypes, createTypedDocument, type MDXLDDocument, type TypedData } from './types.js'
import { parse } from './parse.js'

describe('types', () => {
  describe('isType', () => {
    it('should return true when type matches at root level', () => {
      const doc: MDXLDDocument = {
        type: 'Article',
        data: {},
        content: '',
      }

      expect(isType(doc, 'Article')).toBe(true)
      expect(isType(doc, 'Person')).toBe(false)
    })

    it('should return true when $type matches in data', () => {
      const doc: MDXLDDocument = {
        data: { $type: 'Article' },
        content: '',
      }

      expect(isType(doc, 'Article')).toBe(true)
      expect(isType(doc, 'Person')).toBe(false)
    })

    it('should work with parsed documents', () => {
      const content = `---
$type: Article
title: Hello
---

Content`

      const doc = parse(content)
      expect(isType(doc, 'Article')).toBe(true)
    })
  })

  describe('isOneOfTypes', () => {
    it('should return true when type is in the list', () => {
      const doc: MDXLDDocument = {
        type: 'Article',
        data: {},
        content: '',
      }

      expect(isOneOfTypes(doc, ['Article', 'Person', 'Event'])).toBe(true)
      expect(isOneOfTypes(doc, ['Person', 'Event'])).toBe(false)
    })

    it('should handle array types', () => {
      const doc: MDXLDDocument = {
        type: ['Article', 'NewsArticle'],
        data: {},
        content: '',
      }

      expect(isOneOfTypes(doc, ['Article', 'BlogPost'])).toBe(true)
      expect(isOneOfTypes(doc, ['Person', 'Event'])).toBe(false)
    })
  })

  describe('createTypedDocument', () => {
    it('should create a document factory for a type', () => {
      type ArticleData = TypedData<'Article', { headline: string; author: string }>
      const createArticle = createTypedDocument<ArticleData>('Article')

      const article = createArticle({ headline: 'Hello World', author: 'John Doe' }, '# Content')

      expect(article.type).toBe('Article')
      expect(article.data.$type).toBe('Article')
      expect(article.data.headline).toBe('Hello World')
      expect(article.data.author).toBe('John Doe')
      expect(article.content).toBe('# Content')
    })

    it('should preserve optional LD properties', () => {
      type PersonData = TypedData<'Person', { name: string }>
      const createPerson = createTypedDocument<PersonData>('Person')

      const person = createPerson({ name: 'Jane', $id: 'https://example.com/jane' }, '')

      expect(person.data.$id).toBe('https://example.com/jane')
      expect(person.data.$type).toBe('Person')
    })
  })

  describe('TypedData', () => {
    it('should create discriminated union types', () => {
      type ArticleData = TypedData<'Article', { headline: string }>
      type PersonData = TypedData<'Person', { name: string }>
      type SchemaOrgData = ArticleData | PersonData

      // Type-level test - this should compile
      const articleDoc: MDXLDDocument<ArticleData> = {
        type: 'Article',
        data: { $type: 'Article', headline: 'Test' },
        content: '',
      }

      const personDoc: MDXLDDocument<PersonData> = {
        type: 'Person',
        data: { $type: 'Person', name: 'John' },
        content: '',
      }

      // Union type should accept both
      const docs: MDXLDDocument<SchemaOrgData>[] = [
        articleDoc as MDXLDDocument<SchemaOrgData>,
        personDoc as MDXLDDocument<SchemaOrgData>,
      ]

      expect(docs.length).toBe(2)
    })
  })

  describe('generic MDXLDDocument', () => {
    it('should accept default MDXLDData', () => {
      const doc: MDXLDDocument = {
        data: { title: 'Test', customField: 123 },
        content: '',
      }

      expect(doc.data.title).toBe('Test')
    })

    it('should accept typed data', () => {
      type MyData = TypedData<'MyType', { requiredField: string }>
      const doc: MDXLDDocument<MyData> = {
        type: 'MyType',
        data: { $type: 'MyType', requiredField: 'value' },
        content: '',
      }

      expect(doc.type).toBe('MyType')
      expect(doc.data.requiredField).toBe('value')
    })
  })
})
