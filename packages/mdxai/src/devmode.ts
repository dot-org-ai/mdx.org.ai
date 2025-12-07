/**
 * Dev Mode for mdxai
 *
 * In development mode, mdxai will:
 * - Store function definitions in .ai/ folder as MDX files
 * - Generate TypeScript types for functions and database nouns
 * - Write types to mdx.d.ts in project root
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { FunctionDefinition, DefinedFunction } from 'ai-functions'
import type { DatabaseSchema, EntitySchema, FieldDefinition } from 'ai-database'

/**
 * Dev mode configuration
 */
export interface DevModeConfig {
  /** Project root directory (default: process.cwd()) */
  root?: string
  /** Path to .ai folder (default: .ai) */
  aiFolderPath?: string
  /** Path to mdx.d.ts (default: mdx.d.ts) */
  typesPath?: string
  /** Watch for changes */
  watch?: boolean
  /** Auto-generate types on function define */
  autoGenerateTypes?: boolean
}

/**
 * Dev mode state
 */
export interface DevModeState {
  root: string
  aiFolder: string
  typesFile: string
  functions: Map<string, FunctionDefinition>
  schemas: Map<string, DatabaseSchema>
}

/**
 * Check if in development mode
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.MDXAI_DEV === 'true'
}

/**
 * Initialize dev mode
 */
export function initDevMode(config: DevModeConfig = {}): DevModeState {
  const root = config.root ?? process.cwd()
  const aiFolder = join(root, config.aiFolderPath ?? '.ai')
  const typesFile = join(root, config.typesPath ?? 'mdx.d.ts')

  // Create .ai folder if it doesn't exist
  if (!existsSync(aiFolder)) {
    mkdirSync(aiFolder, { recursive: true })
  }

  // Create functions subfolder
  const functionsFolder = join(aiFolder, 'functions')
  if (!existsSync(functionsFolder)) {
    mkdirSync(functionsFolder, { recursive: true })
  }

  // Create schemas subfolder
  const schemasFolder = join(aiFolder, 'schemas')
  if (!existsSync(schemasFolder)) {
    mkdirSync(schemasFolder, { recursive: true })
  }

  // Load existing functions
  const functions = new Map<string, FunctionDefinition>()
  if (existsSync(functionsFolder)) {
    const files = readdirSync(functionsFolder).filter(f => f.endsWith('.mdx'))
    for (const file of files) {
      try {
        const content = readFileSync(join(functionsFolder, file), 'utf-8')
        const definition = parseFunctionFromMDX(content)
        if (definition) {
          functions.set(definition.name, definition)
        }
      } catch {
        // Skip invalid files
      }
    }
  }

  // Load existing schemas
  const schemas = new Map<string, DatabaseSchema>()
  if (existsSync(schemasFolder)) {
    const files = readdirSync(schemasFolder).filter(f => f.endsWith('.json'))
    for (const file of files) {
      try {
        const content = readFileSync(join(schemasFolder, file), 'utf-8')
        const schema = JSON.parse(content) as { name: string; schema: DatabaseSchema }
        schemas.set(schema.name, schema.schema)
      } catch {
        // Skip invalid files
      }
    }
  }

  return { root, aiFolder, typesFile, functions, schemas }
}

/**
 * Parse function definition from MDX file
 */
function parseFunctionFromMDX(content: string): FunctionDefinition | null {
  // Extract YAML frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  try {
    // Simple YAML parsing for common fields
    const yaml = match[1]!
    const lines = yaml.split('\n')
    const data: Record<string, unknown> = {}

    for (const line of lines) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim()
        const value = line.slice(colonIdx + 1).trim()
        // Handle basic types
        if (value === 'true') data[key] = true
        else if (value === 'false') data[key] = false
        else if (!isNaN(Number(value)) && value !== '') data[key] = Number(value)
        else if (value.startsWith('"') && value.endsWith('"')) data[key] = value.slice(1, -1)
        else if (value.startsWith("'") && value.endsWith("'")) data[key] = value.slice(1, -1)
        else data[key] = value
      }
    }

    return {
      name: data.name as string,
      type: data.functionType as FunctionDefinition['type'],
      description: data.description as string | undefined,
      args: data.args as Record<string, unknown> | undefined,
      output: data.output as string | undefined,
    } as FunctionDefinition
  } catch {
    return null
  }
}

