import { describe, it, expect } from 'vitest'
import {
  inferType,
  mergeTypes,
  typeToString,
  inferSchemaFromDocument,
  mergeSchemas,
  generateInterface,
  generateTypes,
} from './typegen.js'
import type { MDXLDDocument } from './types.js'

describe('inferType', () => {
  it('infers primitive types', () => {
    expect(inferType('hello')).toBe('string')
    expect(inferType(42)).toBe('number')
    expect(inferType(true)).toBe('boolean')
    expect(inferType(null)).toBe('null')
    expect(inferType(undefined)).toBe('undefined')
  })

  it('infers array types', () => {
    expect(inferType([])).toBe('unknown[]')
    expect(inferType(['a', 'b'])).toEqual({ kind: 'array', items: 'string' })
    expect(inferType([1, 2, 3])).toEqual({ kind: 'array', items: 'number' })
  })

  it('infers mixed array types as union', () => {
    const result = inferType([1, 'hello'])
    expect(result).toEqual({
      kind: 'array',
      items: { kind: 'union', types: ['number', 'string'] },
    })
  })

  it('infers object types', () => {
    const result = inferType({ name: 'John', age: 30 })
    expect(result).toEqual({
      kind: 'object',
      properties: {
        name: 'string',
        age: 'number',
      },
    })
  })

  it('infers nested objects', () => {
    const result = inferType({
      user: { name: 'John' },
      active: true,
    })
    expect(result).toEqual({
      kind: 'object',
      properties: {
        user: { kind: 'object', properties: { name: 'string' } },
        active: 'boolean',
      },
    })
  })
})

describe('mergeTypes', () => {
  it('returns same type for identical types', () => {
    expect(mergeTypes('string', 'string')).toBe('string')
    expect(mergeTypes('number', 'number')).toBe('number')
  })

  it('creates union for different types', () => {
    const result = mergeTypes('string', 'number')
    expect(result).toEqual({ kind: 'union', types: ['string', 'number'] })
  })

  it('handles nullable types', () => {
    const result = mergeTypes('string', 'null')
    expect(result).toEqual({ kind: 'union', types: ['string', 'null'] })
  })

  it('merges object types', () => {
    const a = { kind: 'object' as const, properties: { name: 'string' as const } }
    const b = { kind: 'object' as const, properties: { age: 'number' as const } }
    const result = mergeTypes(a, b)

    expect(result).toEqual({
      kind: 'object',
      properties: {
        name: { kind: 'union', types: ['string', 'undefined'] },
        age: { kind: 'union', types: ['number', 'undefined'] },
      },
    })
  })
})

describe('typeToString', () => {
  it('converts primitive types', () => {
    expect(typeToString('string')).toBe('string')
    expect(typeToString('number')).toBe('number')
    expect(typeToString('boolean')).toBe('boolean')
  })

  it('converts array types', () => {
    expect(typeToString({ kind: 'array', items: 'string' })).toBe('string[]')
    expect(typeToString({ kind: 'array', items: 'number' })).toBe('number[]')
  })

  it('converts union types', () => {
    expect(typeToString({ kind: 'union', types: ['string', 'number'] })).toBe('string | number')
  })

  it('converts object types', () => {
    const type = {
      kind: 'object' as const,
      properties: { name: 'string' as const, age: 'number' as const },
    }
    expect(typeToString(type)).toBe('{ name: string; age: number }')
  })

  it('handles optional fields in objects', () => {
    const type = {
      kind: 'object' as const,
      properties: {
        name: 'string' as const,
        age: { kind: 'union' as const, types: ['number' as const, 'undefined' as const] },
      },
    }
    expect(typeToString(type)).toBe('{ name: string; age?: number }')
  })
})

describe('inferSchemaFromDocument', () => {
  it('infers schema from document', () => {
    const doc: MDXLDDocument = {
      type: 'Article',
      data: {
        title: 'Hello World',
        views: 100,
        published: true,
      },
      content: '# Hello',
    }

    const schema = inferSchemaFromDocument(doc)

    expect(schema.name).toBe('Article')
    expect(schema.fields).toContainEqual({ name: '$type', type: 'string', optional: true })
    expect(schema.fields).toContainEqual({ name: 'title', type: 'string', optional: false })
    expect(schema.fields).toContainEqual({ name: 'views', type: 'number', optional: false })
    expect(schema.fields).toContainEqual({ name: 'published', type: 'boolean', optional: false })
  })

  it('handles documents without type', () => {
    const doc: MDXLDDocument = {
      data: { title: 'Untitled' },
      content: '',
    }

    const schema = inferSchemaFromDocument(doc)
    expect(schema.name).toBe('MDXDocument')
  })
})

describe('mergeSchemas', () => {
  it('merges schemas with same fields', () => {
    const schemas = [
      { name: 'Article', fields: [{ name: 'title', type: 'string' as const, optional: false }] },
      { name: 'Article', fields: [{ name: 'title', type: 'string' as const, optional: false }] },
    ]

    const merged = mergeSchemas(schemas)
    expect(merged.name).toBe('Article')
    expect(merged.fields).toHaveLength(1)
    expect(merged.fields[0]?.optional).toBe(false)
  })

  it('marks fields optional when not in all documents', () => {
    const schemas = [
      { name: 'Article', fields: [{ name: 'title', type: 'string' as const, optional: false }] },
      {
        name: 'Article',
        fields: [
          { name: 'title', type: 'string' as const, optional: false },
          { name: 'author', type: 'string' as const, optional: false },
        ],
      },
    ]

    const merged = mergeSchemas(schemas)
    const authorField = merged.fields.find((f) => f.name === 'author')
    expect(authorField?.optional).toBe(true)
  })
})

describe('generateInterface', () => {
  it('generates interface from schema', () => {
    const schema = {
      name: 'Article',
      fields: [
        { name: 'title', type: 'string' as const, optional: false },
        { name: 'views', type: 'number' as const, optional: true },
      ],
    }

    const result = generateInterface(schema)
    expect(result).toContain('export interface Article')
    expect(result).toContain('title: string')
    expect(result).toContain('views?: number')
  })
})

describe('generateTypes', () => {
  it('generates complete type file', () => {
    const docs: MDXLDDocument[] = [
      {
        type: 'BlogPost',
        data: { title: 'Hello', author: 'John' },
        content: '',
      },
      {
        type: 'BlogPost',
        data: { title: 'World', author: 'Jane', tags: ['a', 'b'] },
        content: '',
      },
    ]

    const result = generateTypes(docs)

    expect(result).toContain('Auto-generated TypeScript types')
    expect(result).toContain("import type { MDXLDDocument } from 'mdxld'")
    expect(result).toContain('export interface BlogPost')
    expect(result).toContain('title: string')
    expect(result).toContain('author: string')
    expect(result).toContain('tags?: string[]')
    expect(result).toContain('export type BlogPostDocument = MDXLDDocument & { data: BlogPost }')
  })

  it('generates union type for multiple document types', () => {
    const docs: MDXLDDocument[] = [
      { type: 'Article', data: { title: 'A' }, content: '' },
      { type: 'Person', data: { name: 'B' }, content: '' },
    ]

    const result = generateTypes(docs)

    expect(result).toContain('export type AnyDocument = Article | Person')
  })
})
