/**
 * @mdxai/claude CLI
 *
 * Interactive Claude agent with mdxdb and mdxe tools
 *
 * @packageDocumentation
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { createFsDatabase } from '@mdxdb/fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { createClaudeServer } from './server.js'

export interface CliOptions {
  path: string
  name: string
  version: boolean
  help: boolean
}

const HELP_TEXT = `
@mdxai/claude - Interactive Claude Agent with MDX tools

Usage:
  @mdxai/claude [options]

Options:
  --path, -p <path>       Content directory (default: ./content)
  --name, -n <name>       Server name (default: mdxai)
  --version, -v           Show version
  --help, -h              Show this help message

Examples:
  # Start interactive agent
  @mdxai/claude

  # Start with custom content directory
  @mdxai/claude --path ./docs

Available Tools:
  Database Tools:
  - mdxdb_list     List documents with filtering and pagination
  - mdxdb_search   Search documents by query
  - mdxdb_get      Get a document by ID
  - mdxdb_set      Create or update a document
  - mdxdb_delete   Delete a document

  Executor Tools:
  - mdxe_do        Execute an MDX document
  - mdxe_test      Run tests on MDX documents
  - mdxe_deploy    Deploy MDX documents
`

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    path: process.env.MDXAI_PATH || './content',
    name: process.env.MDXAI_NAME || 'mdxai',
    version: false,
    help: false,
  }

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
        options.name = next || 'mdxai'
        i++
        break
      case '--version':
      case '-v':
        options.version = true
        break
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  return options
}

/**
 * Create an async generator for user input
 */
async function* createUserInputStream(rl: ReturnType<typeof createInterface>) {
  const iterator = rl[Symbol.asyncIterator]()

  for await (const line of iterator) {
    if (line.trim().toLowerCase() === 'exit' || line.trim().toLowerCase() === 'quit') {
      break
    }
    yield { type: 'user' as const, message: { role: 'user' as const, content: line } }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.version) {
    console.log('@mdxai/claude version 0.0.0')
    process.exit(0)
  }

  if (options.help) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  // Create database
  const database = createFsDatabase({
    root: resolve(options.path),
  })

  // Create the Claude MCP server with tools
  const server = createClaudeServer({
    name: options.name,
    database,
  })

  console.error(`@mdxai/claude agent starting...`)
  console.error(`  Content path: ${resolve(options.path)}`)
  console.error(`  Type 'exit' or 'quit' to end the session`)
  console.error()

  // Create readline interface for user input
  // Disable terminal mode to prevent double echo (terminal already echoes input)
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: false,
  })

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...')
    rl.close()
    await database.close?.()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Track if we're closing
  let isClosing = false

  // Handle stdin close
  rl.on('close', () => {
    if (!isClosing) {
      isClosing = true
      console.log('\n')
      process.exit(0)
    }
  })

  // Interactive loop
  const promptUser = () => {
    if (isClosing) return

    // Write prompt to stderr, read from stdin
    process.stderr.write('You: ')
    rl.question('', async (input) => {
      if (isClosing) return

      if (!input || !input.trim()) {
        promptUser()
        return
      }

      if (input.trim().toLowerCase() === 'exit' || input.trim().toLowerCase() === 'quit') {
        isClosing = true
        await shutdown()
        return
      }

      try {
        // Run query with the MCP server
        const result = query({
          prompt: input,
          options: {
            mcpServers: {
              [options.name]: server,
            },
            permissionMode: 'acceptEdits',
          },
        })

        // Stream the response to stderr (stdout is for data output)
        process.stderr.write('\nClaude: ')
        for await (const message of result) {
          if (message.type === 'assistant') {
            // Handle assistant messages
            const content = message.message?.content
            if (typeof content === 'string') {
              process.stderr.write(content)
            } else if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'text') {
                  process.stderr.write(block.text)
                } else if (block.type === 'tool_use') {
                  process.stderr.write(`\n[Using tool: ${block.name}]`)
                }
              }
            }
          } else if (message.type === 'result') {
            // Final result - check for error subtypes
            const subtype = message.subtype as string
            if (subtype.startsWith('error')) {
              process.stderr.write(`\nError: ${subtype}`)
            }
          }
        }
        process.stderr.write('\n\n')
      } catch (error) {
        process.stderr.write(`\nError: ${error instanceof Error ? error.message : String(error)}\n\n`)
      }

      promptUser()
    })
  }

  promptUser()
}

// Only run CLI when executed directly (not when imported)
// Check if this module is the entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1]?.endsWith('cli.js')

if (isMainModule && !process.env.__MDXAI_IMPORTED__) {
  main().catch((error) => {
    console.error('Error starting @mdxai/claude:', error)
    process.exit(1)
  })
}

export { main }
