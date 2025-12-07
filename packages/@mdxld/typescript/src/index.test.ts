import { describe, it, expect } from 'vitest'
import {
  toTypeScript,
  toZod,
  toJSON5,
  toJSDoc,
  fromTypeScript,
} from './index.js'

// =============================================================================
// toTypeScript Tests
// =============================================================================

describe('toTypeScript', () => {
  describe('basic interface generation', () => {
    it('should generate interface with name', () => {
      const result = toTypeScript({ name: 'Customer' })
      expect(result).toContain('export interface Customer {')
      expect(result).toContain('}')
    })

    it('should use custom name from options', () => {
      const result = toTypeScript({ name: 'Original' }, { name: 'Custom' })
      expect(result).toContain('interface Custom')
    })

    it('should omit export when disabled', () => {
      const result = toTypeScript({ name: 'Test' }, { export: false })
      expect(result).not.toContain('export')
      expect(result).toContain('interface Test')
    })

    it('should include extends clause', () => {
      const result = toTypeScript({ name: 'Customer', extends: 'Entity' })
      expect(result).toContain('interface Customer extends Entity')
    })

    it('should include description as JSDoc', () => {
      const result = toTypeScript({
        name: 'Customer',
        description: 'A customer entity',
      })
      expect(result).toContain('/**')
      expect(result).toContain(' * A customer entity')
      expect(result).toContain(' */')
    })
  })

  describe('property generation', () => {
    it('should generate string property', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'name', type: 'string' }],
      })
      expect(result).toContain('name?: string')
    })

    it('should generate required property', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'id', type: 'string', required: true }],
      })
      expect(result).toContain('id: string')
      expect(result).not.toContain('id?:')
    })

    it('should generate number types', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [
          { name: 'count', type: 'number' },
          { name: 'age', type: 'integer' },
          { name: 'price', type: 'float' },
        ],
      })
      expect(result).toContain('count?: number')
      expect(result).toContain('age?: number')
      expect(result).toContain('price?: number')
    })

    it('should generate boolean type', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'active', type: 'boolean' }],
      })
      expect(result).toContain('active?: boolean')
    })

    it('should generate Date type', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'createdAt', type: 'date' }],
      })
      expect(result).toContain('createdAt?: Date')
    })

    it('should generate enum as union type', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [
          { name: 'status', type: 'string', enum: ['active', 'inactive', 'pending'] },
        ],
      })
      expect(result).toContain("status?: 'active' | 'inactive' | 'pending'")
    })

    it('should generate array type', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'items', type: '[string]' }],
      })
      expect(result).toContain('items?: string[]')
    })

    it('should generate object type', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'data', type: 'object' }],
      })
      expect(result).toContain('data?: Record<string, unknown>')
    })

    it('should generate unknown type for any', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'value', type: 'any' }],
      })
      expect(result).toContain('value?: unknown')
    })

    it('should preserve reference types', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'author', type: 'Author' }],
      })
      expect(result).toContain('author?: Author')
    })

    it('should include property description as JSDoc', () => {
      const result = toTypeScript({
        name: 'Test',
        properties: [{ name: 'id', type: 'string', description: 'Unique identifier' }],
      })
      expect(result).toContain('/** Unique identifier */')
    })
  })

  describe('options', () => {
    it('should make all properties readonly', () => {
      const result = toTypeScript(
        {
          name: 'Test',
          properties: [{ name: 'id', type: 'string' }],
        },
        { readonly: true }
      )
      expect(result).toContain('readonly id')
    })

    it('should make all properties optional', () => {
      const result = toTypeScript(
        {
          name: 'Test',
          properties: [{ name: 'id', type: 'string', required: true }],
        },
        { optional: 'all' }
      )
      expect(result).toContain('id?:')
    })

    it('should make all properties required', () => {
      const result = toTypeScript(
        {
          name: 'Test',
          properties: [{ name: 'id', type: 'string', required: false }],
        },
        { optional: 'none' }
      )
      expect(result).toContain('id:')
      expect(result).not.toContain('id?:')
    })

    it('should use custom indentation', () => {
      const result = toTypeScript(
        {
          name: 'Test',
          properties: [{ name: 'id', type: 'string' }],
        },
        { indent: 4 }
      )
      expect(result).toContain('    id?:')
    })

    it('should omit comments when disabled', () => {
      const result = toTypeScript(
        {
          name: 'Test',
          description: 'Description',
          properties: [{ name: 'id', description: 'Prop desc' }],
        },
        { comments: false }
      )
      expect(result).not.toContain('/**')
    })
  })
})

