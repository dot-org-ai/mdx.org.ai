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
import { transform } from 'esbuild'

export interface CliOptions {
  command: 'dev' | 'build' | 'start' | 'deploy' | 'test' | 'admin' | 'notebook' | 'db' | 'db:server' | 'db:client' | 'db:publish' | 'help' | 'version'
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
}

export const VERSION = '0.0.0'

const HELP_TEXT = `
mdxe - Execute, Test, & Deploy MDX-based Agents, Apps, APIs, and Sites

Usage:
  mdxe [command] [options]

Commands:
  dev                 Start development server (default)
  build               Build for production
  start               Start production server
  test                Run MDX tests with vitest
  admin               Start Payload admin UI with mdxdb backend
  notebook            Launch interactive notebook for MDX files
  deploy              Deploy to cloud platforms
  db                  Start local dev environment (ClickHouse + sync + UI)
  db:server           Start only the ClickHouse server
  db:client           Open ClickHouse client shell
  db:publish          Publish MDX files to database
  help                Show this help message
  version             Show version

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
  --target <runtime>     Target runtime: node | bun | workers | all (default: node)
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

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
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
    target: 'node',
    db: 'memory',
    aiMode: 'local',
    port: 3000,
    host: 'localhost',
    clickhouseUrl: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    httpPort: parseInt(process.env.CLICKHOUSE_HTTP_PORT || '8123', 10),
    open: false,
  }

  // Parse command
  if (args.length > 0 && !args[0].startsWith('-')) {
    const cmd = args[0].toLowerCase()
    if (cmd === 'dev') {
      options.command = 'dev'
    } else if (cmd === 'build') {
      options.command = 'build'
    } else if (cmd === 'start') {
      options.command = 'start'
    } else if (cmd === 'test') {
      options.command = 'test'
    } else if (cmd === 'deploy') {
      options.command = 'deploy'
    } else if (cmd === 'admin') {
      options.command = 'admin'
    } else if (cmd === 'notebook') {
      options.command = 'notebook'
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
    }
    args = args.slice(1)
  }

  // Handle positional argument after command (e.g., mdxe notebook ./path/to/file.mdx)
  if (args.length > 0 && !args[0].startsWith('-')) {
    options.projectDir = resolve(args[0])
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
        if (next === 'do' || next === 'cloudflare' || next === 'vercel' || next === 'github') {
          options.platform = next
        } else {
          console.error(`Invalid platform: ${next}. Supported: do, cloudflare, vercel, github`)
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
      case '--target':
        if (next === 'node' || next === 'bun' || next === 'workers' || next === 'all') {
          options.target = next
        } else {
          console.error(`Invalid target: ${next}. Use 'node', 'bun', 'workers', or 'all'.`)
          process.exit(1)
        }
        i++
        break
      case '--db':
        if (['memory', 'fs', 'sqlite', 'sqlite-do', 'clickhouse', 'all'].includes(next)) {
          options.db = next as CliOptions['db']
        } else {
          console.error(`Invalid db backend: ${next}. Use memory, fs, sqlite, sqlite-do, clickhouse, or all.`)
          process.exit(1)
        }
        i++
        break
      case '--http-port':
        options.httpPort = parseInt(next || '8123', 10)
        i++
        break
      case '--clickhouse':
        options.clickhouseUrl = next || 'http://localhost:8123'
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
      // Server options
      case '--port':
        options.port = parseInt(next, 10) || 3000
        i++
        break
      case '--host':
        options.host = next || 'localhost'
        i++
        break
      case '--open':
      case '-o':
        options.open = true
        break
    }
  }

  return options
}

export async function runDeploy(options: CliOptions): Promise<void> {
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
 * Check if an import is a local file import (starts with . or /)
 */
function isLocalImport(imp: string): boolean {
  // Match imports like: import X from './path' or import X from '../path' or import X from '/path'
  return /from\s+['"][.\/]/.test(imp)
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
function getDbConfig(db: CliOptions['db'], target: CliOptions['target']): { provider: string; config: Record<string, unknown> } {
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
 */
function generateTestMatrix(target: CliOptions['target'], db: CliOptions['db']): Array<{ target: string; db: string }> {
  const targets = target === 'all' ? ['node', 'bun', 'workers'] : [target]
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

  // Import ai-sandbox dynamically
  const { evaluate } = await import('ai-sandbox')

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
 * Run dev server
 */
export async function runDev(options: CliOptions): Promise<void> {
  console.log('🚀 mdxe dev\n')
  console.log(`📁 Project: ${options.projectDir}`)
  console.log(`🌐 Server: http://${options.host}:${options.port}`)
  console.log('')

  // Dynamic import of @mdxe/hono server
  const { createDevServer } = await import('@mdxe/hono/server')
  await createDevServer({
    projectDir: options.projectDir,
    port: options.port,
    host: options.host,
    verbose: options.verbose,
  })
}

/**
 * Build for production
 */
export async function runBuild(options: CliOptions): Promise<void> {
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

export async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

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
    case 'deploy':
      await runDeploy(options)
      break
    case 'admin':
      await runAdmin(options)
      break
    case 'notebook':
      const { runNotebook } = await import('./commands/notebook')
      await runNotebook({
        path: options.projectDir,
        port: options.port,
        host: options.host,
        open: options.open,
        verbose: options.verbose,
      })
      break
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
}

// Run CLI
main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
