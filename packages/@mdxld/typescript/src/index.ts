/**
 * @mdxld/typescript
 *
 * Generate TypeScript types, Zod schemas, and JSON5 from objects.
 * All outputs are valid TypeScript/JavaScript.
 */

// ============================================================================
// Types
// ============================================================================

export interface PropertyDef {
  name: string
  type?: string
  required?: boolean
  description?: string
  enum?: string[]
  default?: unknown
  format?: string
}

export interface Schema {
  name: string
  description?: string
  properties?: PropertyDef[]
  extends?: string
}

export interface ToTypeScriptOptions {
  /** Root type name */
  name?: string
  /** Add export keyword (default: true) */
  export?: boolean
  /** Make all properties readonly */
  readonly?: boolean
  /** Optional property handling: 'all' | 'none' | 'infer' (default: 'infer') */
  optional?: 'all' | 'none' | 'infer'
  /** Include JSDoc comments (default: true) */
  comments?: boolean
  /** Indentation spaces (default: 2) */
  indent?: number
}

export interface ToZodOptions {
  /** Schema variable name */
  name?: string
  /** Add export keyword (default: true) */
  export?: boolean
  /** Use strict() mode */
  strict?: boolean
  /** Add coercion for primitives */
  coerce?: boolean
}

export interface ToJSON5Options {
  /** Indentation (default: 2) */
  indent?: number
  /** String quote style: 'single' | 'double' | 'none' */
  quote?: 'single' | 'double' | 'none'
  /** Add trailing commas (default: true) */
  trailingComma?: boolean
  /** Space after colons (default: true) */
  space?: boolean
}

export interface ToJSDocOptions {
  /** Include @typedef tags */
  typedef?: boolean
}

// ============================================================================
// Type Mappings
// ============================================================================

/** Map schema type to TypeScript type */
function mapTypeToTS(type: string): string {
  const lowerType = type.toLowerCase()

  switch (lowerType) {
    case 'string':
    case 'text':
      return 'string'
    case 'number':
    case 'float':
    case 'double':
    case 'integer':
    case 'int':
      return 'number'
    case 'boolean':
    case 'bool':
      return 'boolean'
    case 'null':
      return 'null'
    case 'any':
    case 'unknown':
      return 'unknown'
    case 'object':
      return 'Record<string, unknown>'
    case 'array':
      return 'unknown[]'
    case 'date':
    case 'datetime':
      return 'Date'
    default:
      // Could be a reference to another type or union type
      if (type.includes('|')) {
        return type // Already a union
      }
      if (type.startsWith('[') && type.endsWith(']')) {
        // Array type like [Order]
        const inner = type.slice(1, -1)
        return `${mapTypeToTS(inner)}[]`
      }
      return type // Reference to another type
  }
}

/** Map schema type to Zod schema */
function mapTypeToZod(type: string, options: { coerce?: boolean } = {}): string {
  const lowerType = type.toLowerCase()
  const coerce = options.coerce

  switch (lowerType) {
    case 'string':
    case 'text':
      return 'z.string()'
    case 'number':
    case 'float':
    case 'double':
      return coerce ? 'z.coerce.number()' : 'z.number()'
    case 'integer':
    case 'int':
      return coerce ? 'z.coerce.number().int()' : 'z.number().int()'
    case 'boolean':
    case 'bool':
      return coerce ? 'z.coerce.boolean()' : 'z.boolean()'
    case 'null':
      return 'z.null()'
    case 'any':
    case 'unknown':
      return 'z.unknown()'
    case 'object':
      return 'z.record(z.unknown())'
    case 'array':
      return 'z.array(z.unknown())'
    case 'date':
    case 'datetime':
      return coerce ? 'z.coerce.date()' : 'z.date()'
    case 'email':
      return 'z.string().email()'
    case 'url':
    case 'uri':
      return 'z.string().url()'
    case 'uuid':
      return 'z.string().uuid()'
    default:
      if (type.startsWith('[') && type.endsWith(']')) {
        const inner = type.slice(1, -1)
        return `z.array(${mapTypeToZod(inner, options)})`
      }
      // Reference to another schema
      return `${type}Schema`
  }
}

// ============================================================================
// toTypeScript
// ============================================================================

/**
 * Generate TypeScript type definitions from a schema.
 *
 * @example
 * ```ts
 * const ts = toTypeScript({
 *   name: 'Customer',
 *   properties: [
 *     { name: 'id', type: 'string', required: true },
 *     { name: 'email', type: 'string', required: true }
 *   ]
 * })
 * ```
 */
