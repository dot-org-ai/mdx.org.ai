/**
 * mdxe CLI
 *
 * Command line interface for executing, testing, and deploying MDX-based applications
 *
 * @packageDocumentation
 */

import { resolve, basename, relative, dirname } from 'node:path'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'
import { transform } from 'esbuild'
// The shared resolvers live in the @mdxe/cli-core LEAF (mdx-8je.26): mdxe depends on @mdxe/hono, so
// the HTTP faces could not import them from here without a cycle. cli-core imports only node
// built-ins (lazily), so it stays on the light hot path (tests/cli-light.test.ts).
import {
  resolveFromProcess,
  resolveCallerFromProcess,
  FAILSAFE_CTX,
  EXIT,
  fail,
  usageError,
  type OutputCtx,
  type Caller,
} from '@mdxe/cli-core'
import { extractGlobals } from './cli/args.js'
import { orientCommand } from './cli/orient.js'

export type { OutputCtx, RenderMode, GlobalFlags, Caller } from '@mdxe/cli-core'
export { CliError, EXIT } from '@mdxe/cli-core'

/**
 * Get the version from package.json
 * Handles both development (source) and production (dist) environments
 */
function getVersion(): string {
  try {
    // Get the directory of the current module
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)

    // Try to find package.json relative to current file
    // In development: src/cli.ts -> ../package.json
    // In production: dist/cli.js -> ../package.json
    const pkgPath = resolve(__dirname, '..', 'package.json')

    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      return pkg.version || '0.0.0'
    }
  } catch {
    // Fall through to default
  }
  return '0.0.0'
}

export interface CliOptions {
  /** The frozen render context resolved ONCE in `main` — every command reads this, never `isTTY`. */
  ctx: OutputCtx
  command: 'dev' | 'build' | 'start' | 'deploy' | 'test' | 'run' | 'admin' | 'notebook' | 'tail' | 'db' | 'db:server' | 'db:client' | 'db:publish' | 'help' | 'version'
  projectDir: string
  platform: 'do' | 'cloudflare' | 'vercel' | 'github'
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
  target: 'node' | 'bun' | 'workers' | 'all'
  db: 'memory' | 'fs' | 'sqlite' | 'sqlite-do' | 'clickhouse' | 'all'
  aiMode: 'local' | 'remote'
  // Server options
  port: number
  host: string
  // Database options (from mdxdb)
  clickhouseUrl: string
  httpPort: number
  // Notebook options
  open: boolean
  // Deploy options (always uses managed apis.do API)
  // Worker loaders deployment options
  workers?: boolean
  subcommand?: 'workers'
  contentHash?: boolean
  compatibilityDate?: string
}

export const VERSION = getVersion()

/**
 * Validation helpers for CLI argument parsing
 */

/**
 * Check if a value is missing or is actually another flag.
 * Throws a USAGE `CliError` (exit 2) if validation fails — rendered to stderr by `fail`.
 * @param optionName - The name of the option being validated (e.g., '--port')
 * @param value - The value to validate
 * @param usage - Optional usage example to show on error
 */
export function requireValue(optionName: string, value: string | undefined, usage?: string): asserts value is string {
  if (!value || value.startsWith('-')) {
    throw usageError(`${optionName} requires a value`, usage ? `usage: ${usage}` : undefined)
  }
}

/**
 * Validate and parse a port number.
 * Throws a USAGE `CliError` (exit 2) if validation fails.
 * @param optionName - The name of the option being validated (e.g., '--port')
 * @param value - The value to validate
 * @param usage - Optional usage example to show on error
 * @returns The validated port number
 */
export function validatePort(optionName: string, value: string | undefined, usage?: string): number {
  requireValue(optionName, value, usage)

  const portNum = parseInt(value!, 10)

  // Check if it's a valid integer (not a float)
  if (isNaN(portNum) || !Number.isInteger(Number(value))) {
    throw usageError(`invalid port number: ${value}`, 'port must be a valid integer between 1 and 65535')
  }

  if (portNum < 1 || portNum > 65535) {
    throw usageError(`invalid port number: ${value}`, 'port must be between 1 and 65535')
  }

  return portNum
}

/**
 * Configuration extracted from docs frontmatter
 */
interface DocsConfig {
  title?: string
  description?: string
  logo?: string
  githubUrl?: string
  pages?: string[]
  baseUrl?: string
  domain?: string
  route?: string
  zone?: string
}

/**
 * Result of docs type detection
 * Matches DocsDetectionResult from @mdxe/fumadocs
 */
interface DocsDetectionResult {
  isDocsType: boolean
  indexPath: string | null
  readmePath: string | null
  contentDir: string
  projectName: string
  config: DocsConfig
}

/**
 * Check if project is a Docs type (has index.mdx with $type: Docs)
 */
async function checkDocsType(projectDir: string): Promise<{ isDocsType: boolean; detection?: DocsDetectionResult }> {
  try {
    const { detectDocsType } = await import('@mdxe/fumadocs')
    const detection = detectDocsType(projectDir)
    return { isDocsType: detection.isDocsType, detection }
  } catch {
    // @mdxe/fumadocs not available, skip detection
    return { isDocsType: false }
  }
}