// =============================================================================
// toZod Tests
// =============================================================================

describe('toZod', () => {
  describe('basic schema generation', () => {
    it('should include import statement', () => {
      const result = toZod({ name: 'Test' })
      expect(result).toContain("import { z } from 'zod'")
    })

    it('should generate schema with name', () => {
      const result = toZod({ name: 'Customer' })
      expect(result).toContain('export const CustomerSchema = z.object({')
    })

    it('should generate inferred type', () => {
      const result = toZod({ name: 'Customer' })
      expect(result).toContain('export type Customer = z.infer<typeof CustomerSchema>')
    })

    it('should omit export when disabled', () => {
      const result = toZod({ name: 'Test' }, { export: false })
      expect(result).toContain('const TestSchema')
      expect(result).toContain('type Test =')
    })
  })

  describe('property generation', () => {
    it('should generate z.string()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'name', type: 'string', required: true }],
      })
      expect(result).toContain('name: z.string()')
    })

    it('should generate z.number()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'count', type: 'number', required: true }],
      })
      expect(result).toContain('count: z.number()')
    })

    it('should generate z.number().int()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'age', type: 'integer', required: true }],
      })
      expect(result).toContain('age: z.number().int()')
    })

    it('should generate z.boolean()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'active', type: 'boolean', required: true }],
      })
      expect(result).toContain('active: z.boolean()')
    })

    it('should generate z.date()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'createdAt', type: 'date', required: true }],
      })
      expect(result).toContain('createdAt: z.date()')
    })

    it('should generate z.enum()', () => {
      const result = toZod({
        name: 'Test',
        properties: [
          { name: 'status', type: 'string', enum: ['active', 'inactive'], required: true },
        ],
      })
      expect(result).toContain("status: z.enum(['active', 'inactive'])")
    })

    it('should add .optional() for non-required', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'nickname', type: 'string', required: false }],
      })
      expect(result).toContain('z.string().optional()')
    })

    it('should add .default()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'tier', type: 'string', default: 'free' }],
      })
      expect(result).toContain(".default('free')")
    })

    it('should add .describe()', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'id', type: 'string', description: 'Unique ID', required: true }],
      })
      expect(result).toContain(".describe('Unique ID')")
    })

    it('should handle email format', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'email', type: 'string', format: 'email', required: true }],
      })
      expect(result).toContain('z.string().email()')
    })

    it('should handle url format', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'website', type: 'string', format: 'url', required: true }],
      })
      expect(result).toContain('z.string().url()')
    })

    it('should handle uuid format', () => {
      const result = toZod({
        name: 'Test',
        properties: [{ name: 'id', type: 'string', format: 'uuid', required: true }],
      })
      expect(result).toContain('z.string().uuid()')
    })
  })

  describe('options', () => {
    it('should add .strict() when enabled', () => {
      const result = toZod({ name: 'Test' }, { strict: true })
      expect(result).toContain('}).strict()')
    })

    it('should use coercion when enabled', () => {
      const result = toZod(
        {
          name: 'Test',
          properties: [
            { name: 'count', type: 'number', required: true },
            { name: 'active', type: 'boolean', required: true },
            { name: 'date', type: 'date', required: true },
          ],
        },
        { coerce: true }
      )
      expect(result).toContain('z.coerce.number()')
      expect(result).toContain('z.coerce.boolean()')
      expect(result).toContain('z.coerce.date()')
    })
  })
})

// =============================================================================
// toJSON5 Tests
// =============================================================================

