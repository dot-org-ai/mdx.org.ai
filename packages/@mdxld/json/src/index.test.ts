import { describe, it, expect } from 'vitest'
import {
  toJSON,
  fromJSON,
  toJSONLD,
  fromJSONLD,
  toJSONSchema,
  toOpenAPI,
  toMCP,
  toGraphQL,
} from './index.js'

// =============================================================================
// toJSON / fromJSON Tests
// =============================================================================

describe('toJSON', () => {
  it('should stringify object with pretty print by default', () => {
    const result = toJSON({ name: 'Test' })
    expect(result).toBe('{\n  "name": "Test"\n}')
  })

  it('should stringify without pretty print', () => {
    const result = toJSON({ name: 'Test' }, { pretty: false })
    expect(result).toBe('{"name":"Test"}')
  })

  it('should use custom indentation', () => {
    const result = toJSON({ name: 'Test' }, { indent: 4 })
    expect(result).toBe('{\n    "name": "Test"\n}')
  })

  it('should handle nested objects', () => {
    const result = toJSON({ user: { name: 'John', age: 30 } })
    expect(result).toContain('"user":')
    expect(result).toContain('"name": "John"')
  })

  it('should handle arrays', () => {
    const result = toJSON({ items: [1, 2, 3] })
    expect(result).toContain('[')
    expect(result).toContain('1')
  })

  it('should handle null and boolean', () => {
    const result = toJSON({ empty: null, active: true })
    expect(result).toContain('null')
    expect(result).toContain('true')
  })
})

describe('fromJSON', () => {
  it('should parse JSON string to object', () => {
    const result = fromJSON('{"name":"Test"}')
    expect(result).toEqual({ name: 'Test' })
  })

  it('should parse nested JSON', () => {
    const result = fromJSON('{"user":{"name":"John"}}')
    expect(result).toEqual({ user: { name: 'John' } })
  })

  it('should throw on invalid JSON', () => {
    expect(() => fromJSON('invalid')).toThrow()
  })

  it('should round-trip with toJSON', () => {
    const original = { name: 'Test', value: 123, items: [1, 2, 3] }
    const result = fromJSON(toJSON(original))
    expect(result).toEqual(original)
  })
})

// =============================================================================
// toJSONLD / fromJSONLD Tests
// =============================================================================

describe('toJSONLD', () => {
  it('should add @context', () => {
    const result = toJSONLD({ name: 'Test' })
    expect(result['@context']).toBe('https://schema.org')
  })

  it('should use custom context', () => {
    const result = toJSONLD({ name: 'Test' }, { context: 'https://example.com' })
    expect(result['@context']).toBe('https://example.com')
  })

  it('should add @type when provided', () => {
    const result = toJSONLD({ name: 'John' }, { type: 'Person' })
    expect(result['@type']).toBe('Person')
  })

  it('should add @id when provided', () => {
    const result = toJSONLD({ name: 'Test' }, { id: 'test-123' })
    expect(result['@id']).toBe('test-123')
  })

  it('should combine baseUrl with id', () => {
    const result = toJSONLD(
      { name: 'Test' },
      { id: 'test-123', baseUrl: 'https://example.com/' }
    )
    expect(result['@id']).toBe('https://example.com/test-123')
  })

  it('should infer Person type from email + name', () => {
    const result = toJSONLD({ name: 'John', email: 'john@example.com', jobTitle: 'Engineer' })
    expect(result['@type']).toBe('Person')
  })

  it('should infer Organization type from email + name without jobTitle', () => {
    const result = toJSONLD({ name: 'Acme Corp', email: 'info@acme.com' })
    expect(result['@type']).toBe('Organization')
  })

  it('should infer Article type from headline + author', () => {
    const result = toJSONLD({ headline: 'News', author: 'John' })
    expect(result['@type']).toBe('Article')
  })

  it('should infer Recipe type from ingredients + instructions', () => {
    const result = toJSONLD({ ingredients: ['flour'], instructions: ['mix'] })
    expect(result['@type']).toBe('Recipe')
  })

  it('should infer Event type from startDate', () => {
    const result = toJSONLD({ startDate: '2024-01-15' })
    expect(result['@type']).toBe('Event')
  })

  it('should transform address properties to Schema.org format', () => {
    const result = toJSONLD({
      name: 'Acme',
      address: {
        street: '123 Main St',
        city: 'NYC',
        state: 'NY',
        zip: '10001',
      },
    })

    expect(result.address).toHaveProperty('@type', 'PostalAddress')
    expect(result.address).toHaveProperty('streetAddress', '123 Main St')
    expect(result.address).toHaveProperty('addressLocality', 'NYC')
  })

  it('should transform phone to telephone', () => {
    const result = toJSONLD({ phone: '555-1234' })
    expect(result.telephone).toBe('555-1234')
    expect(result.phone).toBeUndefined()
  })
})

