#!/usr/bin/env node
/**
 * mdxe-payload CLI
 *
 * Commands:
 *   admin    Start Payload admin with mdxdb backend
 *   dev      Start development server
 *   build    Build for production
 *   deploy   Deploy to Cloudflare Workers
 *
 * @example
 * ```bash
 * # Start admin in current directory
 * npx mdxe-payload admin
 *
 * # Start with custom port
 * npx mdxe-payload admin --port 3001
 *
 * # Start with specific namespace
 * npx mdxe-payload admin --namespace example.com
 * ```
 *
 * @packageDocumentation
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, basename, extname } from 'node:path'
import { parseTypeFromMDX, processContentDirectory } from './generate.js'
import type { TypeDefinition } from './types.js'

// =============================================================================
// CLI Entry Point
// =============================================================================

const args = process.argv.slice(2)
const command = args[0]

// Parse flags
function parseFlags(args: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true
    }
  }
  return flags
}

const flags = parseFlags(args.slice(1))

// =============================================================================
// Admin Command Options
// =============================================================================

export interface AdminCommandOptions {
  port?: number
  namespace?: string
  contentDir?: string
  verbose?: boolean
}

// =============================================================================
// Admin Command (exported for use by mdxe CLI)
// =============================================================================

export async function adminCommand(options: AdminCommandOptions = {}) {
  const port = options.port || Number(flags.port) || 3000
  const namespace = options.namespace || (flags.namespace as string) || basename(process.cwd())
  const contentDir = options.contentDir || (flags.content as string) || '.'
  const debug = options.verbose || Boolean(flags.debug)

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     mdxe-payload admin                         ║
╠════════════════════════════════════════════════════════════════╣
║  Namespace:  ${namespace.padEnd(46)}  ║
║  Content:    ${resolve(contentDir).padEnd(46)}  ║
║  Port:       ${String(port).padEnd(46)}  ║
╚════════════════════════════════════════════════════════════════╝
`)

  // Scan for MDX files
  console.log('📁 Scanning for MDX files...')
  const mdxFiles = scanMDXFiles(resolve(contentDir))
  console.log(`   Found ${mdxFiles.length} MDX files`)

  // Parse types from files
  console.log('🔍 Discovering types...')
  const types = discoverTypesFromFiles(mdxFiles)
  console.log(`   Found ${types.length} types: ${types.map(t => t.name).join(', ') || '(none)'}`)

  // Generate worker configuration
  console.log('⚙️  Generating configuration...')
  const configDir = join(process.cwd(), '.mdxe')
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  // Write discovered types
  writeFileSync(
    join(configDir, 'types.json'),
    JSON.stringify(types, null, 2)
  )

  // Generate worker file
  const workerContent = generateWorkerFile(namespace, types)
  writeFileSync(join(configDir, 'worker.ts'), workerContent)

  // Generate wrangler config
  const wranglerContent = generateWranglerConfig(namespace, port)
  writeFileSync(join(configDir, 'wrangler.toml'), wranglerContent)

  console.log('✅ Configuration generated in .mdxe/')

  // Start miniflare
  console.log(`\n🚀 Starting Payload admin on http://localhost:${port}`)
  console.log('   Press Ctrl+C to stop\n')

  try {
    await startMiniflare(configDir, port, debug)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// =============================================================================
// Dev Command
// =============================================================================

async function devCommand() {
  const port = Number(flags.port) || 3000
  const watch = !flags['no-watch']

  console.log('Starting development server...')
  console.log(`Port: ${port}`)
  console.log(`Watch: ${watch}`)

  // Run admin with watch mode
  await adminCommand()
}

// =============================================================================
// Build Command
// =============================================================================

async function buildCommand() {
  const outDir = (flags.out as string) || 'dist'

  console.log('Building for production...')
  console.log(`Output: ${outDir}`)

  // Scan and generate
  const mdxFiles = scanMDXFiles(process.cwd())
  const types = discoverTypesFromFiles(mdxFiles)

  // Create output directory
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
  }

  // Generate production worker
  const namespace = basename(process.cwd())
  const workerContent = generateWorkerFile(namespace, types)
  writeFileSync(join(outDir, 'worker.ts'), workerContent)

  // Generate wrangler config
  const wranglerContent = generateWranglerConfig(namespace, 8787)
  writeFileSync(join(outDir, 'wrangler.toml'), wranglerContent)

  console.log('✅ Build complete')
}

// =============================================================================
// Deploy Command
// =============================================================================

async function deployCommand() {
  console.log('Deploying to Cloudflare Workers...')

  // Check for wrangler
  const { execSync } = await import('node:child_process')

  try {
    execSync('wrangler --version', { stdio: 'ignore' })
  } catch {
    console.error('Error: wrangler CLI not found. Install with: npm i -g wrangler')
    process.exit(1)
  }

  // Build first
  await buildCommand()

  // Deploy
  try {
    execSync('wrangler deploy', {
      cwd: join(process.cwd(), 'dist'),
      stdio: 'inherit',
    })
    console.log('✅ Deployed successfully')
  } catch (error) {
    console.error('Deploy failed:', error)
    process.exit(1)
  }
}

// =============================================================================
// Helpers
// =============================================================================

function scanMDXFiles(dir: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = []

  function scan(currentDir: string) {
    if (!existsSync(currentDir)) return

    const entries = readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      // Skip hidden and special directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue
      }

      if (entry.isDirectory()) {
        scan(fullPath)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (ext === '.mdx' || ext === '.md') {
          try {
            const content = readFileSync(fullPath, 'utf-8')
            files.push({ path: fullPath, content })
          } catch (error) {
            console.warn(`Warning: Could not read ${fullPath}`)
          }
        }
      }
    }
  }

  scan(dir)
  return files
}

function discoverTypesFromFiles(files: Array<{ path: string; content: string }>): TypeDefinition[] {
  const types: TypeDefinition[] = []
  const seenTypes = new Set<string>()

  for (const file of files) {
    try {
      const type = parseTypeFromMDX(file.content)
      if (type && !seenTypes.has(type.name)) {
        types.push(type)
        seenTypes.add(type.name)
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  return types
}

function generateWorkerFile(namespace: string, types: TypeDefinition[]): string {
  const virtualCollections = types.map(t => `
    createVirtualCollection({
      slug: '${t.slug}',
      type: '${t.name}',
      fields: ${JSON.stringify(t.fields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required,
      })), null, 6).replace(/\n/g, '\n      ')},
    }),`).join('')

  return `/**
 * Generated by mdxe-payload
 * Namespace: ${namespace}
 */
