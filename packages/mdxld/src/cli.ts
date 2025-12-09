#!/usr/bin/env node
/**
 * MDXLD CLI
 *
 * Commands:
 *   mdxld typegen [glob] [-o output]  Generate TypeScript types from MDX files
 *   mdxld types [glob] [-o output]    Extract TypeScript types from code blocks
 *   mdxld format [glob] [options]     Format MDX files with type comment alignment
 *
 * @packageDocumentation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { glob } from 'node:fs/promises'
import { parse } from './parse.js'
import { generateTypes } from './typegen.js'
import { format } from './format.js'
import {
  extractTypesFromContent,
  generateDtsFromTypes,
  deduplicateTypes,
  sortTypes,
} from './types-extract.js'
import type { MDXLDDocument } from './types.js'

const VERSION = '0.1.0'

interface TypegenArgs {
  pattern: string
  output: string
  watch: boolean
  help: boolean
}

interface FormatArgs {
  pattern: string
  write: boolean
  check: boolean
  noPrettier: boolean
  minGap: number
  help: boolean
}

interface TypesArgs {
  pattern: string
  output: string
  noExport: boolean
  noSort: boolean
  help: boolean
}

function parseTypegenArgs(args: string[]): TypegenArgs {
  const result: TypegenArgs = {
    pattern: '**/*.{mdx,md}',
    output: '.mdx/types.d.ts',
    watch: false,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '-o' || arg === '--output') {
      result.output = args[++i] || result.output
    } else if (arg === '-w' || arg === '--watch') {
      result.watch = true
    } else if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (!arg.startsWith('-')) {
      result.pattern = arg
    }
  }

  return result
}

function parseFormatArgs(args: string[]): FormatArgs {
  const result: FormatArgs = {
    pattern: '**/*.{mdx,md}',
    write: false,
    check: false,
    noPrettier: false,
    minGap: 2,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '-w' || arg === '--write') {
      result.write = true
    } else if (arg === '-c' || arg === '--check') {
      result.check = true
    } else if (arg === '--no-prettier') {
      result.noPrettier = true
    } else if (arg === '--min-gap') {
      result.minGap = parseInt(args[++i] || '2', 10)
    } else if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (!arg.startsWith('-')) {
      result.pattern = arg
    }
  }

  return result
}

function parseTypesArgs(args: string[]): TypesArgs {
  const result: TypesArgs = {
    pattern: '**/*.{mdx,md}',
    output: '.mdx/types.d.ts',
    noExport: false,
    noSort: false,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '-o' || arg === '--output') {
      result.output = args[++i] || result.output
    } else if (arg === '--no-export') {
      result.noExport = true
    } else if (arg === '--no-sort') {
      result.noSort = true
    } else if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (!arg.startsWith('-')) {
      result.pattern = arg
    }
  }

  return result
}

function printHelp(): void {
  console.log(`
mdxld v${VERSION} - MDX + Linked Data CLI

USAGE:
  mdxld <command> [options]

COMMANDS:
  typegen [pattern]   Generate TypeScript types from MDX frontmatter
  types [pattern]     Extract TypeScript types from code blocks
  format [pattern]    Format MDX files with type comment alignment

OPTIONS (typegen):
  -o, --output <path>   Output file path (default: .mdx/types.d.ts)
  -w, --watch           Watch for changes (not yet implemented)
  -h, --help            Show this help message

OPTIONS (types):
  -o, --output <path>   Output file path (default: .mdx/types.d.ts)
  --no-export           Don't add export to non-exported types
  --no-sort             Don't sort types by dependencies
  -h, --help            Show this help message

OPTIONS (format):
  -w, --write           Write formatted output back to files
  -c, --check           Check if files are formatted (exit 1 if not)
  --no-prettier         Skip Prettier formatting (only align comments)
  --min-gap <n>         Minimum spaces before comments (default: 2)
  -h, --help            Show this help message

EXAMPLES:
  mdxld typegen                         # Infer types from frontmatter
  mdxld typegen "content/**/*.mdx"      # Custom glob pattern

  mdxld types                           # Extract types from code blocks
  mdxld types "schema/**/*.mdx"         # Custom glob pattern
  mdxld types -o src/types/schema.d.ts  # Custom output path

  mdxld format                          # Format all MDX/MD files (dry run)
  mdxld format -w                       # Format and write changes
  mdxld format -c                       # Check formatting (CI mode)

DESCRIPTION:
  typegen - Infers TypeScript types from YAML frontmatter data.

  types - Extracts TypeScript type/interface definitions from code blocks
  marked with \`\`\`ts type or \`\`\`ts types. Useful for schema definitions
  like Functions, Workflows, Agents, Nouns, Verbs, etc.

  format - Formats MDX files using Prettier and aligns trailing comments
  in TypeScript type blocks.
`)
}

