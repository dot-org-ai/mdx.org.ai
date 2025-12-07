/**
 * @mdxld/json
 *
 * Bi-directional conversion between Objects and JSON formats.
 * Supports plain JSON, JSON-LD, JSON Schema, OpenAPI, MCP, and GraphQL.
 */

import type { TextFormat, FormatFetchOptions } from '@mdxld/types'

// ============================================================================
// Types
// ============================================================================

export interface ToJSONOptions {
  /** Pretty print with indentation */
  pretty?: boolean
  /** Indentation spaces (default: 2) */
  indent?: number
}

export interface FromJSONOptions {
  /** Strict mode - throw on parse errors */
  strict?: boolean
}

export interface ToJSONLDOptions {
  /** JSON-LD @context (default: "https://schema.org") */
  context?: string | Record<string, unknown>
  /** @type value */
  type?: string
  /** @id value */
  id?: string
  /** Base URL for IDs */
  baseUrl?: string
}

export interface JSONLDDocument {
  '@context': string | Record<string, unknown>
  '@type'?: string
  '@id'?: string
  [key: string]: unknown
}

export interface ToJSONSchemaOptions {
  /** Schema $id */
  $id?: string
  /** Schema title */
  title?: string
  /** JSON Schema draft version */
  draft?: '2020-12' | '07'
}

export interface JSONSchema {
  $schema: string
  $id?: string
  title?: string
  type: string
  required?: string[]
  properties?: Record<string, unknown>
  [key: string]: unknown
}

export interface PropertyDef {
  name: string
  type?: string
  required?: boolean
  description?: string
  enum?: string[]
  default?: unknown
  format?: string
}

export interface TypeDef {
  name: string
  description?: string
  properties?: PropertyDef[]
  extends?: string
}

export interface APIEndpoint {
  method: string
  path: string
  summary?: string
  description?: string
  requestBody?: {
    properties: PropertyDef[]
    required?: boolean
  }
  responses?: Array<{
    status: number
    description: string
    schema?: string
  }>
}

export interface ToOpenAPIOptions {
  title?: string
  version?: string
  servers?: Array<{ url: string; description?: string }>
}

export interface FunctionDef {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    type: string
    required?: boolean
    description?: string
  }>
  returns?: {
    type: string
    description?: string
  }
}

export interface ToMCPOptions {
  /** Tool namespace */
  namespace?: string
}

export interface MCPTool {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface GraphQLFieldDef {
  name: string
  type: string
  description?: string
  arguments?: Array<{
    name: string
    type: string
  }>
}

export interface GraphQLTypeDef {
  name: string
  kind: 'type' | 'input' | 'interface' | 'enum'
  description?: string
  implements?: string[]
  fields?: GraphQLFieldDef[]
  values?: string[] // for enums
}

export interface ToGraphQLOptions {
  /** Include descriptions as comments */
  descriptions?: boolean
}

// ============================================================================
// JSON
// ============================================================================

/**
 * Convert an object to JSON.
 */
export function toJSON<T>(object: T, options: ToJSONOptions = {}): string {
  const { pretty = true, indent = 2 } = options
  return JSON.stringify(object, null, pretty ? indent : undefined)
}

/**
 * Parse JSON to an object.
 */
export function fromJSON<T = Record<string, unknown>>(json: string, _options: FromJSONOptions = {}): T {
  return JSON.parse(json) as T
}

// ============================================================================
// JSON-LD
// ============================================================================

/** Schema.org property mappings */
const SCHEMA_ORG_MAPPINGS: Record<string, string> = {
  phone: 'telephone',
  'address.street': 'streetAddress',
  'address.city': 'addressLocality',
  'address.state': 'addressRegion',
  'address.zip': 'postalCode',
  'address.country': 'addressCountry',
}

/** Infer @type from object shape */
function inferType(obj: Record<string, unknown>): string | undefined {
  if ('email' in obj && 'name' in obj) {
    return typeof obj.jobTitle === 'string' ? 'Person' : 'Organization'
  }
  if ('streetAddress' in obj || 'addressLocality' in obj) {
    return 'PostalAddress'
  }
  if ('startDate' in obj) {
    return 'Event'
  }
  if ('ingredients' in obj && 'instructions' in obj) {
    return 'Recipe'
  }
  if ('headline' in obj && 'author' in obj) {
    return 'Article'
  }
  if ('properties' in obj && Array.isArray(obj.properties)) {
    return 'Class'
  }
  return undefined
}

/** Transform object keys for Schema.org */
function transformForSchemaOrg(obj: Record<string, unknown>, path = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key
    const mappedKey = SCHEMA_ORG_MAPPINGS[fullPath] || SCHEMA_ORG_MAPPINGS[key] || key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = transformForSchemaOrg(value as Record<string, unknown>, fullPath)
      const nestedType = inferType(nested)
      if (nestedType) {
        result[mappedKey] = { '@type': nestedType, ...nested }
      } else {
        result[mappedKey] = nested
      }
    } else {
      result[mappedKey] = value
    }
  }

  return result
}