export function toTypeScript(schema: Schema, options: ToTypeScriptOptions = {}): string {
  const {
    name = schema.name,
    export: useExport = true,
    readonly: useReadonly = false,
    optional = 'infer',
    comments = true,
    indent = 2,
  } = options

  const lines: string[] = []
  const indentStr = ' '.repeat(indent)

  // Type-level JSDoc comment
  if (comments && schema.description) {
    lines.push('/**')
    lines.push(` * ${schema.description}`)
    lines.push(' */')
  }

  // Interface declaration
  const exportKeyword = useExport ? 'export ' : ''
  const extendsClause = schema.extends ? ` extends ${schema.extends}` : ''
  lines.push(`${exportKeyword}interface ${name}${extendsClause} {`)

  // Properties
  if (schema.properties) {
    for (const prop of schema.properties) {
      // Property JSDoc
      if (comments && prop.description) {
        lines.push(`${indentStr}/** ${prop.description} */`)
      }

      // Determine if optional
      let isOptional = false
      if (optional === 'all') {
        isOptional = true
      } else if (optional === 'none') {
        isOptional = false
      } else {
        // 'infer' mode: optional if not required and no default
        isOptional = !prop.required && prop.default === undefined
      }

      // Build type string
      let typeStr: string
      if (prop.enum && prop.enum.length > 0) {
        typeStr = prop.enum.map((v) => `'${v}'`).join(' | ')
      } else {
        typeStr = mapTypeToTS(prop.type || 'string')
      }

      // Property declaration
      const readonlyPrefix = useReadonly ? 'readonly ' : ''
      const optionalSuffix = isOptional ? '?' : ''
      lines.push(`${indentStr}${readonlyPrefix}${prop.name}${optionalSuffix}: ${typeStr}`)
    }
  }

  lines.push('}')

  return lines.join('\n')
}

// ============================================================================
// toZod
// ============================================================================

/**
 * Generate Zod schema definitions from a schema.
 *
 * @example
 * ```ts
 * const zod = toZod({
 *   name: 'Customer',
 *   properties: [
 *     { name: 'email', type: 'email', required: true },
 *     { name: 'tier', type: 'string', enum: ['free', 'pro'] }
 *   ]
 * })
 * ```
 */
export function toZod(schema: Schema, options: ToZodOptions = {}): string {
  const {
    name = schema.name,
    export: useExport = true,
    strict = false,
    coerce = false,
  } = options

  const lines: string[] = []
  const exportKeyword = useExport ? 'export ' : ''

  // Import statement
  lines.push("import { z } from 'zod'")
  lines.push('')

  // Schema definition
  lines.push(`${exportKeyword}const ${name}Schema = z.object({`)

  // Properties
  if (schema.properties) {
    for (const prop of schema.properties) {
      let zodType: string

      // Handle enums
      if (prop.enum && prop.enum.length > 0) {
        const enumValues = prop.enum.map((v) => `'${v}'`).join(', ')
        zodType = `z.enum([${enumValues}])`
      } else if (prop.format === 'email') {
        zodType = 'z.string().email()'
      } else if (prop.format === 'url' || prop.format === 'uri') {
        zodType = 'z.string().url()'
      } else if (prop.format === 'uuid') {
        zodType = 'z.string().uuid()'
      } else {
        zodType = mapTypeToZod(prop.type || 'string', { coerce })
      }

      // Add default
      if (prop.default !== undefined) {
        const defaultValue =
          typeof prop.default === 'string' ? `'${prop.default}'` : String(prop.default)
        zodType += `.default(${defaultValue})`
      }

      // Add optional
      if (!prop.required && prop.default === undefined) {
        zodType += '.optional()'
      }

      // Add description
      if (prop.description) {
        zodType += `.describe('${prop.description.replace(/'/g, "\\'")}')`
      }

      lines.push(`  ${prop.name}: ${zodType},`)
    }
  }

  lines.push('})' + (strict ? '.strict()' : ''))
  lines.push('')

  // Inferred type
  lines.push(`${exportKeyword}type ${name} = z.infer<typeof ${name}Schema>`)

  return lines.join('\n')
}

// ============================================================================
// toJSON5
// ============================================================================

/**
 * Convert object to JSON5 (valid JavaScript/TypeScript).
 *
 * @example
 * ```ts
 * const json5 = toJSON5({
 *   name: 'my-app',
 *   debug: true,
 *   features: ['auth', 'api']
 * })
 * ```
 */
