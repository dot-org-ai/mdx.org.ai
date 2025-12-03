/**
 * @mdxui/json - JSON serialization and transformation for MDXLD documents
 */

export const name = '@mdxui/json'

export interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}

export interface JSONRenderOptions {
  /** Include content in output */
  includeContent?: boolean
  /** Pretty print JSON */
  pretty?: boolean
  /** Convert to JSON-LD format */
  jsonld?: boolean
  /** Base URL for relative IDs */
  baseUrl?: string
  /** Custom transformers */
  transformers?: Record<string, (value: unknown) => unknown>
}

export interface JSONLDDocument {
  '@context'?: string | Record<string, unknown>
  '@type'?: string | string[]
  '@id'?: string
  '@graph'?: JSONLDDocument[]
  [key: string]: unknown
}

export interface ToolSchema {
  name: string
  description: string
  inputSchema: JSONSchema
}

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  description?: string
  items?: JSONSchema
  enum?: unknown[]
  default?: unknown
  [key: string]: unknown
}

/**
 * Convert an MDXLD document to JSON
 */
export function toJSON(
  doc: MDXLDDocument,
  options: JSONRenderOptions = {}
): Record<string, unknown> {
  const {
    includeContent = true,
    jsonld = false,
  } = options

  if (jsonld) {
    return toJSONLD(doc, options)
  }

  const result: Record<string, unknown> = {
    ...doc.data,
  }

  // Add MDXLD metadata
  if (doc.id) {
    result.$id = doc.id
  }
  if (doc.type) {
    result.$type = doc.type
  }
  if (doc.context) {
    result.$context = doc.context
  }

  // Include content if requested
  if (includeContent && doc.content) {
    result.content = doc.content
  }

  return result
}

/**
 * Convert an MDXLD document to JSON-LD format
 */
export function toJSONLD(
  doc: MDXLDDocument,
  options: JSONRenderOptions = {}
): JSONLDDocument {
  const { baseUrl } = options

  const result: JSONLDDocument = {}

  // Convert $ prefixed keys to @ prefixed
  if (doc.context) {
    result['@context'] = doc.context
  }
  if (doc.type) {
    result['@type'] = doc.type
  }
  if (doc.id) {
    result['@id'] = baseUrl && !doc.id.startsWith('http')
      ? `${baseUrl}${doc.id}`
      : doc.id
  }

  // Add data properties, converting nested $ to @
  for (const [key, value] of Object.entries(doc.data)) {
    if (key.startsWith('$')) {
      result[`@${key.slice(1)}`] = value
    } else {
      result[key] = convertToJSONLD(value)
    }
  }

  return result
}

/**
 * Recursively convert MDXLD values to JSON-LD
 */
function convertToJSONLD(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(convertToJSONLD)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const result: Record<string, unknown> = {}

    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('$')) {
        result[`@${key.slice(1)}`] = convertToJSONLD(val)
      } else {
        result[key] = convertToJSONLD(val)
      }
    }

    return result
  }

  return value
}

/**
 * Parse JSON back to MDXLD document
 */
export function fromJSON(json: Record<string, unknown>): MDXLDDocument {
  const doc: MDXLDDocument = {
    data: {},
    content: '',
  }

  for (const [key, value] of Object.entries(json)) {
    switch (key) {
      case '$id':
      case '@id':
        doc.id = value as string
        break
      case '$type':
      case '@type':
        doc.type = value as string | string[]
        break
      case '$context':
      case '@context':
        doc.context = value as string | Record<string, unknown>
        break
      case 'content':
        doc.content = value as string
        break
      default:
        // Convert @ prefixed keys to $ prefixed for MDXLD
        if (key.startsWith('@')) {
          doc.data[`$${key.slice(1)}`] = value
        } else {
          doc.data[key] = value
        }
    }
  }

  return doc
}

/**
 * Parse JSON-LD to MDXLD document
 */
export function fromJSONLD(jsonld: JSONLDDocument): MDXLDDocument {
  return fromJSON(jsonld as Record<string, unknown>)
}

/**
 * Serialize document to JSON string
 */
export function stringify(
  doc: MDXLDDocument,
  options: JSONRenderOptions = {}
): string {
  const { pretty = false } = options
  const json = toJSON(doc, options)
  return pretty ? JSON.stringify(json, null, 2) : JSON.stringify(json)
}

/**
 * Generate JSON Schema from MDXLD document
 */