const HELP_TEXT = `
mdxe - Execute, Test, & Deploy MDX-based Agents, Apps, APIs, and Sites

Usage:
  mdxe [command] [options]

Commands:
  dev                 Start development server (default)
  build               Build for production
  start               Start production server
  test                Run MDX tests with vitest
  run <file.mdx>      Execute script blocks from an MDX file
  admin               Start Payload admin UI with mdxdb backend
  notebook            Launch interactive notebook for MDX files
  tail                Stream or fetch events from mdxe applications
  deploy              Deploy to cloud platforms
  db                  Start local dev environment (ClickHouse + sync + UI)
  db:server           Start only the ClickHouse server
  db:client           Open ClickHouse client shell
  db:publish          Publish MDX files to database
  help                Show this help message
  version             Show version

  (a bare "mdxe" prints an orientation and exits — it never starts a server)

Global Options (any command):
  --format <mode>        Output: json | text | human (default: auto — human on a TTY,
                         text when piped, under CI, or under an agent harness)
  --json                 Shorthand for --format json
  --agent                Render for an agent (text unless --json); also set by MDXE_AGENT=1,
                         AGENT=1, or a harness marker (CLAUDECODE, CODEX_*, CURSOR_AGENT, ...)
  --color <when>         always | never | auto (NO_COLOR in the environment always wins)
  --no-color             Disable color
  --help, -h             Show this help; --version, -V show the version

Exit codes: 0 ok · 1 crash · 2 usage · 3 not found · 4 runtime unavailable · 6 refused (fail-closed)
Errors always go to stderr (one line: "error<TAB>code=..." in text, a JSON envelope in json).

Server Options:
  --dir, -d <path>       Project directory (default: current directory)
  --port <port>          Server port (default: 3000)
  --host <host>          Server host (default: localhost)
  --verbose, -v          Show detailed output

Notebook Options:
  --dir, -d <path>       File or directory to open (default: current directory)
  --port <port>          Server port (default: 3000)
  --open, -o             Open browser automatically
  --verbose, -v          Show detailed output

Notebook Examples:
  # Open notebook for current directory
  mdxe notebook

  # Open specific MDX file
  mdxe notebook ./docs/intro.mdx

  # Open with browser auto-launch
  mdxe notebook --open

Tail Options:
  --live               Use WebSocket for live event streaming
  --follow, -f         Use HTTP polling for continuous updates
  --source <pattern>   Filter by source (supports * wildcard)
  --type <type>        Filter by event type (exact match)
  --importance, -i <level>  Minimum importance: critical | high | normal | low
  --since <time>       Start time (ISO date or relative: 1h, 30m, 2d)
  --until <time>       End time (ISO date or relative)
  --limit, -n <count>  Maximum events to show
  --json               Output events as JSON (one per line)
  --no-color           Disable colored output
  --url <url>          Tail API URL (default: $MDXE_TAIL_URL)
  --verbose, -v        Show detailed output

Tail Examples:
  # Live WebSocket streaming
  mdxe tail --live

  # Follow mode (HTTP polling)
  mdxe tail --follow

  # Historical events from last hour
  mdxe tail --since 1h

  # Filter by source and importance
  mdxe tail --source "mdxe-*" --importance high

  # JSON output for piping
  mdxe tail --json | jq '.type'

  # Show only errors
  mdxe tail --type error --importance critical

Database Options (db commands):
  --path, -p <path>      Path to MDX files (default: ./content)
  --name, -n <name>      Database name/namespace
  --http-port <port>     ClickHouse HTTP port (default: 8123)
  --clickhouse <url>     ClickHouse URL for publish (default: http://localhost:8123)
  --dry-run              Show what would be published without publishing

Test Options:
  --dir, -d <path>       Directory containing tests (default: current directory)
  --watch, -w            Run tests in watch mode
  --filter, -f <pattern> Filter tests by name pattern
  --coverage             Generate coverage report
  --ui                   Open vitest UI
  --verbose, -v          Show detailed output
  --context, -c <ctx>    Execution context: local | remote | all (default: local)
  --target <runtime>     Target runtime: workers | node | bun | all (default: workers)
                         All targets use workerd for consistent execution:
                         - workers: Direct Cloudflare Workers (@mdxe/workers)
                         - node: Local workerd via Miniflare (@mdxe/workers/local)
                         - bun: Local workerd via Miniflare (@mdxe/workers/local)
  --db <backend>         Database backend: memory | fs | sqlite | sqlite-do | clickhouse | all
  --ai <mode>            AI mode: local | remote (default: local)

Test Matrix Examples:
  # Run tests with filesystem db on Node
  mdxe test --target node --db fs

  # Run tests with SQLite on Node
  mdxe test --target node --db sqlite

  # Run tests with ClickHouse on Node (auto-downloads)
  mdxe test --target node --db clickhouse

  # Run tests on Bun runtime
  mdxe test --target bun --db sqlite

  # Run tests with SQLite Durable Objects on Workers
  mdxe test --target workers --db sqlite-do

  # Run ALL combinations (full matrix)
  mdxe test --target all --db all

Run Options:
  --dir, -d <path>       Directory context for the script (default: current directory)
  --verbose, -v          Show detailed output
  --name, -n <name>      Run only the script block with this name

Run Examples:
  # Execute all script blocks in an MDX file
  mdxe run ./scripts/check-deps.mdx

  # Execute a specific named script block
  mdxe run ./scripts/check-deps.mdx --name main

  # Execute with verbose output
  mdxe run ./scripts/deploy.mdx --verbose

Database Examples:
  # Start local dev environment (auto-downloads ClickHouse)
  mdxe db

  # Start only ClickHouse server
  mdxe db:server

  # Open ClickHouse client
  mdxe db:client

  # Publish MDX files to local ClickHouse
  mdxe db:publish --name my-project

Deploy Options:
  --dir, -d <path>       Project directory (default: current directory)
  --platform, -p <name>  Deployment platform: do | cloudflare | vercel | github (default: do)
  --mode, -m <mode>      Deployment mode: static | opennext (auto-detected)
  --name, -n <name>      Project name for deployment
  --dry-run              Show what would be deployed without deploying
  --force                Force regeneration of config files
  --verbose, -v          Show detailed output
  --env, -e <KEY=VALUE>  Set environment variable (can be repeated)

Deploy Examples:
  # Deploy to .do platform (default)
  mdxe deploy

  # Deploy to Cloudflare directly
  mdxe deploy --platform cloudflare

  # Deploy to Vercel
  mdxe deploy --platform vercel

  # Deploy to GitHub Pages
  mdxe deploy --platform github

  # Deploy with specific project name
  mdxe deploy --name my-docs

  # Deploy a specific directory
  mdxe deploy --dir ./my-project

  # Force static mode
  mdxe deploy --mode static

  # Dry run to see what would happen
  mdxe deploy --dry-run

  # Set environment variables
  mdxe deploy --env API_URL=https://api.example.com --env DEBUG=true

Platforms:

  .do (default):
    Managed serverless platform powered by Cloudflare Workers.
    Uses oauth.do for authentication.
    Supports static sites and SSR via OpenNext.
    Handles KV, D1, R2, and Durable Objects automatically.

  Cloudflare:
    Deploy directly to Cloudflare Workers or Pages.
    Use this when you have a wrangler.toml configuration.
    Supports Workers for Platforms (multi-tenant).

  Vercel:
    Deploy to Vercel's serverless platform.
    Supports preview and production deployments.
    Auto-detects framework (Next.js, Vite, etc.).

  GitHub:
    Deploy to GitHub Pages.
    Supports direct git push or GitHub Actions workflow.
    Ideal for static documentation sites.

Environment Variables:
  DO_TOKEN                 .do platform API token (via oauth.do)
  DO_API_URL               .do platform API URL (default: https://apis.do)
  CLOUDFLARE_ACCOUNT_ID    Cloudflare account ID (for direct CF deploys)
  CLOUDFLARE_API_TOKEN     Cloudflare API token (for direct CF deploys)
  VERCEL_TOKEN             Vercel API token
  VERCEL_TEAM_ID           Vercel team ID (optional)
  GITHUB_TOKEN             GitHub personal access token
`