export function toJSON5(object: unknown, options: ToJSON5Options = {}): string {
  const {
    indent = 2,
    quote = 'single',
    trailingComma = true,
    space = true,
  } = options

  const indentStr = ' '.repeat(indent)
  const colonSuffix = space ? ' ' : ''

  function stringify(value: unknown, depth: number): string {
    const currentIndent = indentStr.repeat(depth)
    const nextIndent = indentStr.repeat(depth + 1)

    if (value === null) {
      return 'null'
    }

    if (value === undefined) {
      return 'undefined'
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      // Handle special numbers
      if (Number.isNaN(value as number)) return 'NaN'
      if (value === Infinity) return 'Infinity'
      if (value === -Infinity) return '-Infinity'
      return String(value)
    }

    if (typeof value === 'string') {
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')

      if (quote === 'single') {
        return `'${escaped.replace(/'/g, "\\'")}'`
      } else if (quote === 'double') {
        return `"${escaped.replace(/"/g, '\\"')}"`
      } else {
        // No quotes (only for safe identifiers)
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value) ? value : `'${escaped}'`
      }
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]'
      }

      const items = value.map((item) => `${nextIndent}${stringify(item, depth + 1)}`)
      const comma = trailingComma ? ',' : ''

      return `[\n${items.join(',\n')}${comma}\n${currentIndent}]`
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)

      if (entries.length === 0) {
        return '{}'
      }

      const items = entries.map(([key, val]) => {
        // Use unquoted keys when possible (valid JS identifiers)
        const quotedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
          ? key
          : quote === 'double'
            ? `"${key}"`
            : `'${key}'`

        return `${nextIndent}${quotedKey}:${colonSuffix}${stringify(val, depth + 1)}`
      })

      const comma = trailingComma ? ',' : ''

      return `{\n${items.join(',\n')}${comma}\n${currentIndent}}`
    }

    return String(value)
  }

  return stringify(object, 0)
}

// ============================================================================
// toJSDoc
// ============================================================================

/**
 * Generate JSDoc type definitions (for plain JavaScript).
 *
 * @example
 * ```ts
 * const jsdoc = toJSDoc({
 *   name: 'Customer',
 *   properties: [
 *     { name: 'id', type: 'string', description: 'Unique ID' }
 *   ]
 * })
 * ```
 */
export function toJSDoc(schema: Schema, _options: ToJSDocOptions = {}): string {
  const lines: string[] = []

  lines.push('/**')

  // Type description
  if (schema.description) {
    lines.push(` * ${schema.description}`)
    lines.push(' *')
  }

  // @typedef
  lines.push(` * @typedef {Object} ${schema.name}`)

  // Properties
  if (schema.properties) {
    for (const prop of schema.properties) {
      let typeStr: string
      if (prop.enum && prop.enum.length > 0) {
        typeStr = prop.enum.map((v) => `'${v}'`).join(' | ')
      } else {
        typeStr = mapTypeToJSDoc(prop.type || 'string')
      }

      const optionalMark = !prop.required ? '=' : ''
      const defaultValue = prop.default !== undefined ? `=${prop.default}` : ''
      const description = prop.description ? ` - ${prop.description}` : ''

      lines.push(` * @property {${typeStr}} [${prop.name}${optionalMark}${defaultValue}]${description}`)
    }
  }

  lines.push(' */')

  return lines.join('\n')
}

/** Map type to JSDoc type */
function mapTypeToJSDoc(type: string): string {
  const lowerType = type.toLowerCase()

  switch (lowerType) {
    case 'string':
    case 'text':
    case 'email':
    case 'url':
    case 'uuid':
      return 'string'
    case 'number':
    case 'float':
    case 'double':
    case 'integer':
    case 'int':
      return 'number'
    case 'boolean':
    case 'bool':
      return 'boolean'
    case 'null':
      return 'null'
    case 'any':
    case 'unknown':
      return '*'
    case 'object':
      return 'Object.<string, *>'
    case 'array':
      return 'Array.<*>'
    case 'date':
    case 'datetime':
      return 'Date'
    default:
      if (type.startsWith('[') && type.endsWith(']')) {
        const inner = type.slice(1, -1)
        return `Array.<${mapTypeToJSDoc(inner)}>`
      }
      return type
  }
}

// ============================================================================
// fromTypeScript (Basic Parser)
// ============================================================================

/**
 * Parse TypeScript interface to schema object.
 *
 * @example
 * ```ts
 * const schema = fromTypeScript(`
 *   interface Customer {
 *     id: string
 *     email: string
 *   }
 * `)
 * ```
 */
export function fromTypeScript(source: string): Schema {
  const result: Schema = { name: '', properties: [] }

  // Extract interface name
  const interfaceMatch = source.match(/interface\s+(\w+)(?:\s+extends\s+(\w+))?/)
  if (interfaceMatch && interfaceMatch[1]) {
    result.name = interfaceMatch[1]
    if (interfaceMatch[2]) {
      result.extends = interfaceMatch[2]
    }
  }

  // Extract properties
  const propertyRegex = /(?:\/\*\*\s*(.*?)\s*\*\/\s*)?(readonly\s+)?(\w+)(\?)?:\s*([^;\n]+)/g
  let match

  while ((match = propertyRegex.exec(source)) !== null) {
    const [, description, , name, optional, type] = match
    if (!name || !type) continue

    result.properties!.push({
      name,
      type: type.trim(),
      required: !optional,
      description: description?.trim(),
    })
  }

  return result
}
