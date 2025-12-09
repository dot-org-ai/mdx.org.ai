/**
 * MDXLD Types Extraction
 *
 * Extract TypeScript type definitions from MDX code blocks marked with `ts type` or `ts types`.
 * Generates proper .d.ts files with exports.
 *
 * @packageDocumentation
 */

export interface ExtractedType {
  name: string
  kind: 'type' | 'interface'
  exported: boolean
  code: string
  source?: string
}

export interface TypesExtractOptions {
  /** Add export to non-exported types (default: true) */
  exportAll?: boolean
  /** Include source file comments (default: true) */
  includeSourceComments?: boolean
  /** Header comment for generated file */
  header?: string
}

interface CodeBlock {
  lang: string
  content: string
  source?: string
}

/**
 * Extract TypeScript types from MDX content
 */
export function extractTypesFromContent(content: string, source?: string): ExtractedType[] {
  const codeBlocks = findTypeCodeBlocks(content)
  const types: ExtractedType[] = []

  for (const block of codeBlocks) {
    const extracted = parseTypeDefinitions(block.content)
    for (const type of extracted) {
      type.source = source
      types.push(type)
    }
  }

  return types
}

/**
 * Find all code blocks marked as TypeScript types
 */
function findTypeCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const regex = /```([^\n]*)\n([\s\S]*?)\n```/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const lang = match[1]?.trim() || ''
    const langParts = lang.split(/\s+/)

    // Check for ts type, ts types, typescript type, typescript types
    if (
      (langParts[0] === 'ts' || langParts[0] === 'typescript') &&
      (langParts.includes('type') || langParts.includes('types'))
    ) {
      blocks.push({
        lang,
        content: match[2] || '',
      })
    }
  }

  return blocks
}

/**
 * Parse type and interface definitions from TypeScript code
 */
function parseTypeDefinitions(code: string): ExtractedType[] {
  const types: ExtractedType[] = []
  const lines = code.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]!

    // Skip empty lines and comments
    if (line.trim() === '' || line.trim().startsWith('//')) {
      i++
      continue
    }

    // Match type definition: [export] type Name = ...
    const typeMatch = line.match(/^(\s*)(export\s+)?type\s+(\w+)/)
    if (typeMatch) {
      const exported = !!typeMatch[2]
      const name = typeMatch[3]!
      const startLine = i

      // Find the end of the type definition
      let braceCount = 0
      let foundBrace = false
      let endLine = i

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j]!

        for (const char of currentLine) {
          if (char === '{' || char === '(') {
            braceCount++
            foundBrace = true
          } else if (char === '}' || char === ')') {
            braceCount--
          }
        }

        // Type ends at closing brace or at a line without continuation
        if (foundBrace && braceCount === 0) {
          endLine = j
          break
        }

        // Simple type alias (no braces)
        if (!foundBrace && !currentLine.trim().endsWith('=') && !currentLine.trim().endsWith('|') && !currentLine.trim().endsWith('&')) {
          endLine = j
          break
        }

        endLine = j
      }

      const typeCode = lines.slice(startLine, endLine + 1).join('\n')
      types.push({
        name,
        kind: 'type',
        exported,
        code: typeCode,
      })

      i = endLine + 1
      continue
    }

    // Match interface definition: [export] interface Name ...
    const interfaceMatch = line.match(/^(\s*)(export\s+)?interface\s+(\w+)/)
    if (interfaceMatch) {
      const exported = !!interfaceMatch[2]
      const name = interfaceMatch[3]!
      const startLine = i

      // Find the end of the interface definition
      let braceCount = 0
      let foundBrace = false
      let endLine = i

      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j]!

        for (const char of currentLine) {
          if (char === '{') {
            braceCount++
            foundBrace = true
          } else if (char === '}') {
            braceCount--
          }
        }

        if (foundBrace && braceCount === 0) {
          endLine = j
          break
        }

        endLine = j
      }

      const interfaceCode = lines.slice(startLine, endLine + 1).join('\n')
      types.push({
        name,
        kind: 'interface',
        exported,
        code: interfaceCode,
      })

      i = endLine + 1
      continue
    }

    i++
  }

  return types
}

/**
 * Generate .d.ts content from extracted types
 */
export function generateDtsFromTypes(types: ExtractedType[], options: TypesExtractOptions = {}): string {
  const { exportAll = true, includeSourceComments = true, header } = options

  const lines: string[] = []

  // Header
  if (header) {
    lines.push(header)
  } else {
    lines.push('/**')
    lines.push(' * Auto-generated TypeScript types from MDXLD documents')
    lines.push(' * Generated by: mdxld types')
    lines.push(' *')
    lines.push(' * DO NOT EDIT MANUALLY')
    lines.push(' */')
  }
  lines.push('')

  // Group types by source file
  const bySource = new Map<string, ExtractedType[]>()
  for (const type of types) {
    const source = type.source || '_default'
    const existing = bySource.get(source) || []
    existing.push(type)
    bySource.set(source, existing)
  }

  // Generate types
  for (const [source, sourceTypes] of bySource) {
    if (includeSourceComments && source !== '_default') {
      lines.push(`// From: ${source}`)
      lines.push('')
    }

    for (const type of sourceTypes) {
      let code = type.code

      // Add export if needed
      if (exportAll && !type.exported) {
        if (type.kind === 'type') {
          code = code.replace(/^(\s*)type\s+/, '$1export type ')
        } else {
          code = code.replace(/^(\s*)interface\s+/, '$1export interface ')
        }
      }

      lines.push(code)
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Deduplicate types by name, keeping the last definition
 */
export function deduplicateTypes(types: ExtractedType[]): ExtractedType[] {
  const byName = new Map<string, ExtractedType>()

  for (const type of types) {
    byName.set(type.name, type)
  }

  return Array.from(byName.values())
}

/**
 * Sort types to ensure dependencies come first (basic topological sort)
 */
export function sortTypes(types: ExtractedType[]): ExtractedType[] {
  const typeNames = new Set(types.map((t) => t.name))
  const result: ExtractedType[] = []
  const added = new Set<string>()

  // Helper to find dependencies in type code
  function findDependencies(code: string): string[] {
    const deps: string[] = []
    for (const name of typeNames) {
      // Look for type references (not in the definition itself)
      const regex = new RegExp(`\\b${name}\\b`, 'g')
      const matches = code.match(regex) || []
      // If found more than once (definition + usage) or in extends/implements
      if (matches.length > 1 || code.includes(`extends ${name}`) || code.includes(`: ${name}`)) {
        deps.push(name)
      }
    }
    return deps
  }

  // Add types with no dependencies first, then their dependents
  function addType(type: ExtractedType, visited: Set<string> = new Set()): void {
    if (added.has(type.name) || visited.has(type.name)) return
    visited.add(type.name)

    const deps = findDependencies(type.code).filter((d) => d !== type.name)
    for (const dep of deps) {
      const depType = types.find((t) => t.name === dep)
      if (depType) {
        addType(depType, visited)
      }
    }

    if (!added.has(type.name)) {
      result.push(type)
      added.add(type.name)
    }
  }

  for (const type of types) {
    addType(type)
  }

  return result
}