/**
 * Parse a command argv (the global render flags already peeled off by `extractGlobals`). Fails
 * CLOSED: an unknown command word, an unknown flag (mid-argv or trailing), a missing or malformed
 * value, and a bad enumeration are each a USAGE `CliError` (exit 2) — never silently ignored.
 * `ctx` is the frozen render context resolved once in `main`; it defaults to the machine-safe
 * `FAILSAFE_CTX` when constructed outside `main` (tests, embedders).
 */
export function parseArgs(args: string[], ctx: OutputCtx = FAILSAFE_CTX): CliOptions {
  const options: CliOptions = {
    ctx,
    command: 'dev', // Default to dev
    projectDir: process.cwd(),
    platform: 'do', // Default to .do platform
    dryRun: false,
    force: false,
    verbose: false,
    env: {},
    help: false,
    watch: false,
    coverage: false,
    ui: false,
    context: 'local',
    target: 'workers',
    db: 'memory',
    aiMode: 'local',
    port: 3000,
    host: 'localhost',
    clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    httpPort: parseInt(process.env.CLICKHOUSE_HTTP_PORT || '8123', 10),
    open: false,
  }

  // Parse command
  const first = args[0]
  if (first !== undefined && !first.startsWith('-')) {
    const cmd = first.toLowerCase()
    if (cmd === 'dev') {
      options.command = 'dev'
    } else if (cmd === 'build') {
      options.command = 'build'
    } else if (cmd === 'start') {
      options.command = 'start'
    } else if (cmd === 'test') {
      options.command = 'test'
    } else if (cmd === 'run') {
      options.command = 'run'
    } else if (cmd === 'deploy') {
      options.command = 'deploy'
    } else if (cmd === 'admin') {
      options.command = 'admin'
    } else if (cmd === 'notebook') {
      options.command = 'notebook'
    } else if (cmd === 'tail') {
      options.command = 'tail'
    } else if (cmd === 'db') {
      options.command = 'db'
    } else if (cmd === 'db:server') {
      options.command = 'db:server'
    } else if (cmd === 'db:client') {
      options.command = 'db:client'
    } else if (cmd === 'db:publish') {
      options.command = 'db:publish'
    } else if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
      options.command = 'version'
    } else if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
      options.command = 'help'
    } else {
      // A typo'd verb (`dpeloy`) must never fall through to the dev server.
      throw usageError(`unknown command ${JSON.stringify(first)}`, 'run `mdxe help` for the command list')
    }
    args = args.slice(1)
  }

  // `tail` owns its argv (`parseTailArgs`): hand it through untouched, never pre-validated here.
  if (options.command === 'tail') return options

  // Handle positional argument after command (e.g., mdxe notebook ./path/to/file.mdx)
  // For deploy, check if it's a subcommand like 'workers'
  const positional = args[0]
  if (positional !== undefined && !positional.startsWith('-')) {
    if (options.command === 'deploy' && positional === 'workers') {
      options.subcommand = 'workers'
      args = args.slice(1)
    } else {
      options.projectDir = resolve(positional)
      args = args.slice(1)
    }
  }

  // Parse options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--dir':
      case '--path':
      case '-d':
        requireValue('--dir', next, 'mdxe [command] --dir <path>')
        options.projectDir = resolve(next)
        i++
        break
      case '--platform':
      case '-p':
        if (next === 'do' || next === 'cloudflare' || next === 'vercel' || next === 'github') {
          options.platform = next
        } else {
          throw usageError(`Invalid platform: ${next}. Supported: do, cloudflare, vercel, github`)
        }
        i++
        break
      case '--mode':
      case '-m':
        if (next === 'static' || next === 'opennext') {
          options.mode = next
        } else {
          throw usageError(`Invalid mode: ${next}. Use 'static' or 'opennext'.`)
        }
        i++
        break
      case '--name':
      case '-n':
        requireValue('--name', next, 'mdxe deploy --name <project-name>')
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
      case '-e': {
        requireValue('--env', next, 'mdxe deploy --env KEY=value')
        const eq = next.indexOf('=')
        if (eq < 1) throw usageError(`--env expects KEY=value, got ${JSON.stringify(next)}`)
        options.env[next.slice(0, eq)] = next.slice(eq + 1)
        i++
        break
      }
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
        requireValue('--filter', next, 'mdxe test --filter <pattern>')
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
          throw usageError(`Invalid context: ${next}. Use 'local', 'remote', or 'all'.`)
        }
        i++
        break
      case '--target':
        if (next === 'node' || next === 'bun' || next === 'workers' || next === 'all') {
          options.target = next
        } else {
          throw usageError(`Invalid target: ${next}. Use 'node', 'bun', 'workers', or 'all'.`)
        }
        i++
        break
      case '--db':
        if (next !== undefined && ['memory', 'fs', 'sqlite', 'sqlite-do', 'clickhouse', 'all'].includes(next)) {
          options.db = next as CliOptions['db']
        } else {
          throw usageError(`Invalid db backend: ${next}. Use memory, fs, sqlite, sqlite-do, clickhouse, or all.`)
        }
        i++
        break
      case '--http-port':
        options.httpPort = validatePort('--http-port', next, 'mdxe db --http-port 8123')
        i++
        break
      case '--clickhouse':
        requireValue('--clickhouse', next, 'mdxe db:publish --clickhouse http://localhost:8123')
        options.clickhouseUrl = next
        i++
        break
      case '--ai':
        if (next === 'local' || next === 'remote') {
          options.aiMode = next
        } else {
          throw usageError(`Invalid AI mode: ${next}. Use 'local' or 'remote'.`)
        }
        i++
        break
      // Server options
      case '--port':
        options.port = validatePort('--port', next, 'mdxe dev --port 3000')
        i++
        break
      case '--host':
        requireValue('--host', next, 'mdxe dev --host localhost')
        options.host = next
        i++
        break
      case '--open':
      case '-o':
        options.open = true
        break
      // Worker loaders deployment options
      case '--workers':
        options.workers = true
        break
      case '--content-hash':
        options.contentHash = true
        break
      case '--compatibility-date':
        requireValue('--compatibility-date', next, 'mdxe deploy workers --compatibility-date 2024-01-01')
        options.compatibilityDate = next
        i++
        break
      default:
        // Fail closed BEFORE any value is consumed: a typo'd flag errors identically mid-argv or
        // trailing, and can never be swallowed to masquerade as an intentional run.
        if (arg !== undefined && arg.startsWith('-')) throw usageError(`unknown flag ${arg}`, 'run `mdxe help` for the option list')
        throw usageError(`bad argument ${JSON.stringify(arg ?? '')} — expected a --flag here`)
    }
  }

  return options
}

