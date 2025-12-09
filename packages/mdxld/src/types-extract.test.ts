import { describe, it, expect } from 'vitest'
import {
  extractTypesFromContent,
  generateDtsFromTypes,
  deduplicateTypes,
  sortTypes,
} from './types-extract.js'

describe('extractTypesFromContent', () => {
  it('should extract type definitions from ts type code blocks', () => {
    const content = `# Schema

\`\`\`ts type
type Task = {
  name: string
  status: 'todo' | 'done'
}
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(1)
    expect(types[0]!.name).toBe('Task')
    expect(types[0]!.kind).toBe('type')
    expect(types[0]!.code).toContain('type Task')
  })

  it('should extract interface definitions', () => {
    const content = `\`\`\`ts type
interface User {
  id: string
  name: string
}
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(1)
    expect(types[0]!.name).toBe('User')
    expect(types[0]!.kind).toBe('interface')
  })

  it('should extract exported types', () => {
    const content = `\`\`\`ts type
export type Config = {
  debug: boolean
}
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(1)
    expect(types[0]!.exported).toBe(true)
  })

  it('should extract multiple types from one block', () => {
    const content = `\`\`\`ts type
type A = string
type B = number
type C = boolean
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(3)
    expect(types.map((t) => t.name)).toEqual(['A', 'B', 'C'])
  })

  it('should extract types from ts types (plural) code blocks', () => {
    const content = `\`\`\`ts types
type Task = { name: string }
type Project = { tasks: Task[] }
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(2)
  })

  it('should extract types from typescript type code blocks', () => {
    const content = `\`\`\`typescript type
type Data = { value: number }
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(1)
    expect(types[0]!.name).toBe('Data')
  })

  it('should ignore non-type code blocks', () => {
    const content = `\`\`\`ts
const x = 1
type NotExtracted = string
\`\`\`

\`\`\`typescript
type AlsoNotExtracted = number
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(0)
  })

  it('should handle complex nested types', () => {
    const content = `\`\`\`ts type
type Complex = {
  nested: {
    deep: {
      value: string
    }
  }
  array: string[]
  union: string | number | null
}
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(1)
    expect(types[0]!.code).toContain('nested')
    expect(types[0]!.code).toContain('deep')
  })

  it('should add source file to extracted types', () => {
    const content = `\`\`\`ts type
type FromFile = string
\`\`\`
`
    const types = extractTypesFromContent(content, 'schema/types.mdx')

    expect(types[0]!.source).toBe('schema/types.mdx')
  })

  it('should handle type aliases', () => {
    const content = `\`\`\`ts type
type ID = string
type Status = 'active' | 'inactive' | 'pending'
type Handler = (event: Event) => void
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(3)
    expect(types[0]!.name).toBe('ID')
    expect(types[1]!.name).toBe('Status')
    expect(types[2]!.name).toBe('Handler')
  })
})

describe('generateDtsFromTypes', () => {
  it('should generate .d.ts content with exports', () => {
    const types = [
      { name: 'Task', kind: 'type' as const, exported: false, code: 'type Task = { name: string }' },
    ]

    const result = generateDtsFromTypes(types)

    expect(result).toContain('export type Task')
    expect(result).toContain('DO NOT EDIT MANUALLY')
  })

  it('should preserve already exported types', () => {
    const types = [
      { name: 'Config', kind: 'type' as const, exported: true, code: 'export type Config = { debug: boolean }' },
    ]

    const result = generateDtsFromTypes(types)

    // Should not double-export
    expect(result).not.toContain('export export')
  })

  it('should respect noExport option', () => {
    const types = [
      { name: 'Internal', kind: 'type' as const, exported: false, code: 'type Internal = string' },
    ]

    const result = generateDtsFromTypes(types, { exportAll: false })

    expect(result).not.toContain('export type Internal')
    expect(result).toContain('type Internal')
  })

  it('should include source comments', () => {
    const types = [
      { name: 'Task', kind: 'type' as const, exported: false, code: 'type Task = string', source: 'schema.mdx' },
    ]

    const result = generateDtsFromTypes(types, { includeSourceComments: true })

    expect(result).toContain('// From: schema.mdx')
  })

  it('should handle interfaces', () => {
    const types = [
      { name: 'User', kind: 'interface' as const, exported: false, code: 'interface User { id: string }' },
    ]

    const result = generateDtsFromTypes(types)

    expect(result).toContain('export interface User')
  })
})

describe('deduplicateTypes', () => {
  it('should keep the last definition for duplicate names', () => {
    const types = [
      { name: 'Task', kind: 'type' as const, exported: false, code: 'type Task = { v1: string }' },
      { name: 'Task', kind: 'type' as const, exported: false, code: 'type Task = { v2: string }' },
    ]

    const result = deduplicateTypes(types)

    expect(result).toHaveLength(1)
    expect(result[0]!.code).toContain('v2')
  })

  it('should preserve unique types', () => {
    const types = [
      { name: 'A', kind: 'type' as const, exported: false, code: 'type A = string' },
      { name: 'B', kind: 'type' as const, exported: false, code: 'type B = number' },
      { name: 'C', kind: 'type' as const, exported: false, code: 'type C = boolean' },
    ]

    const result = deduplicateTypes(types)

    expect(result).toHaveLength(3)
  })
})

describe('sortTypes', () => {
  it('should sort types so dependencies come first', () => {
    const types = [
      { name: 'Project', kind: 'type' as const, exported: false, code: 'type Project = { tasks: Task[] }' },
      { name: 'Task', kind: 'type' as const, exported: false, code: 'type Task = { name: string }' },
    ]

    const result = sortTypes(types)

    expect(result[0]!.name).toBe('Task')
    expect(result[1]!.name).toBe('Project')
  })

  it('should handle types with no dependencies', () => {
    const types = [
      { name: 'A', kind: 'type' as const, exported: false, code: 'type A = string' },
      { name: 'B', kind: 'type' as const, exported: false, code: 'type B = number' },
    ]

    const result = sortTypes(types)

    expect(result).toHaveLength(2)
  })

  it('should handle interface extends', () => {
    const types = [
      { name: 'Child', kind: 'interface' as const, exported: false, code: 'interface Child extends Parent { extra: string }' },
      { name: 'Parent', kind: 'interface' as const, exported: false, code: 'interface Parent { base: string }' },
    ]

    const result = sortTypes(types)

    expect(result[0]!.name).toBe('Parent')
    expect(result[1]!.name).toBe('Child')
  })
})

describe('real-world examples', () => {
  it('should extract Function schema types', () => {
    const content = `# Function Schema

\`\`\`ts type
type Function = {
  name: string                                // Function name
  description?: string                        // What the function does
  parameters: Parameter[]                     // Input parameters
  returns?: Return                            // Return type
  examples?: Example[]                        // Usage examples
}

type Parameter = {
  name: string                                // Parameter name
  type: string                                // TypeScript type
  description?: string                        // Parameter description
  required?: boolean                          // Is required (default: true)
  default?: unknown                           // Default value
}

type Return = {
  type: string                                // Return type
  description?: string                        // What it returns
}

type Example = {
  input: Record<string, unknown>              // Example input
  output?: unknown                            // Expected output
  description?: string                        // Example description
}
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(4)
    expect(types.map((t) => t.name)).toContain('Function')
    expect(types.map((t) => t.name)).toContain('Parameter')
    expect(types.map((t) => t.name)).toContain('Return')
    expect(types.map((t) => t.name)).toContain('Example')
  })

  it('should extract Agent schema types', () => {
    const content = `# Agent Schema

\`\`\`ts type
type Agent = {
  name: string                                // Agent name
  role: string                                // Agent's role
  capabilities: string[]                      // What the agent can do
  tools?: Tool[]                              // Available tools
  model?: string                              // AI model to use
}

type Tool = {
  name: string                                // Tool name
  description: string                         // What the tool does
  schema: Record<string, unknown>             // JSON Schema for parameters
}
\`\`\`
`
    const types = extractTypesFromContent(content)

    expect(types).toHaveLength(2)
    expect(types.map((t) => t.name)).toContain('Agent')
    expect(types.map((t) => t.name)).toContain('Tool')
  })
})
