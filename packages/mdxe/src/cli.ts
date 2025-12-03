/**
 * mdxe CLI
 *
 * Command line interface for executing, testing, and deploying MDX-based applications
 *
 * @packageDocumentation
 */

import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { deploy, detectSourceType } from './commands/deploy.js'
import type { CloudflareDeployOptions } from './types.js'

export interface CliOptions {
  command: 'deploy' | 'test' | 'help' | 'version'
  projectDir: string
  platform: 'cloudflare' | 'vercel' | 'netlify'
  mode?: 'static' | 'opennext'
  projectName?: string
  dryRun: boolean
  force: boolean
  verbose: boolean
  env: Record<string, string>
  help: boolean
  // Test options
  watch: boolean
  filter?: string
  coverage: boolean
  ui: boolean
}

export const VERSION = '0.0.0'

const HELP_TEXT = `
mdxe - Execute, Test, & Deploy MDX-based Agents, Apps, APIs, and Sites

Usage:
  mdxe <command> [options]

Commands:
  test                Run MDX tests with vitest
  deploy              Deploy to Cloudflare Workers
  help                Show this help message
  version             Show version

Test Options:
  --dir, -d <path>       Directory containing tests (default: current directory)
  --watch, -w            Run tests in watch mode
  --filter, -f <pattern> Filter tests by name pattern
  --coverage             Generate coverage report
  --ui                   Open vitest UI
  --verbose, -v          Show detailed output

Deploy Options:
  --dir, -d <path>       Project directory (default: current directory)
  --platform, -p <name>  Deployment platform: cloudflare (default: cloudflare)
  --mode, -m <mode>      Deployment mode: static | opennext (auto-detected)
  --name, -n <name>      Project name for deployment
  --dry-run              Show what would be deployed without deploying
  --force                Force regeneration of config files
  --verbose, -v          Show detailed output
  --env, -e <KEY=VALUE>  Set environment variable (can be repeated)

Examples:
  # Deploy current directory to Cloudflare
  mdxe deploy

  # Deploy with specific project name
  mdxe deploy --name my-docs

  # Deploy a specific directory
  mdxe deploy --dir ./my-project

  # Force static mode (use Workers Static Assets)
  mdxe deploy --mode static

  # Force OpenNext mode (for SSR/dynamic content)
  mdxe deploy --mode opennext

  # Dry run to see what would happen
  mdxe deploy --dry-run

  # Set environment variables
  mdxe deploy --env API_URL=https://api.example.com --env DEBUG=true

Deployment Modes:

  Static (Workers Static Assets):
    Used when your docs use a static data source like @mdxdb/fs.
    Exports Next.js as static HTML and serves via Cloudflare Workers.

  OpenNext (Server-Side Rendering):
    Used when your docs use a dynamic data source like @mdxdb/api,
    @mdxdb/postgres, @mdxdb/mongo, etc.
    Uses OpenNext.js to run Next.js on Cloudflare Workers.

Auto-Detection:
  mdxe automatically detects your data source by analyzing:
  - source.config.ts
  - lib/source.ts
  - package.json dependencies

  Static sources: @mdxdb/fs
  Dynamic sources: @mdxdb/api, @mdxdb/postgres, @mdxdb/mongo, etc.

Environment:
  CLOUDFLARE_ACCOUNT_ID    Cloudflare account ID
  CLOUDFLARE_API_TOKEN     Cloudflare API token
`

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: 'help',
    projectDir: process.cwd(),
    platform: 'cloudflare',
    dryRun: false,
    force: false,
    verbose: false,
    env: {},
    help: false,
    watch: false,
    coverage: false,
    ui: false,
  }

  // Parse command
  if (args.length > 0 && !args[0].startsWith('-')) {
    const cmd = args[0].toLowerCase()
    if (cmd === 'test') {
      options.command = 'test'
    } else if (cmd === 'deploy') {
      options.command = 'deploy'
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
      case '--dir':
      case '-d':
        options.projectDir = resolve(next || '.')
        i++
        break
      case '--platform':
      case '-p':
        if (next === 'cloudflare' || next === 'vercel' || next === 'netlify') {
          options.platform = next
        } else {
          console.error(`Invalid platform: ${next}. Supported: cloudflare, vercel, netlify`)
          process.exit(1)
        }
        i++
        break
      case '--mode':
      case '-m':
        if (next === 'static' || next === 'opennext') {
          options.mode = next
        } else {
          console.error(`Invalid mode: ${next}. Use 'static' or 'opennext'.`)
          process.exit(1)
        }
        i++
        break
      case '--name':
      case '-n':
        options.projectName = next
        i++
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--force':
        options.force = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--env':
      case '-e':
        if (next && next.includes('=')) {
          const [key, ...valueParts] = next.split('=')
          options.env[key] = valueParts.join('=')
        }
        i++
        break
      case '--help':
      case '-h':
        options.help = true
        options.command = 'help'
        break
      case '--version':
        options.command = 'version'
        break
      // Test options
      case '--watch':
      case '-w':
        options.watch = true
        break
      case '--filter':
      case '-f':
        options.filter = next
        i++
        break
      case '--coverage':
        options.coverage = true
        break
      case '--ui':
        options.ui = true
        break
    }
  }

  return options
}

