#!/usr/bin/env node
/**
 * MDXDB CLI
 *
 * Command line interface for publishing and managing MDX databases
 *
 * @packageDocumentation
 */

import { ensureLoggedIn } from 'oauth.do'
import { resolve } from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'mdxld'

export interface CliOptions {
  command: 'publish' | 'help' | 'version'
  path: string
  name?: string
  baseUrl: string
  dryRun: boolean
  verbose: boolean
  help: boolean
}

export const VERSION = '0.0.0'

const HELP_TEXT = `
mdxdb - Create, Manage, & Publish MDX Databases

Usage:
  mdxdb [command] [options]

Commands:
  publish             Publish MDX files to remote database (default)
  help                Show this help message
  version             Show version

Options:
  --path, -p <path>      Path to MDX files or directory (default: ./content)
  --name, -n <name>      Database name/namespace
  --base-url <url>       API base URL (default: https://apis.do)
  --dry-run              Show what would be published without publishing
  --verbose, -v          Show detailed output
  --help, -h             Show this help message

Examples:
  # Publish current content directory
  mdxdb publish

  # Publish specific directory
  mdxdb publish --path ./docs

  # Publish with custom namespace
  mdxdb publish --name my-project

  # Dry run to see what would be published
  mdxdb publish --dry-run

Environment Variables:
  DO_TOKEN               Authentication token (auto-prompted if not set)
  MDXDB_API_URL          API base URL (default: https://apis.do)
`

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: 'publish',
    path: process.env.MDXDB_PATH || './content',
    baseUrl: process.env.MDXDB_API_URL || 'https://apis.do',
    dryRun: false,
    verbose: false,
    help: false,
  }

  // Parse command
  const firstArg = args[0]
  if (args.length > 0 && firstArg && !firstArg.startsWith('-')) {
    const cmd = firstArg.toLowerCase()
    if (cmd === 'publish') {
      options.command = 'publish'
    } else if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
      options.command = 'version'
    } else if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
      options.command = 'help'
    }
    args = args.slice(1)
  }

  // Parse options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--path':
      case '-p':
        options.path = next || './content'
        i++
        break
      case '--name':
      case '-n':
        options.name = next
        i++
        break
      case '--base-url':
        options.baseUrl = next || 'https://apis.do'
        i++
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--help':
      case '-h':
        options.help = true
        options.command = 'help'
        break
      case '--version':
        options.command = 'version'
        break
    }
  }

  return options
}

/**
 * Recursively find all MDX files in a directory
 */
function findMdxFiles(dir: string, basePath: string = ''): string[] {
  const files: string[] = []

  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relativePath = basePath ? `${basePath}/${entry}` : entry
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...findMdxFiles(fullPath, relativePath))
      }
    } else if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Parse an MDX file and return document data
 */
function parseDocument(filePath: string, basePath: string): { id: string; document: ReturnType<typeof parse> } | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const document = parse(content)

    // Generate ID from file path (relative to base)
    const relativePath = relative(basePath, filePath)
    const id = relativePath
      .replace(/\.(mdx|md)$/, '')
      .replace(/\\/g, '/') // Normalize Windows paths
      .replace(/\/index$/, '') // Remove trailing /index
      .replace(/^\//, '') // Remove leading slash

    return { id, document }
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error)
    return null
  }
}

/**
 * Publish documents to remote database
 */
export async function runPublish(options: CliOptions): Promise<void> {
  console.log('📤 mdxdb publish\n')

  const resolvedPath = resolve(options.path)
  console.log(`📁 Path: ${resolvedPath}`)

  if (!existsSync(resolvedPath)) {
    console.error(`❌ Path does not exist: ${resolvedPath}`)
    process.exit(1)
  }

  // Find all MDX files
  const files = findMdxFiles(resolvedPath)

  if (files.length === 0) {
    console.log('⚠️  No MDX files found')
    return
  }

  console.log(`📋 Found ${files.length} file(s)`)

  if (options.dryRun) {
    console.log('\n🔬 Dry run mode - no changes will be made\n')
  }

  // Get authentication token
  let token: string
  if (options.dryRun) {
    token = 'dry-run-token'
    console.log('🔑 Skipping authentication (dry run)')
  } else {
    console.log('🔐 Authenticating...')
    try {
      const auth = await ensureLoggedIn()
      token = auth.token
      if (auth.isNewLogin) {
        console.log('✅ Logged in successfully')
      } else {
        console.log('✅ Using existing session')
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      process.exit(1)
    }
  }

  // Parse and prepare documents
  const documents: Array<{ id: string; document: ReturnType<typeof parse> }> = []
  for (const filePath of files) {
    const parsed = parseDocument(filePath, resolvedPath)
    if (parsed) {
      documents.push(parsed)
      if (options.verbose) {
        console.log(`  📄 ${parsed.id}`)
      }
    }
  }

  console.log(`\n📦 Publishing ${documents.length} document(s) to ${options.baseUrl}/db`)

  if (options.dryRun) {
    console.log('\n📋 Documents to publish:')
    for (const { id, document } of documents) {
      const type = document.type || 'Document'
      console.log(`  • ${id} (${type})`)
    }
    console.log('\n✅ Dry run complete')
    return
  }

  // POST to /db endpoint
  try {
    const response = await fetch(`${options.baseUrl}/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: options.name,
        documents: documents.map(({ id, document }) => ({
          id,
          type: document.type ?? undefined,
          context: document.context ?? undefined,
          data: document.data,
          content: document.content,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json() as { success: boolean; published: number; url?: string; error?: string }

    if (result.success) {
      console.log(`\n✅ Published ${result.published} document(s)`)
      if (result.url) {
        console.log(`🌐 URL: ${result.url}`)
      }
    } else {
      throw new Error(result.error || 'Unknown error')
    }
  } catch (error) {
    console.error('\n❌ Publish failed:', error)
    process.exit(1)
  }
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  switch (options.command) {
    case 'publish':
      await runPublish(options)
      break
    case 'version':
      console.log(`mdxdb version ${VERSION}`)
      break
    case 'help':
    default:
      console.log(HELP_TEXT)
      break
  }
}

// Only run CLI when executed directly (not when imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('/cli.js') ||
  process.argv[1]?.endsWith('/mdxdb')

if (isMainModule) {
  main().catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
}