import { createPayloadWorker, createVirtualCollection, getNativeCollections } from '@mdxe/payload'
import { MDXDatabase } from '@mdxdb/sqlite'

// Export Durable Object
export { MDXDatabase }

// Virtual collections from discovered types
const virtualCollections = [${virtualCollections}
]

// Export worker
export default createPayloadWorker({
  namespace: '${namespace}',
  database: 'sqlite',
  nativeCollections: true, // All native collections enabled
  collections: virtualCollections,
})
`
}

function generateWranglerConfig(namespace: string, port: number): string {
  return `# Generated by mdxe-payload
name = "${namespace.replace(/\./g, '-')}-payload"
main = "worker.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "MDXDB"
class_name = "MDXDatabase"

[[migrations]]
tag = "v1"
new_classes = ["MDXDatabase"]

[vars]
PAYLOAD_SECRET = "dev-secret-change-in-production"
NAMESPACE = "${namespace}"

[dev]
port = ${port}
`
}

async function startMiniflare(configDir: string, port: number, debug: boolean) {
  try {
    // Dynamic import miniflare
    const { Miniflare } = await import('miniflare')
    const { readFileSync } = await import('node:fs')

    // Read the generated worker
    const workerPath = join(configDir, 'worker.ts')
    const workerContent = readFileSync(workerPath, 'utf-8')

    // Create miniflare instance
    const mf = new Miniflare({
      modules: true,
      script: workerContent,
      scriptPath: workerPath,
      port,
      durableObjects: {
        MDXDB: 'MDXDatabase',
      },
      bindings: {
        PAYLOAD_SECRET: 'dev-secret',
        NAMESPACE: basename(process.cwd()),
      },
      verbose: debug,
    })

    // Start server using the correct Miniflare API
    // Miniflare 3.x uses createServer() or getBindings() + serve
    const url = await mf.ready
    console.log(`
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   Payload Admin:  http://localhost:${port}/admin                 │
│   API:            http://localhost:${port}/api                   │
│   Health:         http://localhost:${port}/health                │
│                                                                │
│   Native Collections:                                          │
│     • /api/things         - Graph nodes                        │
│     • /api/relationships  - Graph edges                        │
│     • /api/search         - Indexed content                    │
│     • /api/events         - Event log                          │
│     • /api/actions        - Jobs queue                         │
│     • /api/artifacts      - Build cache                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
`)

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...')
      await mf.dispose()
      process.exit(0)
    })

    // Keep process alive
    await new Promise(() => {})
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message?.includes('miniflare')) {
      console.error(`
Error: miniflare is required for local development.
Install it with: pnpm add -D miniflare

Or use wrangler dev instead:
  wrangler dev .mdxe/worker.ts -c .mdxe/wrangler.toml
`)
    } else {
      throw error
    }
  }
}

// =============================================================================
// Help
// =============================================================================

function showHelp() {
  console.log(`
mdxe-payload - Payload CMS on Cloudflare Workers with mdxdb

Usage:
  mdxe-payload <command> [options]

Commands:
  admin     Start Payload admin UI locally
  dev       Start development server (alias for admin)
  build     Build for production deployment
  deploy    Deploy to Cloudflare Workers

Options:
  --port <number>       Port to run on (default: 3000)
  --namespace <string>  Namespace for mdxdb (default: folder name)
  --content <path>      Content directory (default: current dir)
  --debug               Enable debug logging
  --help, -h            Show this help

Examples:
  # Start admin in current directory
  mdxe-payload admin

  # Start on different port
  mdxe-payload admin --port 8080

  # Build and deploy
  mdxe-payload build
  mdxe-payload deploy

Documentation:
  https://mdx.org.ai/docs/payload
`)
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  if (flags.help || flags.h || !command) {
    showHelp()
    return
  }

  switch (command) {
    case 'admin':
      await adminCommand()
      break
    case 'dev':
      await devCommand()
      break
    case 'build':
      await buildCommand()
      break
    case 'deploy':
      await deployCommand()
      break
    default:
      console.error(`Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