describe('toJSON5', () => {
  describe('basic conversion', () => {
    it('should convert simple object', () => {
      const result = toJSON5({ name: 'test' })
      expect(result).toContain("name: 'test'")
    })

    it('should use unquoted keys', () => {
      const result = toJSON5({ validKey: 'value' })
      expect(result).toContain('validKey:')
      expect(result).not.toContain("'validKey'")
    })

    it('should quote invalid keys', () => {
      const result = toJSON5({ 'invalid-key': 'value' })
      expect(result).toContain("'invalid-key':")
    })

    it('should handle nested objects', () => {
      const result = toJSON5({
        outer: { inner: 'value' },
      })
      expect(result).toContain('outer: {')
      expect(result).toContain("inner: 'value'")
    })

    it('should handle arrays', () => {
      const result = toJSON5({ items: ['a', 'b', 'c'] })
      expect(result).toContain('[')
      expect(result).toContain("'a'")
      expect(result).toContain(']')
    })

    it('should add trailing commas by default', () => {
      const result = toJSON5({ a: 1, b: 2 })
      expect(result).toContain(',\n}')
    })
  })

  describe('data types', () => {
    it('should handle null', () => {
      const result = toJSON5({ value: null })
      expect(result).toContain('value: null')
    })

    it('should handle undefined', () => {
      const result = toJSON5({ value: undefined })
      expect(result).toContain('value: undefined')
    })

    it('should handle boolean', () => {
      const result = toJSON5({ active: true, deleted: false })
      expect(result).toContain('active: true')
      expect(result).toContain('deleted: false')
    })

    it('should handle numbers', () => {
      const result = toJSON5({ int: 42, float: 3.14 })
      expect(result).toContain('int: 42')
      expect(result).toContain('float: 3.14')
    })

    it('should handle Infinity', () => {
      const result = toJSON5({ inf: Infinity, negInf: -Infinity })
      expect(result).toContain('inf: Infinity')
      expect(result).toContain('negInf: -Infinity')
    })

    it('should handle NaN', () => {
      const result = toJSON5({ nan: NaN })
      expect(result).toContain('nan: NaN')
    })
  })

  describe('options', () => {
    it('should use custom indentation', () => {
      const result = toJSON5({ nested: { value: 'test' } }, { indent: 4 })
      expect(result).toContain('    value:')
    })

    it('should use double quotes', () => {
      const result = toJSON5({ name: 'test' }, { quote: 'double' })
      expect(result).toContain('"test"')
    })

    it('should omit trailing commas', () => {
      const result = toJSON5({ a: 1, b: 2 }, { trailingComma: false })
      expect(result).not.toContain(',\n}')
    })

    it('should omit space after colon', () => {
      const result = toJSON5({ name: 'test' }, { space: false })
      expect(result).toContain("name:'test'")
    })
  })

  describe('string escaping', () => {
    it('should escape newlines', () => {
      const result = toJSON5({ value: 'line1\nline2' })
      expect(result).toContain('\\n')
    })

    it('should escape tabs', () => {
      const result = toJSON5({ value: 'col1\tcol2' })
      expect(result).toContain('\\t')
    })

    it('should escape quotes', () => {
      const result = toJSON5({ value: "it's a test" })
      expect(result).toContain("\\'")
    })

    it('should escape backslashes', () => {
      const result = toJSON5({ value: 'path\\to\\file' })
      expect(result).toContain('\\\\')
    })
  })

  describe('edge cases', () => {
    it('should handle empty object', () => {
      const result = toJSON5({})
      expect(result).toBe('{}')
    })

    it('should handle empty array', () => {
      const result = toJSON5({ items: [] })
      expect(result).toContain('items: []')
    })

    it('should handle unicode', () => {
      const result = toJSON5({ name: '客户 🎉' })
      expect(result).toContain('客户 🎉')
    })
  })
})

// =============================================================================
// toJSDoc Tests
// =============================================================================