async function scanFiles(pattern: string): Promise<string[]> {
  const files: string[] = []
  const cwd = process.cwd()

  // Use Node's built-in glob (Node 22+)
  try {
    for await (const entry of glob(pattern, { cwd })) {
      files.push(resolve(cwd, entry))
    }
  } catch {
    // Fallback for older Node versions - simple recursive scan
    console.error('Warning: glob not available, using fallback')
    // For now, just return empty - in production we'd add a fallback
  }

  return files
}

async function typegen(args: TypegenArgs): Promise<void> {
  if (args.help) {
    printHelp()
    return
  }

  const cwd = process.cwd()
  console.log(`Scanning for ${args.pattern}...`)

  const files = await scanFiles(args.pattern)

  if (files.length === 0) {
    console.log('No files found matching pattern')
    return
  }

  console.log(`Found ${files.length} file(s)`)

  // Parse all files
  const docs: MDXLDDocument[] = []
  const errors: { file: string; error: string }[] = []

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      const doc = parse(content)

      // Add source file info to data for debugging
      const relativePath = relative(cwd, file)
      docs.push({
        ...doc,
        data: {
          ...doc.data,
          _source: relativePath,
        },
      })
    } catch (err) {
      errors.push({
        file: relative(cwd, file),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (errors.length > 0) {
    console.warn(`\nWarnings (${errors.length} file(s) had errors):`)
    for (const { file, error } of errors.slice(0, 5)) {
      console.warn(`  ${file}: ${error}`)
    }
    if (errors.length > 5) {
      console.warn(`  ... and ${errors.length - 5} more`)
    }
  }

  if (docs.length === 0) {
    console.log('No valid documents found')
    return
  }

  // Remove _source from type generation
  const cleanDocs = docs.map((doc) => {
    const { _source, ...rest } = doc.data
    return { ...doc, data: rest }
  })

  // Generate types
  const types = generateTypes(cleanDocs)

  // Write output
  const outputPath = resolve(cwd, args.output)
  const outputDir = dirname(outputPath)

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  writeFileSync(outputPath, types, 'utf-8')

  console.log(`\nGenerated types for ${docs.length} document(s)`)
  console.log(`Output: ${relative(cwd, outputPath)}`)

  // Print type summary
  const typeNames = new Set<string>()
  for (const doc of docs) {
    const type = doc.type ?? doc.data.$type
    if (typeof type === 'string') {
      typeNames.add(type)
    } else if (Array.isArray(type) && type.length > 0) {
      typeNames.add(type[0]!)
    } else {
      typeNames.add('MDXDocument')
    }
  }
  console.log(`Types: ${[...typeNames].join(', ')}`)
}

async function formatCommand(args: FormatArgs): Promise<void> {
  if (args.help) {
    printHelp()
    return
  }

  const cwd = process.cwd()
  console.log(`Scanning for ${args.pattern}...`)

  const files = await scanFiles(args.pattern)

  if (files.length === 0) {
    console.log('No files found matching pattern')
    return
  }

  console.log(`Found ${files.length} file(s)`)

  let hasChanges = false
  const results: { file: string; changed: boolean; error?: string }[] = []

  for (const file of files) {
    const relativePath = relative(cwd, file)
    try {
      const content = readFileSync(file, 'utf-8')
      const formatted = await format(content, {
        prettier: !args.noPrettier,
        minCommentGap: args.minGap,
      })

      const changed = content !== formatted

      if (changed) {
        hasChanges = true
        if (args.write) {
          writeFileSync(file, formatted, 'utf-8')
          results.push({ file: relativePath, changed: true })
        } else {
          results.push({ file: relativePath, changed: true })
        }
      } else {
        results.push({ file: relativePath, changed: false })
      }
    } catch (err) {
      results.push({
        file: relativePath,
        changed: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Print results
  const changedFiles = results.filter((r) => r.changed && !r.error)
  const errorFiles = results.filter((r) => r.error)
  const unchangedFiles = results.filter((r) => !r.changed && !r.error)

  if (changedFiles.length > 0) {
    console.log(`\n${args.write ? 'Formatted' : 'Would format'} ${changedFiles.length} file(s):`)
    for (const { file } of changedFiles.slice(0, 10)) {
      console.log(`  ${file}`)
    }
    if (changedFiles.length > 10) {
      console.log(`  ... and ${changedFiles.length - 10} more`)
    }
  }

  if (errorFiles.length > 0) {
    console.warn(`\nErrors (${errorFiles.length} file(s)):`)
    for (const { file, error } of errorFiles.slice(0, 5)) {
      console.warn(`  ${file}: ${error}`)
    }
  }

  if (unchangedFiles.length > 0 && changedFiles.length === 0) {
    console.log('\nAll files are already formatted.')
  }

  // Exit with error code for --check mode
  if (args.check && hasChanges) {
    console.log('\nSome files need formatting. Run with -w to fix.')
    process.exit(1)
  }
}

async function typesCommand(args: TypesArgs): Promise<void> {
  if (args.help) {
    printHelp()
    return
  }

  const cwd = process.cwd()
  console.log(`Scanning for ${args.pattern}...`)

  const files = await scanFiles(args.pattern)

  if (files.length === 0) {
    console.log('No files found matching pattern')
    return
  }

  console.log(`Found ${files.length} file(s)`)

  // Extract types from all files
  const allTypes: ReturnType<typeof extractTypesFromContent> = []
  const errors: { file: string; error: string }[] = []

  for (const file of files) {
    const relativePath = relative(cwd, file)
    try {
      const content = readFileSync(file, 'utf-8')
      const types = extractTypesFromContent(content, relativePath)
      allTypes.push(...types)
    } catch (err) {
      errors.push({
        file: relativePath,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  if (errors.length > 0) {
    console.warn(`\nWarnings (${errors.length} file(s) had errors):`)
    for (const { file, error } of errors.slice(0, 5)) {
      console.warn(`  ${file}: ${error}`)
    }
    if (errors.length > 5) {
      console.warn(`  ... and ${errors.length - 5} more`)
    }
  }

  if (allTypes.length === 0) {
    console.log('\nNo TypeScript types found in code blocks.')
    console.log('Types are extracted from code blocks marked with ```ts type or ```ts types')
    return
  }

  // Deduplicate and optionally sort
  let types = deduplicateTypes(allTypes)
  if (!args.noSort) {
    types = sortTypes(types)
  }

  // Generate .d.ts content
  const dtsContent = generateDtsFromTypes(types, {
    exportAll: !args.noExport,
    includeSourceComments: true,
  })

  // Write output
  const outputPath = resolve(cwd, args.output)
  const outputDir = dirname(outputPath)

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  writeFileSync(outputPath, dtsContent, 'utf-8')

  console.log(`\nExtracted ${types.length} type(s) from ${files.length} file(s)`)
  console.log(`Output: ${relative(cwd, outputPath)}`)

  // Print type summary
  const typeNames = types.map((t) => t.name)
  if (typeNames.length <= 10) {
    console.log(`Types: ${typeNames.join(', ')}`)
  } else {
    console.log(`Types: ${typeNames.slice(0, 10).join(', ')}, ... and ${typeNames.length - 10} more`)
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0] || 'help'
  const cmdArgs = args.slice(1)

  switch (command) {
    case 'typegen':
      await typegen(parseTypegenArgs(cmdArgs))
      break
    case 'types':
      await typesCommand(parseTypesArgs(cmdArgs))
      break
    case 'format':
      await formatCommand(parseFormatArgs(cmdArgs))
      break
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      break
    case '--version':
    case '-v':
      console.log(`mdxld v${VERSION}`)
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
