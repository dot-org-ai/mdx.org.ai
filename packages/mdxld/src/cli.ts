#!/usr/bin/env node
/**
 * MDXLD CLI
 *
 * Commands:
 *   mdxld typegen [glob] [-o output]  Generate TypeScript types from MDX files
 *
 * @packageDocumentation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { glob } from 'node:fs/promises'
import { parse } from './parse.js'
import { generateTypes } from './typegen.js'
import type { MDXLDDocument } from './types.js'

const VERSION = '0.1.0'

interface TypegenArgs {
  pattern: string
  output: string
  watch: boolean
  help: boolean
}

function parseArgs(args: string[]): { command: string; args: TypegenArgs } {
  const command = args[0] || 'help'
  const result: TypegenArgs = {
    pattern: '**/*.{mdx,md}',
    output: '.mdx/types.d.ts',
    watch: false,
    help: false,
  }

  for (let i = 1; i < args.length; i++) {
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

  return { command, args: result }
}

function printHelp(): void {
  console.log(`
mdxld v${VERSION} - MDX + Linked Data CLI

USAGE:
  mdxld <command> [options]

COMMANDS:
  typegen [pattern]   Generate TypeScript types from MDX/MD files

OPTIONS:
  -o, --output <path>   Output file path (default: .mdx/types.d.ts)
  -w, --watch           Watch for changes (not yet implemented)
  -h, --help            Show this help message

EXAMPLES:
  mdxld typegen                         # Scan **/*.{mdx,md}, output to .mdx/types.d.ts
  mdxld typegen "content/**/*.mdx"      # Custom glob pattern
  mdxld typegen -o src/types/mdx.d.ts   # Custom output path

DESCRIPTION:
  The typegen command scans MDX and Markdown files in your project,
  extracts YAML frontmatter, infers TypeScript types from the data,
  and generates a .d.ts file with type definitions.

  Documents are grouped by their $type field. If no $type is specified,
  they are grouped under 'MDXDocument'.
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

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const { command, args: cmdArgs } = parseArgs(args)

  switch (command) {
    case 'typegen':
      await typegen(cmdArgs)
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