export async function runDeploy(options: CliOptions): Promise<void> {
  // Handle workers deployment subcommand
  if (options.subcommand === 'workers' || options.workers) {
    console.log('🔧 mdxe deploy workers\n')
    console.log(`📁 Project: ${options.projectDir}`)

    if (options.dryRun) {
      console.log('🔬 Dry run mode - no changes will be made\n')
    }

    const { deployWorkers } = await import('./commands/deploy-workers.js')
    const result = await deployWorkers({
      projectDir: options.projectDir,
      name: options.projectName || 'mdx-workers',
      useContentHash: options.contentHash,
      compatibilityDate: options.compatibilityDate,
      dryRun: options.dryRun,
      verbose: options.verbose,
    })

    // Show logs
    if (options.verbose && result.logs.length > 0) {
      console.log('\n📋 Logs:')
      for (const log of result.logs) {
        console.log(`   ${log}`)
      }
    }

    if (result.success) {
      console.log('\n✅ Worker deployment successful!')
      if (result.workerIds) {
        console.log(`📦 Workers: ${result.workerIds.length}`)
      }
      if (result.contentHash) {
        console.log(`🔑 Content Hash: ${result.contentHash}`)
      }
      console.log(`⏱️  Duration: ${result.duration}ms`)
    } else {
      console.error('\n❌ Worker deployment failed!')
      if (result.error) {
        console.error(`   Error: ${result.error}`)
      }
      process.exit(1)
    }
    return
  }

  // Check for Docs type project
  const { isDocsType } = await checkDocsType(options.projectDir)

  if (isDocsType) {
    console.log('🚀 mdxe deploy (Fumadocs)\n')
    console.log(`📁 Project: ${options.projectDir}`)

    if (options.dryRun) {
      console.log('🔬 Dry run mode - no changes will be made\n')
    }

    const { deployFumadocs } = await import('@mdxe/fumadocs')
    const result = await deployFumadocs({
      projectDir: options.projectDir,
      force: options.force,
      verbose: options.verbose,
    })

    if (!result.success) {
      console.error('\n❌ Deployment failed!')
      if (result.error) {
        console.error(`   Error: ${result.error}`)
      }
      process.exit(1)
    }

    console.log('\n✅ Deployment successful!')
    return
  }

  console.log('🚀 mdxe deploy\n')
  console.log(`📁 Project: ${options.projectDir}`)

  if (options.dryRun) {
    console.log('🔬 Dry run mode - no changes will be made\n')
  }

  // Use unified deploy package
  const { deploy, detectPlatform } = await import('@mdxe/deploy')

  // Auto-detect platform if not specified
  let platform = options.platform
  const detection = detectPlatform(options.projectDir)

  if (!platform) {
    platform = detection.platform
    console.log(`🔍 Auto-detected: ${platform} (${detection.reason})`)
  }

  if (detection.framework) {
    console.log(`📦 Framework: ${detection.framework}`)
  }
  console.log(`📊 Static: ${detection.isStatic ? 'yes' : 'no (SSR)'}`)
  console.log(`🎯 Platform: ${platform}`)
  console.log('')

  // Build unified options
  type DeployOpts = Parameters<typeof deploy>[0]
  const deployOptions: DeployOpts = {
    projectDir: options.projectDir,
    platform,
    name: options.projectName,
    env: options.env,
    dryRun: options.dryRun,
    force: options.force,
    verbose: options.verbose,
  }

  // Add platform-specific options
  if (platform === 'cloudflare' && options.mode) {
    (deployOptions as DeployOpts & { mode?: string }).mode = options.mode
  }

  const result = await deploy(deployOptions)

  // Show logs if verbose
  if (options.verbose && result.logs) {
    console.log('\n📋 Logs:')
    for (const log of result.logs) {
      console.log(`   ${log}`)
    }
  }

  // Show timing if available
  if (result.timing?.totalDuration) {
    console.log(`\n⏱️  Duration: ${(result.timing.totalDuration / 1000).toFixed(1)}s`)
  }

  if (result.success) {
    console.log('\n✅ Deployment successful!')
    if (result.url) {
      console.log(`🌐 URL: ${result.url}`)
    }
    if (result.productionUrl && result.productionUrl !== result.url) {
      console.log(`🌐 Production: ${result.productionUrl}`)
    }
    if (result.deploymentId) {
      console.log(`📋 ID: ${result.deploymentId}`)
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
 * Extract imports from code
 */
function extractImports(code: string): { imports: string[]; codeWithoutImports: string } {
  const imports: string[] = []
  const lines = code.split('\n')
  const nonImportLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match import statements (including multiline)
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      imports.push(trimmed)
    } else if (trimmed.startsWith('export ')) {
      // Skip export statements in test blocks
      continue
    } else {
      nonImportLines.push(line)
    }
  }

  return {
    imports,
    codeWithoutImports: nonImportLines.join('\n').trim()
  }
}

/**
 * Extract file-level imports from MDX content (outside code blocks)
 */
function extractMdxImports(content: string): string[] {
  const imports: string[] = []
  // Match import statements at MDX level (not inside code blocks)
  // Look for imports before the first code block or between frontmatter and content
  const frontmatterEnd = content.indexOf('---', 3)
  const firstCodeBlock = content.indexOf('```')

  const searchArea = frontmatterEnd > 0 && firstCodeBlock > 0
    ? content.slice(frontmatterEnd + 3, firstCodeBlock)
    : content.slice(0, firstCodeBlock > 0 ? firstCodeBlock : 500)

  const importRegex = /^import\s+.+$/gm
  let match
  while ((match = importRegex.exec(searchArea)) !== null) {
    imports.push(match[0].trim())
  }

  return imports
}

/**
 * Extract test blocks from MDX content
 * Uses line-start anchoring to avoid matching backticks inside code
 */
function extractTestBlocks(content: string): { name: string; code: string; imports: string[] }[] {
  const tests: { name: string; code: string; imports: string[] }[] = []

  // Match code blocks with 'test' in the meta
  // Use multiline mode and anchor to line start to avoid matching backticks inside code
  const codeBlockRegex = /^```(?:ts|typescript|js|javascript)\s+test(?:\s+name="([^"]*)")?[^\n]*\n([\s\S]*?)^```$/gm

  let match
  let testIndex = 0
  while ((match = codeBlockRegex.exec(content)) !== null) {
    testIndex++
    const name = match[1] || `test ${testIndex}`
    const rawCode = match[2].trim()

    // Extract imports from this test block
    const { imports, codeWithoutImports } = extractImports(rawCode)

    tests.push({ name, code: codeWithoutImports, imports })
  }

  return tests
}

/**
 * Extract script blocks from MDX content
 * Uses line-start anchoring to avoid matching backticks inside code
 */
function extractScriptBlocks(content: string): { name: string; code: string; imports: string[] }[] {
  const scripts: { name: string; code: string; imports: string[] }[] = []

  // Match code blocks with 'script' in the meta
  // Use multiline mode and anchor to line start to avoid matching backticks inside code
  const codeBlockRegex = /^```(?:ts|typescript|js|javascript)\s+script(?:\s+name="([^"]*)")?[^\n]*\n([\s\S]*?)^```$/gm

  let match
  let scriptIndex = 0
  while ((match = codeBlockRegex.exec(content)) !== null) {
    scriptIndex++
    const name = match[1] || `script ${scriptIndex}`
    const rawCode = match[2].trim()

    // Extract imports from this script block
    const { imports, codeWithoutImports } = extractImports(rawCode)

    scripts.push({ name, code: codeWithoutImports, imports })
  }

  return scripts
}

/**
 * Check if an import is a local file import (starts with . or /)
 */
function isLocalImport(imp: string): boolean {
  // Match imports like: import X from './path' or import X from '../path' or import X from '/path'
  return /from\s+['"][./]/.test(imp)
}

/**
 * Collect all imports from tests and MDX content
 * Filters out local file imports since Miniflare can't resolve them
 */
function collectImports(
  tests: { name: string; code: string; imports: string[] }[],
  mdxImports: string[] = []
): string[] {
  const allImports = new Set<string>()

  // Add MDX imports, filtering out local file imports
  for (const imp of mdxImports) {
    if (!isLocalImport(imp)) {
      allImports.add(imp)
    }
  }

  // Add test imports, filtering out local file imports
  for (const test of tests) {
    for (const imp of test.imports) {
      if (!isLocalImport(imp)) {
        allImports.add(imp)
      }
    }
  }

  return Array.from(allImports)
}

/**
 * Transform TypeScript/JSX code to plain JavaScript
 * Only transforms if actual JSX syntax is detected (not just HTML in strings)
 */
async function transformCode(code: string, hasImports: boolean): Promise<string> {
  // Don't transform if there are external imports - esbuild will fail trying to bundle them
  if (hasImports) {
    return code
  }

  // More conservative JSX detection:
  // - Must have JSX-style opening tag with capital letter (component) OR
  // - Self-closing tag outside of a string literal
  // - Avoid matching HTML in strings like '<h1>Hello</h1>'

  // Look for JSX component pattern: <ComponentName or <Component.Name
  const hasJsxComponent = /<[A-Z][a-zA-Z0-9.]*[\s/>]/.test(code)

  // Look for JSX expression pattern: {expression} inside what looks like JSX
  // This pattern: <tag {...} > or <tag prop={...} >
  const hasJsxExpression = /<[a-zA-Z][a-zA-Z0-9]*[^>]*\{[^}]+\}[^>]*>/.test(code)

  if (!hasJsxComponent && !hasJsxExpression) {
    return code
  }

  try {
    const result = await transform(code, {
      loader: 'tsx',
      jsx: 'transform',
      jsxFactory: 'jsx',
      jsxFragment: 'Fragment',
      target: 'es2022',
    })
    // The transformed code expects jsx/Fragment to be in scope
    // Prepend declarations that work with Hono's JSX
    const jsxRuntime = `
const jsx = (type, props, ...children) => {
  if (typeof type === 'function') return type({ ...props, children });
  const element = { type, props: { ...props, children: children.flat() } };
  return element;
};
const Fragment = ({ children }) => children;
const jsxs = jsx;
`
    return jsxRuntime + result.code
  } catch (e: unknown) {
    // If transformation fails, return original code
    // The sandbox will report the actual error
    console.warn('JSX transform warning:', (e as Error).message)
    return code
  }
}

/**
 * Generate test code for ai-sandbox from extracted tests
 * Imports are now passed separately to be hoisted at module top level
 */
function generateTestCode(
  tests: { name: string; code: string; imports: string[] }[]
): string {
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
 * Get database provider config for the SDK
 * The SDK injects DB, db, etc. as globals based on this config
 */
function getDbConfig(db: CliOptions['db'], _target: CliOptions['target']): { provider: string; config: Record<string, unknown> } {
  switch (db) {
    case 'memory':
      return { provider: 'memory', config: {} }
    case 'fs':
      return { provider: 'fs', config: { root: './content' } }
    case 'sqlite':
      return { provider: 'sqlite', config: { url: ':memory:' } }
    case 'sqlite-do':
      return { provider: 'sqlite-do', config: {} }
    case 'clickhouse':
      return { provider: 'clickhouse', config: { url: process.env.CLICKHOUSE_URL || 'http://localhost:8123' } }
    default:
      return { provider: 'memory', config: {} }
  }
}

/**
 * Generate test matrix from target and db options
 *
 * All targets use workerd for consistent execution:
 * - workers: Direct Cloudflare Workers (@mdxe/workers)
 * - node: Local workerd via Miniflare (@mdxe/workers/local)
 * - bun: Local workerd via Miniflare (@mdxe/workers/local)
 *
 * This unified model ensures tests produce identical results across all runtimes
 * since they all execute in the same workerd environment.
 */
function generateTestMatrix(target: CliOptions['target'], db: CliOptions['db']): Array<{ target: string; db: string }> {
  // All targets use workerd - order reflects the recommended default (workers first)
  const targets = target === 'all' ? ['workers', 'node', 'bun'] : [target]
  const dbs = db === 'all'
    ? ['memory', 'fs', 'sqlite', 'sqlite-do', 'clickhouse']
    : [db]

  const matrix: Array<{ target: string; db: string }> = []

  for (const t of targets) {
    for (const d of dbs) {
      // Skip invalid combinations
      if (t === 'workers' && d === 'fs') continue // fs not available on workers
      if (t === 'node' && d === 'sqlite-do') continue // Durable Objects only on workers
      if (t === 'bun' && d === 'sqlite-do') continue // Durable Objects only on workers

      matrix.push({ target: t, db: d })
    }
  }

  return matrix
}

/**
 * Get the runtime module path for a given target
 *
 * All targets use workerd for execution:
 * - workers: Direct Cloudflare Workers (@mdxe/workers)
 * - node/bun: Local workerd via Miniflare (@mdxe/workers/local)
 */
export function getWorkerdRuntime(target: CliOptions['target']): 'workers' | 'local' {
  switch (target) {
    case 'workers':
      return 'workers'
    case 'node':
    case 'bun':
    default:
      return 'local'
  }
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

  // Generate test matrix
  const matrix = generateTestMatrix(options.target, options.db)

  if (matrix.length > 1) {
    console.log(`\n📊 Test Matrix: ${matrix.length} combinations`)
    for (const combo of matrix) {
      console.log(`   • ${combo.target} + ${combo.db}`)
    }
  }

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

  console.log(`\n⚙️  Context: ${options.context}`)
  console.log(`🎯 Target: ${options.target}`)
  console.log(`💾 Database: ${options.db}`)
  if (options.context === 'remote') {
    console.log(`🌐 RPC URL: ${sdkConfig.rpcUrl}`)
  }

  if (options.verbose) {
    console.log(`🔧 SDK RPC URL: ${sdkConfig.rpcUrl}`)
    console.log(`🔧 SDK Namespace: ${sdkConfig.ns}`)
  }

  console.log('\n' + '─'.repeat(60) + '\n')

  // Import ai-evaluate dynamically (formerly ai-sandbox)
  const { evaluate } = await import('ai-evaluate')

  // Track results
  const results: {
    file: string
    target: string
    db: string
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

  // Run each matrix combination
  for (const combo of matrix) {
    if (matrix.length > 1) {
      console.log(`\n🔄 Running: ${combo.target} + ${combo.db}`)
      console.log('─'.repeat(40))
    }

    // Get db config for this combination
    const dbConfig = getDbConfig(combo.db as CliOptions['db'], combo.target as CliOptions['target'])

  // Run each test file
  for (const filePath of testFiles) {
    const fileName = relative(projectDir, filePath)
    const content = readFileSync(filePath, 'utf-8')

    // Extract MDX-level imports
    const mdxImports = extractMdxImports(content)

    // Extract test blocks
    const testBlocks = extractTestBlocks(content)

    if (testBlocks.length === 0) {
      if (options.verbose) {
        console.log(`⏭️  ${fileName} (no tests)`)
      }
      continue
    }

    // Collect imports and generate test code
    const imports = collectImports(testBlocks, mdxImports)
    const rawTestCode = generateTestCode(testBlocks)

    // Transform JSX/TypeScript to plain JavaScript
    // Skip transformation if external imports exist (esbuild can't bundle them)
    const testCode = await transformCode(rawTestCode, imports.length > 0)

    // Run through ai-sandbox with hoisted imports and db config
    const startTime = Date.now()
    const result = await evaluate({
      tests: testCode,
      sdk: {
        ...sdkConfig,
        db: dbConfig,
        target: combo.target,
      },
      imports,
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
        target: combo.target,
        db: combo.db,
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
  } // End matrix loop

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log(`\n📊 Summary: ${totalPassed}/${totalTests} tests passed`)

  if (matrix.length > 1) {
    console.log(`\n📋 Matrix Results:`)
    // Group by combo
    const byCombo = new Map<string, { passed: number; failed: number }>()
    for (const r of results) {
      const key = `${r.target} + ${r.db}`
      const existing = byCombo.get(key) || { passed: 0, failed: 0 }
      existing.passed += r.passed
      existing.failed += r.failed
      byCombo.set(key, existing)
    }
    for (const [key, counts] of byCombo) {
      const icon = counts.failed > 0 ? '❌' : '✅'
      console.log(`   ${icon} ${key}: ${counts.passed} passed, ${counts.failed} failed`)
    }
  }

  if (totalFailed > 0) {
    console.log(`\n❌ ${totalFailed} test(s) failed`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
  }
}

/**
 * Run script blocks from an MDX file
 */
export async function runScript(options: CliOptions): Promise<void> {
  const filePath = options.projectDir

  console.log('⚡ mdxe run\n')
  console.log(`📄 File: ${filePath}`)

  // Check if file exists
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    process.exit(1)
  }

  // Check if it's an MDX file
  if (!filePath.endsWith('.mdx') && !filePath.endsWith('.md')) {
    console.error(`❌ File must be an MDX or MD file: ${filePath}`)
    process.exit(1)
  }

  // Read file content
  const content = readFileSync(filePath, 'utf-8')

  // Extract MDX-level imports
  const mdxImports = extractMdxImports(content)

  // Extract script blocks
  const scriptBlocks = extractScriptBlocks(content)

  if (scriptBlocks.length === 0) {
    console.log('⚠️  No script blocks found')
    console.log('   Looking for: ```ts script or ```typescript script')
    return
  }

  // Filter by name if specified
  let scriptsToRun = scriptBlocks
  if (options.filter) {
    scriptsToRun = scriptBlocks.filter(s => s.name === options.filter)
    if (scriptsToRun.length === 0) {
      console.error(`❌ No script block named "${options.filter}" found`)
      console.log(`   Available scripts: ${scriptBlocks.map(s => s.name).join(', ')}`)
      process.exit(1)
    }
  }

  console.log(`📋 Found ${scriptsToRun.length} script block(s)`)
  console.log('\n' + '─'.repeat(60) + '\n')

  // Collect all imports from scripts and MDX content
  const allImports: string[] = []
  for (const imp of mdxImports) {
    if (!allImports.includes(imp)) {
      allImports.push(imp)
    }
  }
  for (const script of scriptsToRun) {
    for (const imp of script.imports) {
      if (!allImports.includes(imp)) {
        allImports.push(imp)
      }
    }
  }

  // Combine all script code into a single module
  const combinedCode = scriptsToRun.map(s => s.code).join('\n\n')

  // Create the full script with hoisted imports
  const fullScript = allImports.join('\n') + '\n\n' + combinedCode

  if (options.verbose) {
    console.log('📝 Generated script:')
    console.log('─'.repeat(40))
    console.log(fullScript)
    console.log('─'.repeat(40))
    console.log('')
  }

  // Write to temp file and execute with tsx/bun
  const path = await import('node:path')
  const fs = await import('node:fs/promises')

  // Write temp file in the same directory as the script for proper module resolution
  const scriptDir = path.dirname(resolve(filePath))
  const tempFile = path.join(scriptDir, `.mdxe-script-${Date.now()}.ts`)

  await fs.writeFile(tempFile, fullScript, 'utf-8')

  const startTime = Date.now()

  try {
    // Try to detect bun or fallback to tsx
    const runtime = process.versions.bun ? 'bun' : 'tsx'

    if (options.verbose) {
      console.log(`🔧 Runtime: ${runtime}`)
      console.log(`📄 Temp file: ${tempFile}`)
    }

    // Execute the script from the same directory for proper module resolution
    const result = spawn(runtime, [tempFile], {
      cwd: scriptDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        // Pass through useful env vars
        MDXE_FILE: filePath,
        MDXE_DIR: scriptDir,
      },
    })

    // Wait for script to complete
    const exitCode = await new Promise<number>((resolve) => {
      result.on('close', (code) => resolve(code ?? 0))
      result.on('error', (err) => {
        console.error(`❌ Failed to run script: ${err.message}`)
        resolve(1)
      })
    })

    const duration = Date.now() - startTime

    console.log('\n' + '─'.repeat(60))

    if (exitCode === 0) {
      console.log(`✅ Script completed successfully (${duration}ms)`)
    } else {
      console.log(`❌ Script failed with exit code ${exitCode} (${duration}ms)`)
      process.exit(exitCode)
    }
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run dev server
 */
export async function runDev(options: CliOptions): Promise<void> {
  // Check for Docs type project
  const { isDocsType } = await checkDocsType(options.projectDir)

  if (isDocsType) {
    console.log('📚 mdxe dev (Fumadocs)\n')
    console.log(`📁 Project: ${options.projectDir}`)
    console.log(`🌐 Server: http://${options.host}:${options.port}`)
    console.log('')

    const { runFumadocsDev } = await import('@mdxe/fumadocs')
    await runFumadocsDev({
      projectDir: options.projectDir,
      port: options.port,
      host: options.host,
      force: options.force,
      verbose: options.verbose,
    })
    return
  }

  console.log('🚀 mdxe dev\n')
  console.log(`📁 Project: ${options.projectDir}`)
  console.log(`🌐 Server: http://${options.host}:${options.port}`)

  // Check if we should use Miniflare (workers-first approach)
  const useMiniflare = options.target === 'workers' || process.env.MDXE_USE_MINIFLARE === 'true'

  if (useMiniflare) {
    console.log('⚡ Runtime: workerd (via Miniflare)')
    console.log('')

    // Use Miniflare-based dev server for workers-consistent execution
    const { createMiniflareDevServer } = await import('./commands/dev-server.js')
    await createMiniflareDevServer({
      projectDir: options.projectDir,
      port: options.port,
      host: options.host,
      verbose: options.verbose,
      env: options.env,
      hotReload: true,
    })
  } else {
    console.log('⚡ Runtime: Node.js (Hono)')
    console.log('')

    // Dynamic import of @mdxe/hono server (Node.js-based)
    const { createDevServer } = await import('@mdxe/hono/server')
    await createDevServer({
      projectDir: options.projectDir,
      port: options.port,
      host: options.host,
      verbose: options.verbose,
    })
  }
}

/**
 * Build for production
 */
export async function runBuild(options: CliOptions): Promise<void> {
  // Check for Docs type project
  const { isDocsType } = await checkDocsType(options.projectDir)

  if (isDocsType) {
    console.log('📦 mdxe build (Fumadocs)\n')
    console.log(`📁 Project: ${options.projectDir}`)

    const { buildFumadocs } = await import('@mdxe/fumadocs')
    const result = await buildFumadocs({
      projectDir: options.projectDir,
      deploy: false,
      force: options.force,
      verbose: options.verbose,
    })

    if (!result.success) {
      console.error('\n❌ Build failed!')
      if (result.error) {
        console.error(`   Error: ${result.error}`)
      }
      process.exit(1)
    }

    console.log('\n✅ Build complete!')
    return
  }

  console.log('📦 mdxe build\n')
  console.log(`📁 Project: ${options.projectDir}`)

  // Dynamic import of @mdxe/hono build
  const { build } = await import('@mdxe/hono/server')
  await build({
    projectDir: options.projectDir,
    verbose: options.verbose,
  })

  console.log('\n✅ Build complete!')
}

/**
 * Start production server
 */
export async function runStart(options: CliOptions): Promise<void> {
  console.log('🚀 mdxe start\n')
  console.log(`📁 Project: ${options.projectDir}`)
  console.log(`🌐 Server: http://${options.host}:${options.port}`)
  console.log('')

  // Dynamic import of @mdxe/hono server
  const { createServer } = await import('@mdxe/hono/server')
  await createServer({
    projectDir: options.projectDir,
    port: options.port,
    host: options.host,
    verbose: options.verbose,
  })
}

/**
 * Run database commands (local implementation, no longer depends on mdxdb package)
 */
async function runDbCommand(options: CliOptions): Promise<void> {
  const db = await import('./commands/db.js')

  // Map mdxe CliOptions to DbCliOptions
  const dbOptions: db.DbCliOptions = {
    command: options.command === 'db' ? 'dev'
      : options.command === 'db:server' ? 'server'
      : options.command === 'db:client' ? 'client'
      : options.command === 'db:publish' ? 'publish'
      : 'dev',
    path: options.projectDir,
    name: options.projectName,
    baseUrl: process.env.DO_API_URL || 'https://apis.do',
    clickhouseUrl: options.clickhouseUrl,
    port: options.port,
    httpPort: options.httpPort,
    studioPort: 4000,
    dryRun: options.dryRun,
    verbose: options.verbose,
    useClickhouse: !!options.clickhouseUrl && options.clickhouseUrl !== 'http://localhost:8123',
  }

  switch (dbOptions.command) {
    case 'publish':
      await db.runPublish(dbOptions)
      break
    case 'server':
      await db.runServer(dbOptions)
      break
    case 'client':
      await db.runClient(dbOptions)
      break
    case 'studio':
      await db.runStudio(dbOptions)
      break
    case 'dev':
    default:
      await db.runDev(dbOptions)
      break
  }
}

/**
 * Run Payload admin with mdxdb backend
 *
 * Scans the current directory for MDX files, discovers types from $type frontmatter,
 * and starts a Payload instance with native mdxdb collections enabled.
 */
export async function runAdmin(options: CliOptions): Promise<void> {
  console.log('🎛️  mdxe admin\n')
  console.log(`📁 Project: ${options.projectDir}`)
  console.log(`🌐 Server: http://${options.host}:${options.port}`)
  console.log('')

  // Dynamic import of @mdxe/payload
  const { adminCommand } = await import('@mdxe/payload')

  await adminCommand({
    contentDir: options.projectDir,
    port: options.port,
    verbose: options.verbose,
  })
}

/**
 * The router. Resolves the render context ({@link resolveFromProcess}) and the Caller
 * ({@link resolveCallerFromProcess}) exactly ONCE, fast-paths `help`/`version` BEFORE any dynamic
 * import (help never loads a runtime), renders the ORIENTATION on a bare invocation (never the dev
 * server — a wrongly-launched server blocks a harness forever), then dispatches with the frozen
 * `ctx` on every command's options. The whole body is one try/catch: any throw is rendered by
 * {@link fail} to **stderr** in the active mode and its exit code RETURNED — stdout stays a pure
 * payload. `process.exit` is the entrypoint's job (bottom of this file), never `main`'s.
 */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  // Arg pre-parse + context resolution BOTH fail closed to the minimal machine-safe context: a bad
  // global flag (`--format xml`, `--color` with no value) renders the same clean error line and a
  // nonzero exit as any other failure — never an unhandled rejection.
  let parsed: ReturnType<typeof extractGlobals>
  let ctx: OutputCtx
  let caller: Caller
  try {
    parsed = extractGlobals(argv)
    ctx = resolveFromProcess(parsed.globals)
    caller = resolveCallerFromProcess(parsed.globals)
  } catch (err) {
    return fail(FAILSAFE_CTX, err)
  }
  const { rest, wantHelp, wantVersion } = parsed

  try {
    // Meta fast-path — BEFORE any dynamic import.
    if (wantVersion) {
      console.log(ctx.mode === 'json' ? JSON.stringify({ name: 'mdxe', version: VERSION }) : `mdxe version ${VERSION}`)
      return EXIT.OK
    }
    if (wantHelp) {
      console.log(HELP_TEXT)
      return EXIT.OK
    }
    // The bare invocation renders the ORIENTATION: an agent/CI/pipe gets static text and exits 0
    // without reading stdin; a confident human gets the same orientation as the opening view.
    if (rest.length === 0) return orientCommand(ctx, caller, VERSION)

    const options = parseArgs(rest, ctx)

    switch (options.command) {
      case 'dev':
        await runDev(options)
        break
      case 'build':
        await runBuild(options)
        break
      case 'start':
        await runStart(options)
        break
      case 'test':
        await runTest(options)
        break
      case 'run':
        await runScript(options)
        break
      case 'deploy':
        await runDeploy(options)
        break
      case 'admin':
        await runAdmin(options)
        break
      case 'notebook': {
        const { runNotebook } = await import('./commands/notebook')
        await runNotebook({
          path: options.projectDir,
          port: options.port,
          host: options.host,
          open: options.open,
          verbose: options.verbose,
        })
        break
      }
      case 'tail': {
        // `tail` parses its own argv. The global render flags were peeled off already, so hand the
        // resolved ctx back to it in its own vocabulary (`--json`, `--no-color`) — NO_COLOR and the
        // --format ladder now govern tail exactly like every other command.
        const tailArgs = [...rest.slice(1)]
        if (ctx.mode === 'json') tailArgs.push('--json')
        if (!ctx.color) tailArgs.push('--no-color')
        const { parseTailArgs, runTail } = await import('./commands/tail.js')
        const tailOptions = parseTailArgs(tailArgs)
        tailOptions.verbose = tailOptions.verbose || options.verbose
        await runTail(tailOptions)
        break
      }
      case 'db':
      case 'db:server':
      case 'db:client':
      case 'db:publish':
        await runDbCommand(options)
        break
      case 'version':
        console.log(`mdxe version ${VERSION}`)
        break
      case 'help':
      default:
        console.log(HELP_TEXT)
        break
    }
    return EXIT.OK
  } catch (err) {
    return fail(ctx, err)
  }
}

/**
 * True iff this module is the process entrypoint — the `mdxe` bin, `node dist/cli.js`, or a
 * Bun-compiled executable — as opposed to being IMPORTED (tests, embedders), where auto-running
 * `main` would parse the host's argv. Undeterminable ⇒ run: the module's only purpose is the bin.
 */
function isEntrypoint(): boolean {
  const script = process.argv[1]
  if (!script) return true
  if (script.startsWith('/$bunfs/')) return true // `bun build --compile` virtual entry path
  try {
    return realpathSync(script) === fileURLToPath(import.meta.url)
  } catch {
    return true
  }
}

// Run CLI. The exit code is main's return value; a nonzero code exits immediately (a dangling
// server must not keep a failed invocation alive), zero lets the event loop drain (dev server).
if (isEntrypoint()) {
  main().then(
    (code) => {
      process.exitCode = code
      if (code !== 0) process.exit(code)
    },
    (error: unknown) => {
      process.exit(fail(FAILSAFE_CTX, error))
    },
  )
}