/**
 * Convert an object to JSON-LD with Schema.org context.
 */
export function toJSONLD<T extends Record<string, unknown>>(
  object: T,
  options: ToJSONLDOptions = {}
): JSONLDDocument {
  const { context = 'https://schema.org', type, id, baseUrl } = options

  const transformed = transformForSchemaOrg(object)
  const inferredType = type || inferType(object)

  const result: JSONLDDocument = {
    '@context': context,
    ...transformed,
  }

  if (inferredType) {
    result['@type'] = inferredType
  }

  if (id) {
    result['@id'] = baseUrl ? `${baseUrl}${id}` : id
  }

  return result
}

/**
 * Extract an object from JSON-LD.
 */
export function fromJSONLD<T = Record<string, unknown>>(jsonld: JSONLDDocument): T {
  const { '@context': _context, '@type': _type, '@id': _id, ...rest } = jsonld
  return rest as T
}

// ============================================================================
// JSON Schema
// ============================================================================

/** Map type string to JSON Schema type */
function mapTypeToJSONSchema(type: string): Record<string, unknown> {
  const lowerType = type.toLowerCase()

  switch (lowerType) {
    case 'string':
    case 'text':
      return { type: 'string' }
    case 'number':
    case 'float':
    case 'double':
      return { type: 'number' }
    case 'integer':
    case 'int':
      return { type: 'integer' }
    case 'boolean':
    case 'bool':
      return { type: 'boolean' }
    case 'null':
      return { type: 'null' }
    case 'object':
      return { type: 'object' }
    case 'array':
      return { type: 'array' }
    case 'date':
    case 'datetime':
      return { type: 'string', format: 'date-time' }
    case 'email':
      return { type: 'string', format: 'email' }
    case 'url':
    case 'uri':
      return { type: 'string', format: 'uri' }
    case 'uuid':
      return { type: 'string', format: 'uuid' }
    default:
      // Reference to another type
      return { $ref: `#/components/schemas/${type}` }
  }
}

/**
 * Generate JSON Schema from a type definition.
 */
export function toJSONSchema(typeDef: TypeDef, options: ToJSONSchemaOptions = {}): JSONSchema {
  const { draft = '2020-12', $id, title } = options

  const schema: JSONSchema = {
    $schema: draft === '2020-12'
      ? 'https://json-schema.org/draft/2020-12/schema'
      : 'https://json-schema.org/draft-07/schema#',
    type: 'object',
  }

  if ($id || typeDef.name) {
    schema.$id = $id || typeDef.name
  }

  if (title || typeDef.name) {
    schema.title = title || typeDef.name
  }

  if (typeDef.description) {
    schema.description = typeDef.description
  }

  if (typeDef.properties && typeDef.properties.length > 0) {
    const required: string[] = []
    const properties: Record<string, unknown> = {}

    for (const prop of typeDef.properties) {
      const propSchema: Record<string, unknown> = prop.type
        ? mapTypeToJSONSchema(prop.type)
        : { type: 'string' }

      if (prop.description) {
        propSchema.description = prop.description
      }

      if (prop.enum) {
        propSchema.enum = prop.enum
      }

      if (prop.default !== undefined) {
        propSchema.default = prop.default
      }

      if (prop.format) {
        propSchema.format = prop.format
      }

      properties[prop.name] = propSchema

      if (prop.required) {
        required.push(prop.name)
      }
    }

    schema.properties = properties

    if (required.length > 0) {
      schema.required = required
    }
  }

  return schema
}

// ============================================================================
// OpenAPI
// ============================================================================

/**
 * Generate OpenAPI specification from API endpoints.
 */
export function toOpenAPI(endpoints: APIEndpoint[], options: ToOpenAPIOptions = {}): Record<string, unknown> {
  const { title = 'API', version = '1.0.0', servers = [] } = options

  const paths: Record<string, Record<string, unknown>> = {}

  for (const endpoint of endpoints) {
    const method = endpoint.method.toLowerCase()
    const operation: Record<string, unknown> = {}

    if (endpoint.summary) {
      operation.summary = endpoint.summary
    }

    if (endpoint.description) {
      operation.description = endpoint.description
    }

    if (endpoint.requestBody) {
      const required: string[] = []
      const properties: Record<string, unknown> = {}

      for (const prop of endpoint.requestBody.properties) {
        properties[prop.name] = mapTypeToJSONSchema(prop.type || 'string')
        if (prop.required) {
          required.push(prop.name)
        }
      }

      operation.requestBody = {
        required: endpoint.requestBody.required ?? true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties,
              ...(required.length > 0 ? { required } : {}),
            },
          },
        },
      }
    }

    if (endpoint.responses) {
      const responses: Record<string, unknown> = {}

      for (const resp of endpoint.responses) {
        const responseObj: Record<string, unknown> = {
          description: resp.description,
        }

        if (resp.schema) {
          responseObj.content = {
            'application/json': {
              schema: { $ref: `#/components/schemas/${resp.schema}` },
            },
          }
        }

        responses[String(resp.status)] = responseObj
      }

      operation.responses = responses
    }

    if (!paths[endpoint.path]) {
      paths[endpoint.path] = {}
    }

    const pathObj = paths[endpoint.path]
    if (pathObj) {
      pathObj[method] = operation
    }
  }

  return {
    openapi: '3.1.0',
    info: { title, version },
    ...(servers.length > 0 ? { servers } : {}),
    paths,
  }
}