describe('fromJSONLD', () => {
  it('should strip @context, @type, @id', () => {
    const result = fromJSONLD({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': 'person-1',
      name: 'John',
    })

    expect(result).toEqual({ name: 'John' })
    expect(result['@context']).toBeUndefined()
    expect(result['@type']).toBeUndefined()
  })

  it('should preserve other properties', () => {
    const result = fromJSONLD({
      '@context': 'https://schema.org',
      name: 'John',
      email: 'john@example.com',
    })

    expect(result).toEqual({ name: 'John', email: 'john@example.com' })
  })
})

// =============================================================================
// toJSONSchema Tests
// =============================================================================

describe('toJSONSchema', () => {
  it('should generate valid JSON Schema', () => {
    const result = toJSONSchema({
      name: 'Customer',
      properties: [{ name: 'id', type: 'string', required: true }],
    })

    expect(result.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(result.type).toBe('object')
    expect(result.title).toBe('Customer')
  })

  it('should use draft-07 when specified', () => {
    const result = toJSONSchema({ name: 'Test' }, { draft: '07' })
    expect(result.$schema).toBe('https://json-schema.org/draft-07/schema#')
  })

  it('should set $id from options', () => {
    const result = toJSONSchema({ name: 'Test' }, { $id: 'https://example.com/test' })
    expect(result.$id).toBe('https://example.com/test')
  })

  it('should map string type', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [{ name: 'name', type: 'string' }],
    })

    expect(result.properties!.name).toEqual({ type: 'string' })
  })

  it('should map number types', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [
        { name: 'count', type: 'number' },
        { name: 'age', type: 'integer' },
      ],
    })

    expect(result.properties!.count).toEqual({ type: 'number' })
    expect(result.properties!.age).toEqual({ type: 'integer' })
  })

  it('should map date to string with format', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [{ name: 'createdAt', type: 'datetime' }],
    })

    expect(result.properties!.createdAt).toEqual({ type: 'string', format: 'date-time' })
  })

  it('should map email format', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [{ name: 'email', type: 'email' }],
    })

    expect(result.properties!.email).toEqual({ type: 'string', format: 'email' })
  })

  it('should add required array', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'optional', type: 'string', required: false },
      ],
    })

    expect(result.required).toEqual(['id', 'name'])
  })

  it('should include enum values', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [{ name: 'status', type: 'string', enum: ['active', 'inactive'] }],
    })

    expect(result.properties!.status).toHaveProperty('enum', ['active', 'inactive'])
  })

  it('should include default values', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [{ name: 'tier', type: 'string', default: 'free' }],
    })

    expect(result.properties!.tier).toHaveProperty('default', 'free')
  })

  it('should include description', () => {
    const result = toJSONSchema({
      name: 'Test',
      description: 'A test schema',
      properties: [{ name: 'id', type: 'string', description: 'Unique ID' }],
    })

    expect(result.description).toBe('A test schema')
    expect(result.properties!.id).toHaveProperty('description', 'Unique ID')
  })

  it('should create $ref for unknown types', () => {
    const result = toJSONSchema({
      name: 'Test',
      properties: [{ name: 'author', type: 'Author' }],
    })

    expect(result.properties!.author).toEqual({ $ref: '#/components/schemas/Author' })
  })
})

