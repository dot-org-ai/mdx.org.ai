/**
 * @mdxe/bun CLI
 *
 * Command-line interface for running MDX scripts and tests with Bun.
 *
 * Commands:
 *   test [dir]     Run tests from MDX files (simple runner)
 *   test:bun [dir] Run tests with bun test (full module resolution)
 *   run <file>     Execute an MDX file's exports
 *   dev [dir]      Start development server
 *   serve [dir]    Start production server
 *
 * @packageDocumentation
 */

import { runTests, runTestsFromFile } from './test.js'
import { evaluateFile, runFile } from './evaluate.js'
import { createDevServer, createServer } from './server.js'
import { findMDXTestFiles } from './extract.js'
import { runMDXTestsWithBun, loadConfig, generateTestFile, type RunnerConfig } from './runner.js'

const VERSION = '0.0.0'

const HELP = `
@mdxe/bun - Run MDX scripts and tests with Bun

Usage:
  mdxe-bun <command> [options]

Commands:
  test [dir]              Run tests (simple runner, self-contained tests)
  test:bun [dir]          Run tests with bun test (full module resolution)
  run <file> [fn] [args]  Execute a function from an MDX file
  eval <file>             Evaluate an MDX file and print exports
  dev [dir]               Start development server
  serve [dir]             Start production server
  generate [dir]          Generate .test.ts files from MDX (for debugging)

Test Options:
  --verbose               Enable verbose output
  --filter <pattern>      Only run tests matching pattern
  --preload <file>        Preload script for globals (test:bun only)
  --keep                  Keep generated test files (test:bun only)
  --timeout <ms>          Test timeout in milliseconds

Server Options:
  --port <number>         Server port (default: 3000)
  --host <string>         Server host (default: localhost)

Examples:
  # Run simple self-contained tests
  mdxe-bun test ./examples

  # Run tests with full module resolution (imports, globals)
  mdxe-bun test:bun ./tests --preload ./test-setup.ts

  # Generate test files for inspection
  mdxe-bun generate ./tests --keep

  # Execute a function from an MDX file
  mdxe-bun run ./utils.mdx add 1 2

  # Start dev server
  mdxe-bun dev ./content

Configuration:
  Create mdxe.config.ts or add "mdxe" to package.json:

  // mdxe.config.ts
  export default {
    test: {
      globals: { DB: 'ai-database' },
      preload: ['./test-setup.ts'],
      timeout: 10000,
    }
  }
`

interface CLIOptions {
  verbose: boolean
  filter?: string
  port: number
  host: string
  preload?: string[]
  keep: boolean
  timeout?: number
}

function parseArgs(args: string[]): { command: string; positional: string[]; options: CLIOptions } {
  const options: CLIOptions = {
    verbose: false,
    port: 3000,
    host: 'localhost',
    keep: false,
    preload: [],
  }
  const positional: string[] = []
  let command = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      console.log(HELP)
      process.exit(0)
    }

    if (arg === '-v' || arg === '--version') {
      console.log(VERSION)
      process.exit(0)
    }

    if (arg === '--verbose') {
      options.verbose = true
      continue
    }

    if (arg === '--filter' && args[i + 1]) {
      options.filter = args[++i]
      continue
    }

    if (arg === '--port' && args[i + 1]) {
      options.port = parseInt(args[++i], 10)
      continue
    }

    if (arg === '--host' && args[i + 1]) {
      options.host = args[++i]
      continue
    }

    if (arg === '--preload' && args[i + 1]) {
      options.preload = options.preload || []
      options.preload.push(args[++i])
      continue
    }

    if (arg === '--keep') {
      options.keep = true
      continue
    }

    if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10)
      continue
    }

    if (!command && !arg.startsWith('-')) {
      command = arg
      continue
    }

    if (!arg.startsWith('-')) {
      positional.push(arg)
    }
  }

  return { command, positional, options }
}

async function runTestCommand(positional: string[], options: CLIOptions): Promise<void> {
  const target = positional[0] || '.'

  console.log('🧪 Running MDX tests...\n')

  // Check if target is a file or directory
  const file = Bun.file(target)
  const isFile = await file.exists() && target.match(/\.mdx?$/)

  if (isFile) {
    // Run tests from single file
    const result = await runTestsFromFile(target, {
      verbose: options.verbose,
      filter: options.filter,
    })

    printFileResult(result)
    process.exit(result.failed > 0 ? 1 : 0)
  } else {
    // Run tests from directory
    const result = await runTests(target, {
      verbose: options.verbose,
      filter: options.filter,
    })

    if (result.files.length === 0) {
      console.log('No MDX test files found.')
      process.exit(0)
    }

    if (!options.verbose) {
      for (const file of result.files) {
        printFileResult(file)
      }
    }

    console.log('\n' + '═'.repeat(50))
    console.log(`Total: ${result.totalPassed} passed, ${result.totalFailed} failed, ${result.totalSkipped} skipped`)
    console.log(`Time:  ${result.totalDuration.toFixed(1)}ms`)

    process.exit(result.totalFailed > 0 ? 1 : 0)
  }
}

