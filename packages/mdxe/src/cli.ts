/**
 * mdxe CLI
 *
 * Command line interface for executing, testing, and deploying MDX-based applications
 *
 * @packageDocumentation
 */

import { resolve, basename, relative } from 'node:path'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { glob } from 'glob'
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
  // Execution context options
  context: 'local' | 'remote' | 'all'
  db: 'memory' | 'fs' | 'sqlite' | 'postgres' | 'clickhouse' | 'mongo'
  aiMode: 'local' | 'remote'
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
  --context, -c <ctx>    Execution context: local | remote | all (default: local)
  --db <backend>         Database backend: memory | fs | sqlite | postgres | clickhouse | mongo
  --ai <mode>            AI mode: local | remote (default: local)

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
    context: 'local',
    db: 'memory',
    aiMode: 'local',
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
      // Execution context options
      case '--context':
      case '-c':
        if (next === 'local' || next === 'remote' || next === 'all') {
          options.context = next
        } else {
          console.error(`Invalid context: ${next}. Use 'local', 'remote', or 'all'.`)
          process.exit(1)
        }
        i++
        break
      case '--db':
        if (['memory', 'fs', 'sqlite', 'postgres', 'clickhouse', 'mongo'].includes(next)) {
          options.db = next as CliOptions['db']
        } else {
          console.error(`Invalid db backend: ${next}. Use memory, fs, sqlite, postgres, clickhouse, or mongo.`)
          process.exit(1)
        }
        i++
        break
      case '--ai':
        if (next === 'local' || next === 'remote') {
          options.aiMode = next
        } else {
          console.error(`Invalid AI mode: ${next}. Use 'local' or 'remote'.`)
          process.exit(1)
        }
        i++
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
 * Extract test blocks from MDX content
 */
function extractTestBlocks(content: string): { name: string; code: string }[] {
  const tests: { name: string; code: string }[] = []

  // Match code blocks with 'test' in the meta
  const codeBlockRegex = /```(?:ts|typescript|js|javascript)\s+test(?:\s+name="([^"]*)")?[^\n]*\n([\s\S]*?)```/g

  let match
  let testIndex = 0
  while ((match = codeBlockRegex.exec(content)) !== null) {
    testIndex++
    const name = match[1] || `test ${testIndex}`
    const code = match[2].trim()
    tests.push({ name, code })
  }

  return tests
}

/**
 * Generate test code for ai-sandbox from extracted tests
 */
function generateTestCode(tests: { name: string; code: string }[]): string {
  if (tests.length === 0) return ''

  const testCases = tests.map(test => {
    // Detect if code uses await
    const isAsync = /\bawait\s+/.test(test.code)
    const asyncPrefix = isAsync ? 'async ' : ''

    return `
  it('${test.name.replace(/'/g, "\\'")}', ${asyncPrefix}() => {
${test.code}
  });`
  }).join('\n')

  return `describe('MDX Tests', () => {${testCases}
});`
}

/**
 * Find MDX test files in the project
 */
async function findMdxTestFiles(projectDir: string, filter?: string): Promise<string[]> {
  const patterns = [
    'tests/**/*.mdx',
    '**/*.test.mdx',
  ]

  const files: string[] = []

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectDir,
      ignore: ['node_modules/**', 'dist/**', '.next/**'],
      absolute: true,
    })
    files.push(...matches)
  }

  // Remove duplicates
  const unique = [...new Set(files)]

  // Apply filter if provided
  if (filter) {
    return unique.filter(f => basename(f).includes(filter) || f.includes(filter))
  }

  return unique
}

/**
 * Run MDX tests using ai-sandbox
 */
export async function runTest(options: CliOptions): Promise<void> {
  console.log('🧪 mdxe test\n')

  const projectDir = options.projectDir
  console.log(`📁 Project: ${projectDir}`)

  // Find MDX test files
  const testFiles = await findMdxTestFiles(projectDir, options.filter)

  if (testFiles.length === 0) {
    console.log('⚠️  No MDX test files found')
    console.log('   Looking for: tests/**/*.mdx, **/*.test.mdx')
    return
  }

  console.log(`📋 Found ${testFiles.length} test file(s)`)

  // Get SDK config from environment and CLI options
  const sdkConfig = {
    context: options.context as 'local' | 'remote',
    rpcUrl: process.env.DO_RPC_URL || 'https://rpc.do',
    token: process.env.DO_TOKEN || process.env.DO_ADMIN_TOKEN || '',
    ns: process.env.DO_NS || 'test.example.com',
    // AI Gateway configuration
    aiGatewayUrl: process.env.AI_GATEWAY_URL,
    aiGatewayToken: process.env.AI_GATEWAY_TOKEN,
  }

  console.log(`⚙️  Context: ${options.context}`)
  console.log(`💾 Database: ${options.db}`)
  if (options.context === 'remote') {
    console.log(`🌐 RPC URL: ${sdkConfig.rpcUrl}`)
  }

  if (options.verbose) {
    console.log(`🔧 SDK RPC URL: ${sdkConfig.rpcUrl}`)
    console.log(`🔧 SDK Namespace: ${sdkConfig.ns}`)
  }

  console.log('\n' + '─'.repeat(60) + '\n')

  // Import ai-sandbox dynamically
  const { evaluate } = await import('ai-sandbox')

  // Track results
  const results: {
    file: string
    total: number
    passed: number
    failed: number
    skipped: number
    tests: { name: string; passed: boolean; error?: string; duration: number }[]
    duration: number
  }[] = []

  let totalTests = 0
  let totalPassed = 0
  let totalFailed = 0

  // Run each test file
  for (const filePath of testFiles) {
    const fileName = relative(projectDir, filePath)
    const content = readFileSync(filePath, 'utf-8')

    // Extract test blocks
    const testBlocks = extractTestBlocks(content)

    if (testBlocks.length === 0) {
      if (options.verbose) {
        console.log(`⏭️  ${fileName} (no tests)`)
      }
      continue
    }

    // Generate test code
    const testCode = generateTestCode(testBlocks)

    // Run through ai-sandbox
    const startTime = Date.now()
    const result = await evaluate({
      tests: testCode,
      sdk: sdkConfig,
    })

    const duration = Date.now() - startTime

    // Process results
    if (result.testResults) {
      const { total, passed, failed, skipped, tests } = result.testResults

      totalTests += total
      totalPassed += passed
      totalFailed += failed

      results.push({
        file: fileName,
        total,
        passed,
        failed,
        skipped,
        tests,
        duration,
      })

      // Print file result
      const statusIcon = failed > 0 ? '❌' : '✅'
      const failedStr = failed > 0 ? ` | ${failed} failed` : ''
      console.log(`${statusIcon} ${fileName} (${passed}/${total} passed${failedStr}) ${duration}ms`)

      // Print failed test details
      if (failed > 0 && options.verbose) {
        for (const test of tests) {
          if (!test.passed && test.error) {
            console.log(`   ├─ ✗ ${test.name}`)
            console.log(`   │    ${test.error}`)
          }
        }
      }
    } else if (result.error) {
      console.log(`❌ ${fileName} - Error: ${result.error}`)
      totalFailed++
    }

    // Show logs if verbose
    if (options.verbose && result.logs.length > 0) {
      for (const log of result.logs) {
        const icon = log.level === 'error' ? '🔴' : log.level === 'warn' ? '🟡' : '📝'
        console.log(`   ${icon} ${log.message}`)
      }
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60))
  console.log(`\n📊 Summary: ${totalPassed}/${totalTests} tests passed`)

  if (totalFailed > 0) {
    console.log(`\n❌ ${totalFailed} test(s) failed`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
  }
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
