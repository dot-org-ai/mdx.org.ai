/**
 * MDXLD Format Module
 *
 * Formats MDX files using Prettier with custom formatting for TypeScript type blocks.
 * Aligns trailing comments in type definitions to the widest property line.
 *
 * @packageDocumentation
 */

export interface FormatOptions {
  /** Use Prettier for base formatting (default: true) */
  prettier?: boolean
  /** Prettier config file path */
  prettierConfig?: string
  /** Tab width for alignment (default: 2) */
  tabWidth?: number
  /** Minimum gap between code and comment (default: 2) */
  minCommentGap?: number
  /** Target column for comment alignment (default: auto-calculated) */
  commentColumn?: number
}

interface CodeBlock {
  start: number
  end: number
  lang: string
  meta: string
  content: string
  raw: string
}

interface TypeBlock {
  startLine: number
  endLine: number
  lines: string[]
}

/**
 * Format MDXLD content
 *
 * @param content - Raw MDXLD string content
 * @param options - Format options
 * @returns Formatted content
 */
export async function format(content: string, options: FormatOptions = {}): Promise<string> {
  const { prettier: usePrettier = true } = options

  let result = content

  // First, run Prettier if enabled
  if (usePrettier) {
    result = await formatWithPrettier(result, options)
  }

  // Then apply custom TypeScript type comment alignment
  result = formatTypeComments(result, options)

  return result
}

/**
 * Format content using Prettier
 */
async function formatWithPrettier(content: string, options: FormatOptions): Promise<string> {
  try {
    // Dynamic import to handle optional dependency
    const prettier = await import('prettier')

    // Try to resolve config from the project
    const config = options.prettierConfig
      ? await prettier.resolveConfig(options.prettierConfig)
      : await prettier.resolveConfig(process.cwd())

    return await prettier.format(content, {
      ...config,
      parser: 'mdx',
    })
  } catch (error) {
    // If Prettier is not available or fails, return content as-is
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      console.warn('Prettier not found, skipping base formatting. Install prettier for full formatting support.')
    } else {
      console.warn('Prettier formatting failed:', (error as Error).message)
    }
    return content
  }
}

/**
 * Format TypeScript type blocks with aligned comments
 *
 * Looks for code blocks with ```ts type or ```ts types and aligns trailing comments
 */
export function formatTypeComments(content: string, options: FormatOptions = {}): string {
  const { minCommentGap = 2, commentColumn } = options

  // Find all TypeScript type code blocks
  const codeBlocks = findCodeBlocks(content)
  const typeBlocks = codeBlocks.filter((block) => {
    const langParts = block.lang.split(/\s+/)
    return (
      (langParts[0] === 'ts' || langParts[0] === 'typescript') &&
      (langParts.includes('type') || langParts.includes('types'))
    )
  })

  if (typeBlocks.length === 0) {
    return content
  }

  // Process blocks in reverse order to maintain correct positions
  let result = content
  for (let i = typeBlocks.length - 1; i >= 0; i--) {
    const block = typeBlocks[i]!
    const formattedContent = alignTypeBlockComments(block.content, minCommentGap, commentColumn)
    const newBlock = '```' + block.lang + '\n' + formattedContent + '\n```'
    result = result.slice(0, block.start) + newBlock + result.slice(block.end)
  }

  return result
}

/**
 * Find all code blocks in content
 */
function findCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  // Match code blocks: ```lang meta\ncontent\n```
  // lang can include spaces like "ts type" or "ts types"
  const regex = /```([^\n]*)\n([\s\S]*?)\n```/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const fullLang = match[1]?.trim() || ''
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      lang: fullLang,
      meta: '',
      content: match[2] || '',
      raw: match[0],
    })
  }

  return blocks
}

/**
 * Align comments in a TypeScript type block
 *
 * Finds each type definition (type X = { ... }) and aligns comments within that block
 */
function alignTypeBlockComments(content: string, minGap: number, targetColumn?: number): string {
  const lines = content.split('\n')

  // Find type blocks (type X = { ... })
  const typeBlocks = findTypeDefinitions(lines)

  // Process each type block independently
  for (const block of typeBlocks) {
    alignBlockComments(lines, block, minGap, targetColumn)
  }

  return lines.join('\n')
}

/**
 * Find type definition blocks in the lines
 */
function findTypeDefinitions(lines: string[]): TypeBlock[] {
  const blocks: TypeBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    // Look for type or interface definitions
    if (/^\s*(export\s+)?(type|interface)\s+\w+/.test(line)) {
      const startLine = i
      let braceCount = 0
      let foundBrace = false

      // Count braces to find the end of the type
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
          blocks.push({
            startLine,
            endLine: j,
            lines: lines.slice(startLine, j + 1),
          })
          i = j + 1
          break
        }
      }

      if (!foundBrace || braceCount !== 0) {
        i++
      }
    } else {
      i++
    }
  }

  return blocks
}

/**
 * Align comments within a specific type block
 */
function alignBlockComments(lines: string[], block: TypeBlock, minGap: number, targetColumn?: number): void {
  // Find all lines with trailing comments and calculate max code width
  const linesWithComments: { index: number; code: string; comment: string }[] = []
  let maxCodeWidth = 0

  for (let i = block.startLine; i <= block.endLine; i++) {
    const line = lines[i]!
    const parsed = parseLineComment(line)

    if (parsed.comment) {
      linesWithComments.push({
        index: i,
        code: parsed.code,
        comment: parsed.comment,
      })
      maxCodeWidth = Math.max(maxCodeWidth, parsed.code.trimEnd().length)
    }
  }

  if (linesWithComments.length === 0) {
    return
  }

  // Calculate target column: either specified, or max code width + min gap
  const column = targetColumn ?? maxCodeWidth + minGap

  // Align comments
  for (const { index, code, comment } of linesWithComments) {
    const codeWidth = code.trimEnd().length
    const spaces = Math.max(minGap, column - codeWidth)
    lines[index] = code.trimEnd() + ' '.repeat(spaces) + comment
  }
}

/**
 * Parse a line to extract code and trailing comment
 */
function parseLineComment(line: string): { code: string; comment: string } {
  // Handle string literals and avoid false positives
  let inString: string | null = null
  let i = 0

  while (i < line.length) {
    const char = line[i]!

    // Handle string literals
    if ((char === '"' || char === "'" || char === '`') && (i === 0 || line[i - 1] !== '\\')) {
      if (inString === char) {
        inString = null
      } else if (!inString) {
        inString = char
      }
    }

    // Check for // comment outside strings
    if (!inString && char === '/' && line[i + 1] === '/') {
      return {
        code: line.slice(0, i),
        comment: line.slice(i),
      }
    }

    i++
  }

  return { code: line, comment: '' }
}

/**
 * Format a single TypeScript type definition string
 *
 * Useful for formatting type definitions outside of MDX context
 *
 * @param typeCode - TypeScript type definition code
 * @param options - Format options
 * @returns Formatted type code with aligned comments
 */
export function formatTypeDefinition(typeCode: string, options: FormatOptions = {}): string {
  return alignTypeBlockComments(typeCode, options.minCommentGap ?? 2, options.commentColumn)
}
