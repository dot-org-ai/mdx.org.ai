/**
 * mdxai CLI
 *
 * Command line interface for running MDX AI agents with Claude via MCP
 *
 * @packageDocumentation
 */

import { createFsDatabase } from '@mdxdb/fs'
import { createSqliteDatabase } from '@mdxdb/sqlite'
import type { AnyDatabase } from './index.js'
import { resolve } from 'node:path'
import { runMcpServer } from './server.js'

export interface CliOptions {
  database: 'fs' | 'sqlite'
  path: string
  name: string
  version: string
  help: boolean
}

const HELP_TEXT = `
mdxai - MDX AI Agent CLI

Usage:
  mdxai [options]

Options:
  --database, -d <type>   Database backend: 'fs' or 'sqlite' (default: fs)
  --path, -p <path>       Database path:
                          - For fs: root directory (default: ./content)
                          - For sqlite: database file (default: ./mdxdb.sqlite)
  --name, -n <name>       Server name (default: mdxai)
  --version, -v           Show version
  --help, -h              Show this help message

Examples:
  # Start with filesystem backend (default)
  mdxai

  # Start with filesystem backend at custom path
  mdxai --database fs --path ./docs

  # Start with SQLite backend
  mdxai --database sqlite --path ./data.db

  # Start with in-memory SQLite (for testing)
  mdxai --database sqlite --path :memory:

Environment Variables:
  MDXAI_DATABASE          Database backend (fs or sqlite)
  MDXAI_PATH              Database path
  MDXAI_NAME              Server name

MCP Server:
  This CLI starts an MCP (Model Context Protocol) server that exposes
  mdxdb operations as tools for Claude. The server communicates over
  stdio using JSON-RPC.

  To use with Claude Desktop, add to your claude_desktop_config.json:
  {
    "mcpServers": {
      "mdxai": {
        "command": "npx",
        "args": ["mdxai", "--database", "fs", "--path", "./content"]
      }
    }
  }

Available Tools:
  - mdxdb_list     List documents with filtering and pagination
  - mdxdb_search   Search documents by query
  - mdxdb_get      Get a document by ID
  - mdxdb_set      Create or update a document
  - mdxdb_delete   Delete a document
`

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    database: (process.env.MDXAI_DATABASE as 'fs' | 'sqlite') || 'fs',
    path: process.env.MDXAI_PATH || '',
    name: process.env.MDXAI_NAME || 'mdxai',
    version: '0.0.0',
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--database':
      case '-d':
        if (next === 'fs' || next === 'sqlite') {
          options.database = next
          i++
        } else {
          console.error(`Invalid database type: ${next}. Use 'fs' or 'sqlite'.`)
          process.exit(1)
        }
        break
      case '--path':
      case '-p':
        options.path = next || ''
        i++
        break
      case '--name':
      case '-n':
        options.name = next || 'mdxai'
        i++
        break
      case '--version':
      case '-v':
        console.log('mdxai version 0.0.0')
        process.exit(0)
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  // Set default paths if not specified
  if (!options.path) {
    options.path = options.database === 'fs' ? './content' : './mdxdb.sqlite'
  }

  return options
}

export async function createDatabase(options: CliOptions): Promise<AnyDatabase> {
  if (options.database === 'sqlite') {
    const url = options.path === ':memory:' ? ':memory:' : `file:${resolve(options.path)}`
    return createSqliteDatabase({ url }) as unknown as AnyDatabase
  }

  return createFsDatabase({
    root: resolve(options.path),
  }) as unknown as AnyDatabase
}

/**
 * Check if args contain any substantive options (not just help/version)
 */
function hasSubstantiveArgs(args: string[]): boolean {
  return args.some((arg) => {
    // Skip help and version flags
    if (arg === '--help' || arg === '-h' || arg === '--version' || arg === '-v') {
      return false
    }
    // Any other arg is substantive
    return true
  })
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // If no substantive args, delegate to @mdxai/claude
  if (!hasSubstantiveArgs(args)) {
    // Check for help/version flags first
    if (args.includes('--help') || args.includes('-h')) {
      console.log(HELP_TEXT)
      console.log('\nNote: Running mdxai without arguments delegates to @mdxai/claude')
      process.exit(0)
    }
    if (args.includes('--version') || args.includes('-v')) {
      console.log('mdxai version 0.0.0')
      process.exit(0)
    }

    // Delegate to @mdxai/claude by importing and running its main function
    try {
      // Set env var to prevent auto-execution on import
      process.env.__MDXAI_IMPORTED__ = '1'
      const { main: claudeMain } = await import('@mdxai/claude/cli')
      await claudeMain()
    } catch (error) {
      console.error('Error running @mdxai/claude:', error)
      process.exit(1)
    }
    return
  }

  const options = parseArgs(args)

  if (options.help) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  // Log startup info to stderr (stdout is for MCP communication)
  console.error(`mdxai MCP server starting...`)
  console.error(`  Database: ${options.database}`)
  console.error(`  Path: ${options.path}`)
  console.error(`  Name: ${options.name}`)

  // Create database
  const db = await createDatabase(options)

  // Handle graceful shutdown
  const shutdown = async () => {
    console.error('\nShutting down...')
    await db.close?.()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Run MCP server with stdio transport
  await runMcpServer({
    name: options.name,
    database: db as unknown as import('@mdxdb/fs').Database,
  })
}

// Run CLI
main().catch((error) => {
  console.error('Error starting mdxai:', error)
  process.exit(1)
})

export { main }