// =============================================================================
// toOpenAPI Tests
// =============================================================================

describe('toOpenAPI', () => {
  it('should generate valid OpenAPI spec', () => {
    const result = toOpenAPI([
      { method: 'GET', path: '/customers' },
    ])

    expect(result.openapi).toBe('3.1.0')
    expect(result.info).toEqual({ title: 'API', version: '1.0.0' })
    expect(result.paths).toBeDefined()
  })

  it('should use custom title and version', () => {
    const result = toOpenAPI([], { title: 'My API', version: '2.0.0' })

    expect(result.info).toEqual({ title: 'My API', version: '2.0.0' })
  })

  it('should include servers', () => {
    const result = toOpenAPI([], {
      servers: [{ url: 'https://api.example.com', description: 'Production' }],
    })

    expect(result.servers).toHaveLength(1)
    expect(result.servers[0]).toEqual({
      url: 'https://api.example.com',
      description: 'Production',
    })
  })

  it('should generate path with method', () => {
    const result = toOpenAPI([
      { method: 'POST', path: '/customers', summary: 'Create customer' },
    ])

    expect(result.paths['/customers'].post).toBeDefined()
    expect(result.paths['/customers'].post.summary).toBe('Create customer')
  })

  it('should include request body', () => {
    const result = toOpenAPI([
      {
        method: 'POST',
        path: '/customers',
        requestBody: {
          properties: [
            { name: 'email', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
          ],
        },
      },
    ])

    const body = result.paths['/customers'].post.requestBody
    expect(body.required).toBe(true)
    expect(body.content['application/json'].schema.properties.email).toEqual({ type: 'string' })
    expect(body.content['application/json'].schema.required).toEqual(['email', 'name'])
  })

  it('should include responses', () => {
    const result = toOpenAPI([
      {
        method: 'POST',
        path: '/customers',
        responses: [
          { status: 201, description: 'Created', schema: 'Customer' },
          { status: 400, description: 'Bad Request' },
        ],
      },
    ])

    const responses = result.paths['/customers'].post.responses
    expect(responses['201'].description).toBe('Created')
    expect(responses['201'].content['application/json'].schema.$ref).toBe('#/components/schemas/Customer')
    expect(responses['400'].description).toBe('Bad Request')
  })

  it('should handle multiple paths', () => {
    const result = toOpenAPI([
      { method: 'GET', path: '/customers' },
      { method: 'POST', path: '/customers' },
      { method: 'GET', path: '/orders' },
    ])

    expect(result.paths['/customers'].get).toBeDefined()
    expect(result.paths['/customers'].post).toBeDefined()
    expect(result.paths['/orders'].get).toBeDefined()
  })
})

// =============================================================================
// toMCP Tests
// =============================================================================

describe('toMCP', () => {
  it('should generate MCP tool definitions', () => {
    const result = toMCP([{ name: 'get_customer' }])

    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].name).toBe('get_customer')
    expect(result.tools[0].inputSchema.type).toBe('object')
  })

  it('should include description', () => {
    const result = toMCP([
      { name: 'get_customer', description: 'Get a customer by ID' },
    ])

    expect(result.tools[0].description).toBe('Get a customer by ID')
  })

  it('should include arguments as properties', () => {
    const result = toMCP([
      {
        name: 'get_customer',
        arguments: [
          { name: 'id', type: 'string', required: true, description: 'Customer ID' },
          { name: 'include_orders', type: 'boolean', required: false },
        ],
      },
    ])

    const tool = result.tools[0]
    expect(tool.inputSchema.properties.id).toEqual({
      type: 'string',
      description: 'Customer ID',
    })
    expect(tool.inputSchema.properties.include_orders).toEqual({ type: 'boolean' })
    expect(tool.inputSchema.required).toEqual(['id'])
  })

  it('should handle multiple functions', () => {
    const result = toMCP([
      { name: 'get_customer' },
      { name: 'create_customer' },
      { name: 'delete_customer' },
    ])

    expect(result.tools).toHaveLength(3)
    expect(result.tools.map((t) => t.name)).toEqual([
      'get_customer',
      'create_customer',
      'delete_customer',
    ])
  })

  it('should handle function with no arguments', () => {
    const result = toMCP([{ name: 'list_all' }])

    expect(result.tools[0].inputSchema.properties).toEqual({})
    expect(result.tools[0].inputSchema.required).toBeUndefined()
  })
})