export async function runDeploy(options: CliOptions): Promise<void> {
  console.log('🚀 mdxe deploy\n')

  if (options.platform !== 'cloudflare') {
    console.error(`Platform '${options.platform}' is not yet supported. Currently only 'cloudflare' is available.`)
    process.exit(1)
  }

  // Show detection info
  console.log(`📁 Project: ${options.projectDir}`)

  const sourceType = detectSourceType(options.projectDir)
  console.log(`🔍 Detected adapter: ${sourceType.adapter || 'unknown'}`)
  console.log(`📊 Source type: ${sourceType.isStatic ? 'static' : 'dynamic'}`)

  const mode = options.mode || (sourceType.isStatic ? 'static' : 'opennext')
  console.log(`⚙️  Deployment mode: ${mode}`)

  if (options.dryRun) {
    console.log('🔬 Dry run mode - no changes will be made\n')
  }

  console.log('')

  const deployOptions: CloudflareDeployOptions = {
    platform: 'cloudflare',
    projectName: options.projectName,
    mode: options.mode,
    dryRun: options.dryRun,
    force: options.force,
    env: options.env,
  }

  const result = await deploy(options.projectDir, deployOptions)

  // Show logs if verbose
  if (options.verbose && result.logs) {
    console.log('\n📋 Logs:')
    for (const log of result.logs) {
      console.log(`   ${log}`)
    }
  }

  if (result.success) {
    console.log('\n✅ Deployment successful!')
    if (result.url) {
      console.log(`🌐 URL: ${result.url}`)
    }
  } else {
    console.error('\n❌ Deployment failed!')
    if (result.error) {
      console.error(`   Error: ${result.error}`)
    }
    process.exit(1)
  }
}

/**
 * Find the vitest MDX config file
 */
function findMdxConfig(projectDir: string): string | null {
  const candidates = [
    resolve(projectDir, 'vitest.mdx.config.ts'),
    resolve(projectDir, 'vitest.mdx.config.js'),
    resolve(projectDir, 'vitest.mdx.config.mts'),
    resolve(projectDir, 'vitest.mdx.config.mjs'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * Run MDX tests using vitest
 */
export async function runTest(options: CliOptions): Promise<void> {
  console.log('🧪 mdxe test\n')

  const projectDir = options.projectDir
  console.log(`📁 Project: ${projectDir}`)

  // Find vitest.mdx.config.ts
  const configPath = findMdxConfig(projectDir)

  if (!configPath) {
    console.error('❌ No vitest.mdx.config.ts found in project directory')
    console.error('   Create a vitest.mdx.config.ts file to configure MDX testing.')
    console.error('')
    console.error('   Example config:')
    console.error('   ```')
    console.error("   import { defineConfig } from 'vitest/config'")
    console.error("   import { mdxTestPlugin } from '@mdxe/vitest'")
    console.error('')
    console.error('   export default defineConfig({')
    console.error('     plugins: [mdxTestPlugin()],')
    console.error('     test: {')
    console.error("       include: ['tests/**/*.mdx', '**/*.test.mdx'],")
    console.error('     },')
    console.error('   })')
    console.error('   ```')
    process.exit(1)
  }

  console.log(`📋 Config: ${configPath}`)

  // Build vitest args
  const vitestArgs = ['vitest']

  // Add run or watch mode
  if (!options.watch && !options.ui) {
    vitestArgs.push('run')
  }

  // Add config
  vitestArgs.push('--config', configPath)

  // Add options
  if (options.filter) {
    vitestArgs.push('--testNamePattern', options.filter)
  }

  if (options.coverage) {
    vitestArgs.push('--coverage')
  }

  if (options.ui) {
    vitestArgs.push('--ui')
  }

  if (options.verbose) {
    vitestArgs.push('--reporter=verbose')
  }

  console.log(`\n🔧 Running: npx ${vitestArgs.join(' ')}\n`)
  console.log('─'.repeat(60))

  // Spawn vitest
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npx', vitestArgs, {
      cwd: projectDir,
      stdio: 'inherit',
      shell: true,
    })

    child.on('error', (error) => {
      console.error(`\n❌ Failed to run vitest: ${error.message}`)
      reject(error)
    })

    child.on('close', (code) => {
      console.log('─'.repeat(60))
      if (code === 0) {
        console.log('\n✅ Tests passed!')
        resolvePromise()
      } else {
        console.log(`\n❌ Tests failed with exit code ${code}`)
        process.exit(code ?? 1)
      }
    })
  })
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  switch (options.command) {
    case 'test':
      await runTest(options)
      break
    case 'deploy':
      await runDeploy(options)
      break
    case 'version':
      console.log(`mdxe version ${VERSION}`)
      break
    case 'help':
    default:
      console.log(HELP_TEXT)
      break
  }
}

// Run CLI
main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
