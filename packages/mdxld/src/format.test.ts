import { describe, it, expect } from 'vitest'
import { formatTypeComments, formatTypeDefinition } from './format.js'

describe('formatTypeComments', () => {
  it('should align trailing comments in ts type code blocks', () => {
    const input = `# Types

\`\`\`ts type
type Task = {
  name: string // Task name
  description?: string // What to do
  status: 'todo' | 'in_progress' | 'done' // Current state
}
\`\`\`
`
    const result = formatTypeComments(input)

    // Check that comments are aligned
    const lines = result.split('\n')
    const nameLine = lines.find((l) => l.includes('name: string'))
    const descLine = lines.find((l) => l.includes('description?: string'))
    const statusLine = lines.find((l) => l.includes('status:'))

    // All comments should start at the same column
    const nameCommentPos = nameLine?.indexOf('//')
    const descCommentPos = descLine?.indexOf('//')
    const statusCommentPos = statusLine?.indexOf('//')

    expect(nameCommentPos).toBe(descCommentPos)
    expect(descCommentPos).toBe(statusCommentPos)
  })

  it('should handle ts types (plural) code blocks', () => {
    const input = `\`\`\`ts types
type A = {
  x: number // X value
  longName: string // Long name
}
\`\`\`
`
    const result = formatTypeComments(input)
    expect(result).toContain('// X value')
    expect(result).toContain('// Long name')
  })

  it('should handle typescript type code blocks', () => {
    const input = `\`\`\`typescript type
type B = {
  a: string // A
  bb: number // BB
}
\`\`\`
`
    const result = formatTypeComments(input)
    expect(result).toContain('// A')
    expect(result).toContain('// BB')
  })

  it('should not modify non-type code blocks', () => {
    const input = `\`\`\`ts
const x = 1 // comment
const longVar = 2 // another
\`\`\`
`
    const result = formatTypeComments(input)
    expect(result).toBe(input)
  })

  it('should handle multiple type blocks independently', () => {
    const input = `\`\`\`ts type
type A = {
  short: string // Short
  veryLongPropertyName: number // Long
}
\`\`\`

\`\`\`ts type
type B = {
  x: string // X
  y: number // Y
}
\`\`\`
`
    const result = formatTypeComments(input)

    // Both blocks should be formatted independently
    expect(result).toContain('// Short')
    expect(result).toContain('// Long')
    expect(result).toContain('// X')
    expect(result).toContain('// Y')
  })

  it('should handle interface definitions', () => {
    const input = `\`\`\`ts type
interface User {
  id: string // User ID
  name: string // Display name
  email?: string // Optional email
}
\`\`\`
`
    const result = formatTypeComments(input)

    const lines = result.split('\n')
    const idLine = lines.find((l) => l.includes('id: string'))
    const nameLine = lines.find((l) => l.includes('name: string'))
    const emailLine = lines.find((l) => l.includes('email?: string'))

    const idCommentPos = idLine?.indexOf('//')
    const nameCommentPos = nameLine?.indexOf('//')
    const emailCommentPos = emailLine?.indexOf('//')

    expect(idCommentPos).toBe(nameCommentPos)
    expect(nameCommentPos).toBe(emailCommentPos)
  })

  it('should preserve lines without comments', () => {
    const input = `\`\`\`ts type
type Task = {
  name: string // Task name
  internal: boolean
  status: 'todo' | 'done' // State
}
\`\`\`
`
    const result = formatTypeComments(input)

    expect(result).toContain('internal: boolean')
    expect(result).not.toContain('internal: boolean //')
  })

  it('should handle nested types', () => {
    const input = `\`\`\`ts type
type Config = {
  server: { // Server settings
    host: string // Hostname
    port: number // Port number
  }
  debug: boolean // Debug mode
}
\`\`\`
`
    const result = formatTypeComments(input)
    expect(result).toContain('// Server settings')
    expect(result).toContain('// Hostname')
    expect(result).toContain('// Debug mode')
  })

  it('should respect minCommentGap option', () => {
    const input = `\`\`\`ts type
type A = {
  x: string // X
  y: number // Y
}
\`\`\`
`
    const result = formatTypeComments(input, { minCommentGap: 4 })

    const lines = result.split('\n')
    const xLine = lines.find((l) => l.includes('x: string'))

    // Should have at least 4 spaces before comment
    expect(xLine).toMatch(/x: string\s{4,}\/\//)
  })

  it('should handle empty content gracefully', () => {
    const result = formatTypeComments('')
    expect(result).toBe('')
  })

  it('should handle content without code blocks', () => {
    const input = '# Just markdown\n\nSome text.'
    const result = formatTypeComments(input)
    expect(result).toBe(input)
  })
})

describe('formatTypeDefinition', () => {
  it('should format a standalone type definition', () => {
    const input = `type Task = {
  name: string // Task name
  description?: string // What to do
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled' // Current state
  priority?: 'low' | 'medium' | 'high' | 'urgent' // Importance level
  dueDate?: Date // Deadline
}`

    const result = formatTypeDefinition(input)

    // All comments should be aligned to the same column
    const lines = result.split('\n')
    const commentPositions = lines.filter((l) => l.includes('//')).map((l) => l.indexOf('//'))

    // All should be equal
    const firstPos = commentPositions[0]
    expect(commentPositions.every((pos) => pos === firstPos)).toBe(true)
  })

  it('should format multiple type definitions', () => {
    const input = `type A = {
  x: string // X
  longProp: number // Long
}

type B = {
  short: boolean // Short
  y: string // Y
}`

    const result = formatTypeDefinition(input)

    // Each type block should be independently aligned
    const lines = result.split('\n')
    const typeALines = lines.slice(0, lines.indexOf(''))
    const typeBLines = lines.slice(lines.indexOf('') + 1)

    const aCommentPos = typeALines.filter((l) => l.includes('//')).map((l) => l.indexOf('//'))
    const bCommentPos = typeBLines.filter((l) => l.includes('//')).map((l) => l.indexOf('//'))

    // Comments within each block should be aligned
    expect(aCommentPos.every((pos) => pos === aCommentPos[0])).toBe(true)
    expect(bCommentPos.every((pos) => pos === bCommentPos[0])).toBe(true)
  })

  it('should handle export type definitions', () => {
    const input = `export type User = {
  id: string // User ID
  name: string // Full name
}`

    const result = formatTypeDefinition(input)
    expect(result).toContain('// User ID')
    expect(result).toContain('// Full name')

    const lines = result.split('\n')
    const idLine = lines.find((l) => l.includes('id: string'))
    const nameLine = lines.find((l) => l.includes('name: string'))

    expect(idLine?.indexOf('//')).toBe(nameLine?.indexOf('//'))
  })
})

describe('comment parsing edge cases', () => {
  it('should not treat // inside strings as comments', () => {
    const input = `\`\`\`ts type
type URL = {
  pattern: string // URL pattern like "https://"
  scheme: 'http' | 'https' // Protocol
}
\`\`\`
`
    const result = formatTypeComments(input)

    // Should still format correctly
    expect(result).toContain('// URL pattern')
    expect(result).toContain('// Protocol')
  })

  it('should handle union types with many options', () => {
    const input = `\`\`\`ts type
type Status = {
  state: 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled' // Current status
  code: number // Status code
}
\`\`\`
`
    const result = formatTypeComments(input)

    const lines = result.split('\n')
    const stateLine = lines.find((l) => l.includes('state:'))
    const codeLine = lines.find((l) => l.includes('code: number'))

    // Both comments should be aligned
    expect(stateLine?.indexOf('//')).toBe(codeLine?.indexOf('//'))
  })
})