// ============================================================================
// MCP (Model Context Protocol)
// ============================================================================

/**
 * Generate MCP tool definitions from function definitions.
 */
export function toMCP(functions: FunctionDef[], _options: ToMCPOptions = {}): { tools: MCPTool[] } {
  const tools: MCPTool[] = []

  for (const func of functions) {
    const tool: MCPTool = {
      name: func.name,
      inputSchema: {
        type: 'object',
        properties: {},
      },
    }

    if (func.description) {
      tool.description = func.description
    }

    if (func.arguments) {
      const required: string[] = []

      for (const arg of func.arguments) {
        tool.inputSchema.properties[arg.name] = {
          type: arg.type.toLowerCase(),
          ...(arg.description ? { description: arg.description } : {}),
        }

        if (arg.required) {
          required.push(arg.name)
        }
      }

      if (required.length > 0) {
        tool.inputSchema.required = required
      }
    }

    tools.push(tool)
  }

  return { tools }
}

// ============================================================================
// GraphQL
// ============================================================================

/**
 * Generate GraphQL SDL from type definitions.
 */
export function toGraphQL(types: GraphQLTypeDef[], options: ToGraphQLOptions = {}): string {
  const { descriptions = true } = options
  const lines: string[] = []

  for (const typeDef of types) {
    // Add description as block comment
    if (descriptions && typeDef.description) {
      lines.push(`"""`)
      lines.push(typeDef.description)
      lines.push(`"""`)
    }

    // Type declaration
    let declaration = ''
    switch (typeDef.kind) {
      case 'type':
        declaration = `type ${typeDef.name}`
        if (typeDef.implements && typeDef.implements.length > 0) {
          declaration += ` implements ${typeDef.implements.join(' & ')}`
        }
        break
      case 'input':
        declaration = `input ${typeDef.name}`
        break
      case 'interface':
        declaration = `interface ${typeDef.name}`
        break
      case 'enum':
        declaration = `enum ${typeDef.name}`
        break
    }

    lines.push(`${declaration} {`)

    // Enum values
    if (typeDef.kind === 'enum' && typeDef.values) {
      for (const value of typeDef.values) {
        lines.push(`  ${value}`)
      }
    }

    // Fields
    if (typeDef.fields) {
      for (const field of typeDef.fields) {
        if (descriptions && field.description) {
          lines.push(`  "${field.description}"`)
        }

        let fieldLine = `  ${field.name}`

        if (field.arguments && field.arguments.length > 0) {
          const args = field.arguments.map((a) => `${a.name}: ${a.type}`).join(', ')
          fieldLine += `(${args})`
        }

        fieldLine += `: ${field.type}`
        lines.push(fieldLine)

        // Add blank line between fields with descriptions
        if (descriptions && field.description) {
          lines.push('')
        }
      }
    }

    lines.push('}')
    lines.push('')
  }

  return lines.join('\n').trim()
}

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch JSON from URL and parse.
 *
 * @example
 * ```ts
 * const data = await fetchJSON('https://api.example.com/data.json')
 * ```
 */
export async function fetchJSON<T = Record<string, unknown>>(
  url: string,
  options: FormatFetchOptions & FromJSONOptions = {}
): Promise<T> {
  const { headers: requestHeaders, timeout, fetch: customFetch, ...parseOptions } = options
  const fetchFn = customFetch ?? globalThis.fetch

  const controller = new AbortController()
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const response = await fetchFn(url, {
      headers: requestHeaders,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    return fromJSON<T>(text, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ============================================================================
// Format Object
// ============================================================================

/**
 * JSONFormat object implementing the standard Format interface.
 * Named JSONFormat to avoid shadowing the global JSON object.
 *
 * @example
 * ```ts
 * import { JSONFormat } from '@mdxld/json'
 *
 * const data = JSONFormat.parse('{"name": "test"}')
 * const str = JSONFormat.stringify(data)
 * const remote = await JSONFormat.fetch('https://api.example.com/data.json')
 * ```
 */
export const JSONFormat: TextFormat<unknown, FromJSONOptions, ToJSONOptions> = {
  name: 'json',
  mimeTypes: ['application/json', 'text/json'] as const,
  extensions: ['json'] as const,
  parse: fromJSON,
  stringify: toJSON,
  fetch: fetchJSON,
}

// Alias for parse/stringify to match JSON.parse/JSON.stringify pattern
export const parse = fromJSON
export const stringify = toJSON

// Default export
export default JSONFormat
