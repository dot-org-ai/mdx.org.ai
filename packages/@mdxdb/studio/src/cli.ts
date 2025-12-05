#!/usr/bin/env node
/**
 * @mdxdb/studio CLI
 *
 * Start the MDXDB Studio server from the command line.
 *
 * @packageDocumentation
 */

import { resolve } from 'node:path'
import { startStudio } from './server'

const HELP = `
mdxdb-studio - Start the MDXDB Studio editor

Usage:
  mdxdb-studio [options]

Options:
  --path, -p <path>    Content directory (default: current directory)
  --port <port>        Server port (default: 4321)
  --host <host>        Server host (default: localhost)
  --help, -h           Show this help message

Examples:
  # Start studio in current directory
  mdxdb-studio

  # Start with custom content path
  mdxdb-studio --path ./content

  # Start on a different port
  mdxdb-studio --port 3000
`

interface Options {
  path: string
  port: number
  host: string
  help: boolean
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    path: process.cwd(),
    port: 4321,
    host: 'localhost',
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--path':
      case '-p':
        options.path = resolve(next || '.')
        i++
        break
      case '--port':
        options.port = parseInt(next || '4321', 10)
        i++
        break
      case '--host':
        options.host = next || 'localhost'
        i++
        break
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    console.log(HELP)
    process.exit(0)
  }

  console.log('🎨 Starting MDXDB Studio...\n')

  const server = await startStudio({
    contentDir: options.path,
    port: options.port,
    host: options.host,
  })

  console.log(`\n✨ Studio ready! Open ${server.getUrl()} in your browser.\n`)
  console.log('Press Ctrl+C to stop.\n')

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...')
    await server.stop()
    process.exit(0)
  })
}

main().catch(error => {
  console.error('Error:', error.message)
  process.exit(1)
})