export function toJSONSchema(doc: MDXLDDocument): JSONSchema {
  const properties: Record<string, JSONSchema> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(doc.data)) {
    if (key.startsWith('$')) continue // Skip MDXLD metadata

    const schema = inferSchema(value)
    properties[key] = schema

    // Assume all properties are required unless marked optional
    if (typeof value === 'object' && value !== null && 'optional' in value) {
      // Skip
    } else {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

/**
 * Infer JSON Schema from value
 */
function inferSchema(value: unknown): JSONSchema {
  if (value === null) {
    return { type: 'null' }
  }

  if (Array.isArray(value)) {
    const itemSchema = value.length > 0 ? inferSchema(value[0]) : { type: 'string' }
    return { type: 'array', items: itemSchema }
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string' }
    case 'number':
      return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
    case 'boolean':
      return { type: 'boolean' }
    case 'object': {
      const obj = value as Record<string, unknown>

      // Handle explicit type definitions
      if ('type' in obj && typeof obj.type === 'string') {
        return {
          type: obj.type,
          description: obj.description as string | undefined,
          default: obj.default,
          enum: obj.enum as unknown[] | undefined,
        }
      }

      // Nested object
      const properties: Record<string, JSONSchema> = {}
      for (const [key, val] of Object.entries(obj)) {
        properties[key] = inferSchema(val)
      }
      return { type: 'object', properties }
    }
    default:
      return { type: 'string' }
  }
}

/**
 * Generate MCP Tool Schema from MDXLD document
 */
export function toToolSchema(doc: MDXLDDocument): ToolSchema {
  const name = (doc.data.name as string) || doc.id || 'anonymous-tool'
  const description = (doc.data.description as string) || doc.content.slice(0, 200)

  // Get parameters from document
  const parameters = doc.data.parameters as Record<string, unknown> | undefined
  const inputSchema = parameters
    ? buildToolInputSchema(parameters)
    : { type: 'object', properties: {} }

  return {
    name,
    description,
    inputSchema,
  }
}

/**
 * Build input schema for tool from parameters definition
 */
function buildToolInputSchema(parameters: Record<string, unknown>): JSONSchema {
  const properties: Record<string, JSONSchema> = {}
  const required: string[] = []

  for (const [name, def] of Object.entries(parameters)) {
    if (typeof def === 'string') {
      properties[name] = { type: def }
    } else if (typeof def === 'object' && def !== null) {
      const paramDef = def as Record<string, unknown>
      properties[name] = {
        type: (paramDef.type as string) || 'string',
        description: paramDef.description as string | undefined,
        default: paramDef.default,
        enum: paramDef.enum as unknown[] | undefined,
      }
      if (paramDef.required) {
        required.push(name)
      }
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

/**
 * Generate OpenAPI schema component from MDXLD document
 */
export function toOpenAPISchema(doc: MDXLDDocument): Record<string, unknown> {
  const typeValue = Array.isArray(doc.type) ? doc.type[0] : doc.type
  const typeName: string = typeValue || 'Object'
  const schema = toJSONSchema(doc)

  return {
    [typeName]: {
      type: 'object',
      description: doc.data.description as string | undefined,
      properties: schema.properties,
      required: schema.required,
    },
  }
}

/**
 * Validate JSON against a schema (simplified)
 */
export function validateSchema(
  data: unknown,
  schema: JSONSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  function validate(value: unknown, s: JSONSchema, path: string): void {
    if (s.type === 'object' && typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>

      // Check required properties
      if (s.required) {
        for (const req of s.required) {
          if (!(req in obj)) {
            errors.push(`Missing required property: ${path}.${req}`)
          }
        }
      }

      // Validate properties
      if (s.properties) {
        for (const [key, propSchema] of Object.entries(s.properties)) {
          if (key in obj) {
            validate(obj[key], propSchema, `${path}.${key}`)
          }
        }
      }
    } else if (s.type === 'array' && Array.isArray(value)) {
      if (s.items) {
        value.forEach((item, i) => validate(item, s.items!, `${path}[${i}]`))
      }
    } else if (s.type === 'string' && typeof value !== 'string') {
      errors.push(`Expected string at ${path}, got ${typeof value}`)
    } else if (s.type === 'number' && typeof value !== 'number') {
      errors.push(`Expected number at ${path}, got ${typeof value}`)
    } else if (s.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Expected boolean at ${path}, got ${typeof value}`)
    }

    // Check enum
    if (s.enum && !s.enum.includes(value)) {
      errors.push(`Value at ${path} must be one of: ${s.enum.join(', ')}`)
    }
  }

  validate(data, schema, '$')

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Types are already exported where they are declared above