function printFileResult(result: { path: string; passed: number; failed: number; skipped: number; tests: Array<{ name: string; passed: boolean; skipped: boolean; error?: string }> }): void {
  const status = result.failed > 0 ? '❌' : '✅'
  console.log(`${status} ${result.path}`)

  if (result.failed > 0) {
    for (const test of result.tests) {
      if (!test.passed && !test.skipped) {
        console.log(`   ❌ ${test.name}`)
        if (test.error) {
          console.log(`      ${test.error}`)
        }
      }
    }
  }
}

async function runRunCommand(positional: string[], options: CLIOptions): Promise<void> {
  const [file, fnName, ...fnArgs] = positional

  if (!file) {
    console.error('Error: No file specified')
    console.error('Usage: mdxe-bun run <file> [function] [args...]')
    process.exit(1)
  }

  try {
    if (fnName) {
      // Run specific function
      const args = fnArgs.map((arg) => {
        // Try to parse as JSON, otherwise use as string
        try {
          return JSON.parse(arg)
        } catch {
          return arg
        }
      })

      const result = await runFile(file, fnName, args)
      console.log(result)
    } else {
      // Just evaluate and show exports
      const result = await evaluateFile(file)
      console.log('Exports:', Object.keys(result.exports))
      console.log('Data:', result.data)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

async function runEvalCommand(positional: string[], options: CLIOptions): Promise<void> {
  const [file] = positional

  if (!file) {
    console.error('Error: No file specified')
    console.error('Usage: mdxe-bun eval <file>')
    process.exit(1)
  }

  try {
    const result = await evaluateFile(file)

    console.log('📄 Evaluated:', file)
    console.log('')
    console.log('Data:')
    console.log(JSON.stringify(result.data, null, 2))
    console.log('')
    console.log('Exports:')
    for (const [name, value] of Object.entries(result.exports)) {
      const type = typeof value
      const display = type === 'function' ? '[Function]' : JSON.stringify(value)
      console.log(`  ${name}: ${display}`)
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

async function runDevCommand(positional: string[], options: CLIOptions): Promise<void> {
  const projectDir = positional[0] || '.'

  await createDevServer({
    projectDir,
    port: options.port,
    host: options.host,
    verbose: options.verbose,
  })
}

async function runServeCommand(positional: string[], options: CLIOptions): Promise<void> {
  const projectDir = positional[0] || '.'

  await createServer({
    projectDir,
    port: options.port,
    host: options.host,
  })
}

async function runTestBunCommand(positional: string[], options: CLIOptions): Promise<void> {
  const target = positional[0] || '.'

  console.log('🧪 Running MDX tests with bun test...\n')

  const config: RunnerConfig = {
    rootDir: target,
    verbose: options.verbose,
    preload: options.preload,
    keepGenerated: options.keep,
    timeout: options.timeout,
  }

  const result = await runMDXTestsWithBun(config)

  process.exit(result.success ? 0 : 1)
}

async function runGenerateCommand(positional: string[], options: CLIOptions): Promise<void> {
  const target = positional[0] || '.'
  const { extractTests } = await import('./extract.js')
  const { join, dirname } = await import('node:path')

  console.log('📝 Generating test files from MDX...\n')

  // Check if target is a file or directory
  const file = Bun.file(target)
  const isFile = target.match(/\.mdx?$/) && await file.exists()

  let mdxFiles: string[]
  let outDir: string

  if (isFile) {
    mdxFiles = [target]
    outDir = join(dirname(target), '.mdxe-tests')
  } else {
    mdxFiles = await findMDXTestFiles(target, { includeInline: true })
    outDir = join(target, '.mdxe-tests')
  }

  if (mdxFiles.length === 0) {
    console.log('No MDX test files found.')
    return
  }

  // Ensure output directory exists
  await Bun.write(join(outDir, '.gitkeep'), '')

  let generated = 0
  for (const mdxPath of mdxFiles) {
    const content = await Bun.file(mdxPath).text()
    const tests = extractTests(content)

    if (tests.length === 0) continue

    const config: RunnerConfig = {
      preload: options.preload,
      timeout: options.timeout,
    }

    const testCode = generateTestFile(mdxPath, tests, config)
    const baseName = mdxPath.replace(/\//g, '_').replace('.mdx', '.test.ts')
    const outPath = join(outDir, baseName)

    await Bun.write(outPath, testCode)
    console.log(`  Generated: ${outPath}`)
    generated++
  }

  console.log(`\n✅ Generated ${generated} test file(s) in ${outDir}`)
  console.log('\nTo run: bun test ' + outDir)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(HELP)
    process.exit(0)
  }

  const { command, positional, options } = parseArgs(args)

  switch (command) {
    case 'test':
      await runTestCommand(positional, options)
      break

    case 'test:bun':
      await runTestBunCommand(positional, options)
      break

    case 'generate':
      await runGenerateCommand(positional, options)
      break

    case 'run':
      await runRunCommand(positional, options)
      break

    case 'eval':
      await runEvalCommand(positional, options)
      break

    case 'dev':
      await runDevCommand(positional, options)
      break

    case 'serve':
      await runServeCommand(positional, options)
      break

    default:
      console.error(`Unknown command: ${command}`)
      console.log(HELP)
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