// =============================================================================
// toGraphQL Tests
// =============================================================================

describe('toGraphQL', () => {
  it('should generate GraphQL type', () => {
    const result = toGraphQL([
      {
        name: 'Customer',
        kind: 'type',
        fields: [
          { name: 'id', type: 'ID!' },
          { name: 'name', type: 'String!' },
        ],
      },
    ])

    expect(result).toContain('type Customer {')
    expect(result).toContain('id: ID!')
    expect(result).toContain('name: String!')
  })

  it('should generate input type', () => {
    const result = toGraphQL([
      {
        name: 'CreateCustomerInput',
        kind: 'input',
        fields: [{ name: 'email', type: 'String!' }],
      },
    ])

    expect(result).toContain('input CreateCustomerInput {')
  })

  it('should generate interface', () => {
    const result = toGraphQL([
      {
        name: 'Node',
        kind: 'interface',
        fields: [{ name: 'id', type: 'ID!' }],
      },
    ])

    expect(result).toContain('interface Node {')
  })

  it('should generate enum', () => {
    const result = toGraphQL([
      {
        name: 'Status',
        kind: 'enum',
        values: ['ACTIVE', 'INACTIVE', 'PENDING'],
      },
    ])

    expect(result).toContain('enum Status {')
    expect(result).toContain('ACTIVE')
    expect(result).toContain('INACTIVE')
    expect(result).toContain('PENDING')
  })

  it('should include implements', () => {
    const result = toGraphQL([
      {
        name: 'Customer',
        kind: 'type',
        implements: ['Node', 'Entity'],
        fields: [{ name: 'id', type: 'ID!' }],
      },
    ])

    expect(result).toContain('type Customer implements Node & Entity {')
  })

  it('should include field arguments', () => {
    const result = toGraphQL([
      {
        name: 'Query',
        kind: 'type',
        fields: [
          {
            name: 'customer',
            type: 'Customer',
            arguments: [{ name: 'id', type: 'ID!' }],
          },
        ],
      },
    ])

    expect(result).toContain('customer(id: ID!): Customer')
  })

  it('should include descriptions when enabled', () => {
    const result = toGraphQL(
      [
        {
          name: 'Customer',
          kind: 'type',
          description: 'A customer in the system',
          fields: [
            { name: 'id', type: 'ID!', description: 'Unique identifier' },
          ],
        },
      ],
      { descriptions: true }
    )

    expect(result).toContain('"""')
    expect(result).toContain('A customer in the system')
    expect(result).toContain('"Unique identifier"')
  })

  it('should exclude descriptions when disabled', () => {
    const result = toGraphQL(
      [
        {
          name: 'Customer',
          kind: 'type',
          description: 'A customer',
          fields: [{ name: 'id', type: 'ID!' }],
        },
      ],
      { descriptions: false }
    )

    expect(result).not.toContain('"""')
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('should handle empty arrays', () => {
    expect(toOpenAPI([])).toHaveProperty('paths', {})
    expect(toMCP([])).toEqual({ tools: [] })
    expect(toGraphQL([])).toBe('')
  })

  it('should handle unicode in JSON', () => {
    const result = toJSON({ name: '客户 🎉' })
    expect(result).toContain('客户 🎉')
  })

  it('should handle special characters in JSON-LD', () => {
    const result = toJSONLD({ name: 'Test "with" <special> chars' })
    expect(result.name).toBe('Test "with" <special> chars')
  })

  it('should handle deeply nested objects', () => {
    const deep = { a: { b: { c: { d: { e: 'value' } } } } }
    const result = fromJSON(toJSON(deep))
    expect(result).toEqual(deep)
  })
})