/**
 * Save function definition to .ai folder
 */
export function saveFunctionDefinition(
  state: DevModeState,
  definition: FunctionDefinition
): void {
  const filename = `${definition.name}.mdx`
  const filepath = join(state.aiFolder, 'functions', filename)

  // Generate MDX content
  const content = generateFunctionMDX(definition)
  writeFileSync(filepath, content, 'utf-8')

  // Update state
  state.functions.set(definition.name, definition)
}

/**
 * Generate MDX content for a function definition
 */
function generateFunctionMDX(definition: FunctionDefinition): string {
  // FunctionDefinition is a union type, cast to access common properties safely
  const def = definition as unknown as Record<string, unknown>
  const name = def.name as string
  const type = def.type as string
  const description = def.description as string | undefined
  const args = def.args as Record<string, unknown> | undefined
  const output = def.output as string | undefined
  const { name: _n, type: _t, description: _d, args: _a, output: _o, ...rest } = def

  const lines: string[] = ['---']
  lines.push(`$type: AIFunction`)
  lines.push(`name: ${name}`)
  lines.push(`functionType: ${type}`)

  if (description) {
    lines.push(`description: "${description.replace(/"/g, '\\"')}"`)
  }

  if (output) {
    lines.push(`output: ${output}`)
  }

  // Serialize args if present
  if (args && Object.keys(args).length > 0) {
    lines.push(`args:`)
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string') {
        lines.push(`  ${key}: "${value}"`)
      } else {
        lines.push(`  ${key}: ${JSON.stringify(value)}`)
      }
    }
  }

  // Add any extra fields
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`)
    } else if (typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value)}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }

  lines.push('---')
  lines.push('')
  lines.push(`# ${name}`)
  lines.push('')
  if (description) {
    lines.push(description)
    lines.push('')
  }
  lines.push(`**Type:** \`${type}\``)
  lines.push('')

  if (args && Object.keys(args).length > 0) {
    lines.push('## Arguments')
    lines.push('')
    for (const [key, value] of Object.entries(args)) {
      const desc = typeof value === 'string' ? value : JSON.stringify(value)
      lines.push(`- **${key}**: ${desc}`)
    }
    lines.push('')
  }

  if (output) {
    lines.push('## Output')
    lines.push('')
    lines.push(`Returns: \`${output}\``)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Save database schema to .ai folder
 */
export function saveSchema(
  state: DevModeState,
  name: string,
  schema: DatabaseSchema
): void {
  const filename = `${name}.json`
  const filepath = join(state.aiFolder, 'schemas', filename)

  writeFileSync(filepath, JSON.stringify({ name, schema }, null, 2), 'utf-8')

  // Update state
  state.schemas.set(name, schema)
}

/**
 * Generate TypeScript types for all functions and schemas
 */
export function generateTypesFile(state: DevModeState): string {
  const lines: string[] = [
    '/**',
    ' * Auto-generated TypeScript types for mdxai',
    ' * ',
    ' * This file is generated automatically in development mode.',
    ' * DO NOT EDIT MANUALLY.',
    ' * ',
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
    "import type { FunctionDefinition, DefinedFunction } from 'ai-functions'",
    "import type { DatabaseSchema, EntitySchema } from 'ai-database'",
    '',
  ]

  // Generate function types
  if (state.functions.size > 0) {
    lines.push('// =============================================================================')
    lines.push('// AI Function Types')
    lines.push('// =============================================================================')
    lines.push('')

    for (const [name, definition] of state.functions) {
      lines.push(generateFunctionType(name, definition))
      lines.push('')
    }

    // Generate function map type
    const functionNames = Array.from(state.functions.keys())
    lines.push('/** Map of all defined AI functions */')
    lines.push('export interface AIFunctions {')
    for (const name of functionNames) {
      const typeName = toPascalCase(name)
      lines.push(`  ${name}: ${typeName}Function`)
    }
    lines.push('}')
    lines.push('')

    // Generate AI proxy type extension
    lines.push('/** Type-safe AI proxy with defined functions */')
    lines.push('export interface TypedAI {')
    for (const [name, definition] of state.functions) {
      const argsType = generateArgsType(definition)
      const returnType = getReturnType(definition)
      lines.push(`  ${name}(args: ${argsType}): Promise<${returnType}>`)
    }
    lines.push('}')
    lines.push('')
  }

  // Generate database schema types
  if (state.schemas.size > 0) {
    lines.push('// =============================================================================')
    lines.push('// Database Schema Types')
    lines.push('// =============================================================================')
    lines.push('')

    for (const [name, schema] of state.schemas) {
      lines.push(generateSchemaTypes(name, schema))
      lines.push('')
    }
  }

  // Export aggregated types
  lines.push('// =============================================================================')
  lines.push('// Aggregated Exports')
  lines.push('// =============================================================================')
  lines.push('')

  if (state.functions.size > 0) {
    lines.push('/** All function argument types */')
    const argTypes = Array.from(state.functions.keys()).map(n => `${toPascalCase(n)}Args`)
    lines.push(`export type AnyFunctionArgs = ${argTypes.join(' | ') || 'never'}`)
    lines.push('')
  }

  if (state.schemas.size > 0) {
    lines.push('/** All entity types */')
    const entityTypes: string[] = []
    for (const [name, schema] of state.schemas) {
      for (const entityName of Object.keys(schema)) {
        entityTypes.push(`${toPascalCase(name)}${entityName}`)
      }
    }
    lines.push(`export type AnyEntity = ${entityTypes.join(' | ') || 'never'}`)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate TypeScript type for a function definition
 */
function generateFunctionType(name: string, definition: FunctionDefinition): string {
  const typeName = toPascalCase(name)
  const lines: string[] = []

  // Generate args interface
  lines.push(`/** Arguments for ${name} function */`)
  lines.push(`export interface ${typeName}Args {`)
  if (definition.args) {
    for (const [key, value] of Object.entries(definition.args)) {
      const fieldType = inferFieldType(value)
      const description = typeof value === 'string' ? value : undefined
      if (description) {
        lines.push(`  /** ${description} */`)
      }
      lines.push(`  ${key}: ${fieldType}`)
    }
  }
  lines.push('}')
  lines.push('')

  // Generate return type
  const returnType = getReturnType(definition)
  lines.push(`/** Return type for ${name} function */`)
  lines.push(`export type ${typeName}Result = ${returnType}`)
  lines.push('')

  // Generate function type
  lines.push(`/** ${name} function type */`)
  lines.push(`export type ${typeName}Function = (args: ${typeName}Args) => Promise<${typeName}Result>`)

  return lines.join('\n')
}

/**
 * Generate args type string
 */
function generateArgsType(definition: FunctionDefinition): string {
  if (!definition.args || Object.keys(definition.args).length === 0) {
    return 'Record<string, never>'
  }

  const props: string[] = []
  for (const [key, value] of Object.entries(definition.args)) {
    const fieldType = inferFieldType(value)
    props.push(`${key}: ${fieldType}`)
  }

  return `{ ${props.join('; ')} }`
}

/**
 * Get return type from definition
 */
function getReturnType(definition: FunctionDefinition): string {
  // FunctionDefinition is a union type, 'output' may not exist on all variants
  const output = (definition as unknown as Record<string, unknown>).output as string | undefined
  if (!output) return 'unknown'

  // Map common output types
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    object: 'Record<string, unknown>',
    array: 'unknown[]',
    'string[]': 'string[]',
    'number[]': 'number[]',
  }

  return typeMap[output] ?? output
}

/**
 * Infer TypeScript type from field value/description
 */
function inferFieldType(value: unknown): string {
  if (typeof value === 'string') {
    // Check for type hints in description
    const lower = value.toLowerCase()
    if (lower.includes('number') || lower.includes('count') || lower.includes('amount')) {
      return 'number'
    }
    if (lower.includes('boolean') || lower.includes('flag') || lower.includes('is ')) {
      return 'boolean'
    }
    if (lower.includes('array') || lower.includes('list of')) {
      return 'unknown[]'
    }
    if (lower.includes('date') || lower.includes('time')) {
      return 'string | Date'
    }
    if (lower.includes('object')) {
      return 'Record<string, unknown>'
    }
    return 'string'
  }

  if (typeof value === 'object' && value !== null) {
    if ('type' in value) {
      return String((value as { type: string }).type)
    }
  }

  return 'unknown'
}

/**
 * Generate TypeScript types for a database schema
 */
function generateSchemaTypes(name: string, schema: DatabaseSchema): string {
  const lines: string[] = []
  const prefix = toPascalCase(name)

  lines.push(`// Schema: ${name}`)

  for (const [entityName, entitySchema] of Object.entries(schema)) {
    const typeName = `${prefix}${entityName}`

    lines.push('')
    lines.push(`/** ${entityName} entity from ${name} schema */`)
    lines.push(`export interface ${typeName} {`)

    for (const [fieldName, fieldDef] of Object.entries(entitySchema)) {
      const { type, isArray, isRelation, relatedType } = parseFieldDefinition(fieldDef)

      let tsType: string
      if (isRelation) {
        tsType = isArray ? `${prefix}${relatedType}[]` : `${prefix}${relatedType}`
      } else {
        tsType = mapFieldType(type)
        if (isArray) tsType = `${tsType}[]`
      }

      lines.push(`  ${fieldName}: ${tsType}`)
    }

    lines.push('}')
  }

  // Generate typed DB interface
  lines.push('')
  lines.push(`/** Typed database operations for ${name} */`)
  lines.push(`export interface ${prefix}DB {`)
  for (const entityName of Object.keys(schema)) {
    const typeName = `${prefix}${entityName}`
    lines.push(`  ${entityName}: {`)
    lines.push(`    get(id: string): Promise<${typeName} | null>`)
    lines.push(`    list(options?: { limit?: number; offset?: number }): Promise<${typeName}[]>`)
    lines.push(`    create(id: string, data: Partial<${typeName}>): Promise<${typeName}>`)
    lines.push(`    update(id: string, data: Partial<${typeName}>): Promise<${typeName}>`)
    lines.push(`    delete(id: string): Promise<boolean>`)
    lines.push(`  }`)
  }
  lines.push('}')

  return lines.join('\n')
}

/**
 * Parse field definition to extract type info
 */
function parseFieldDefinition(fieldDef: FieldDefinition): {
  type: string
  isArray: boolean
  isRelation: boolean
  relatedType: string
} {
  // Array field: ['type']
  if (Array.isArray(fieldDef)) {
    const inner = fieldDef[0] ?? 'unknown'
    const parsed = parseFieldDefinition(inner)
    return { ...parsed, isArray: true }
  }

  // Relation field: 'RelatedType.backref'
  if (fieldDef.includes('.')) {
    const [relatedType] = fieldDef.split('.')
    return {
      type: 'relation',
      isArray: false,
      isRelation: true,
      relatedType: relatedType!,
    }
  }

  return {
    type: fieldDef,
    isArray: false,
    isRelation: false,
    relatedType: '',
  }
}

/**
 * Map field type to TypeScript type
 */
function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    text: 'string',
    markdown: 'string',
    json: 'Record<string, unknown>',
    date: 'Date',
    datetime: 'Date',
    url: 'string',
    email: 'string',
    id: 'string',
    uuid: 'string',
  }

  return typeMap[type.toLowerCase()] ?? 'unknown'
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase())
}

/**
 * Write types file to disk
 */
export function writeTypesFile(state: DevModeState): void {
  const content = generateTypesFile(state)
  writeFileSync(state.typesFile, content, 'utf-8')
}

/**
 * Dev mode instance
 */
let devModeState: DevModeState | null = null

/**
 * Get or initialize dev mode state
 */
export function getDevModeState(config?: DevModeConfig): DevModeState {
  if (!devModeState) {
    devModeState = initDevMode(config)
  }
  return devModeState
}

/**
 * Reset dev mode state (for testing)
 */
export function resetDevModeState(): void {
  devModeState = null
}