describe('toJSDoc', () => {
  it('should generate @typedef', () => {
    const result = toJSDoc({ name: 'Customer' })
    expect(result).toContain('@typedef {Object} Customer')
  })

  it('should include description', () => {
    const result = toJSDoc({
      name: 'Customer',
      description: 'A customer entity',
    })
    expect(result).toContain(' * A customer entity')
  })

  it('should generate @property for each property', () => {
    const result = toJSDoc({
      name: 'Test',
      properties: [
        { name: 'id', type: 'string', required: true, description: 'Unique ID' },
        { name: 'count', type: 'number', required: true },
      ],
    })
    expect(result).toContain('@property {string}')
    expect(result).toContain('id')
    expect(result).toContain('Unique ID')
    expect(result).toContain('@property {number}')
    expect(result).toContain('count')
  })

  it('should mark optional properties', () => {
    const result = toJSDoc({
      name: 'Test',
      properties: [{ name: 'optional', type: 'string', required: false }],
    })
    expect(result).toContain('[optional=]')
  })

  it('should include default values', () => {
    const result = toJSDoc({
      name: 'Test',
      properties: [{ name: 'tier', type: 'string', default: 'free' }],
    })
    // The implementation includes both optional marker (=) and default (=value)
    expect(result).toContain('tier')
    expect(result).toContain('free')
  })

  it('should handle enum as union', () => {
    const result = toJSDoc({
      name: 'Test',
      properties: [
        { name: 'status', type: 'string', enum: ['active', 'inactive'] },
      ],
    })
    expect(result).toContain("{'active' | 'inactive'}")
  })

  it('should map types correctly', () => {
    const result = toJSDoc({
      name: 'Test',
      properties: [
        { name: 'a', type: 'any' },
        { name: 'b', type: 'object' },
        { name: 'c', type: 'array' },
        { name: 'd', type: '[Item]' },
      ],
    })
    expect(result).toContain('{*}')
    expect(result).toContain('{Object.<string, *>}')
    expect(result).toContain('{Array.<*>}')
    expect(result).toContain('{Array.<Item>}')
  })
})

// =============================================================================
// fromTypeScript Tests
// =============================================================================

describe('fromTypeScript', () => {
  it('should parse interface name', () => {
    const result = fromTypeScript('interface Customer {}')
    expect(result.name).toBe('Customer')
  })

  it('should parse extends clause', () => {
    const result = fromTypeScript('interface Customer extends Entity {}')
    expect(result.name).toBe('Customer')
    expect(result.extends).toBe('Entity')
  })

  it('should parse properties', () => {
    const result = fromTypeScript(`
      interface Customer {
        id: string
        email: string
      }
    `)
    expect(result.properties).toHaveLength(2)
    expect(result.properties![0]).toEqual({
      name: 'id',
      type: 'string',
      required: true,
      description: undefined,
    })
  })

  it('should parse optional properties', () => {
    const result = fromTypeScript(`
      interface Test {
        optional?: string
      }
    `)
    expect(result.properties![0].required).toBe(false)
  })

  it('should parse JSDoc descriptions', () => {
    const result = fromTypeScript(`
      interface Test {
        /** Unique identifier */
        id: string
      }
    `)
    expect(result.properties![0].description).toBe('Unique identifier')
  })

  it('should handle readonly properties', () => {
    const result = fromTypeScript(`
      interface Test {
        readonly id: string
      }
    `)
    expect(result.properties![0].name).toBe('id')
  })

  it('should handle complex types', () => {
    const result = fromTypeScript(`
      interface Test {
        items: string[]
        data: Record<string, unknown>
        status: 'active' | 'inactive'
      }
    `)
    expect(result.properties).toHaveLength(3)
    expect(result.properties![0].type).toBe('string[]')
    expect(result.properties![1].type).toBe('Record<string, unknown>')
    expect(result.properties![2].type).toBe("'active' | 'inactive'")
  })

  it('should handle empty interface', () => {
    const result = fromTypeScript('interface Empty {}')
    expect(result.name).toBe('Empty')
    expect(result.properties).toHaveLength(0)
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('should handle empty schema', () => {
    expect(toTypeScript({ name: 'Empty' })).toContain('interface Empty {')
    expect(toZod({ name: 'Empty' })).toContain('z.object({')
  })

  it('should handle special characters in names', () => {
    const result = toTypeScript({
      name: 'Test',
      properties: [{ name: '$type', type: 'string' }],
    })
    expect(result).toContain('$type')
  })

  it('should escape quotes in descriptions', () => {
    const result = toZod({
      name: 'Test',
      properties: [{ name: 'note', description: "It's a 'test'" }],
    })
    expect(result).toContain("\\'")
  })
})
