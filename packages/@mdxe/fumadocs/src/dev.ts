/**
 * Development server for Fumadocs
 *
 * Handles scaffolding, dependency installation, and running Next.js dev server.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { detectDocsType, type DocsDetectionResult } from './detect.js'
import { scaffoldFumadocs, getFumadocsOutputDir, needsScaffolding } from './scaffold.js'

/**
 * Options for running dev server
 */
export interface DevOptions {
  /** Project directory */
  projectDir: string
  /** Port to run on */
  port?: number
  /** Host to bind to */
  host?: string
  /** Force regeneration of scaffold */
  force?: boolean
  /** Verbose logging */
  verbose?: boolean
}

/**
 * Detect package manager
 */
function detectPackageManager(projectDir: string): 'pnpm' | 'npm' | 'yarn' | 'bun' {
  if (existsSync(join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(projectDir, 'bun.lockb'))) return 'bun'
  if (existsSync(join(projectDir, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

/**
 * Run a command synchronously
 */
function runSync(
  command: string,
  args: string[],
  cwd: string,
  options: { verbose?: boolean } = {}
): boolean {
  if (options.verbose) {
    console.log(`[mdxe] Running: ${command} ${args.join(' ')}`)
  }

  const result = spawnSync(command, args, {
    cwd,
    stdio: options.verbose ? 'inherit' : 'pipe',
    shell: true,
  })

  return result.status === 0
}

/**
 * Run a command and stream output
 */
function runStream(
  command: string,
  args: string[],
  cwd: string,
  options: { verbose?: boolean } = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    if (options.verbose) {
      console.log(`[mdxe] Running: ${command} ${args.join(' ')}`)
    }

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    })

    child.on('close', (code) => {
      resolve(code === 0)
    })

    child.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Install dependencies in the fumadocs app directory
 */
async function installDependencies(
  fumadocsDir: string,
  packageManager: string,
  options: { verbose?: boolean } = {}
): Promise<boolean> {
  console.log(`[mdxe] Installing dependencies...`)

  const installArgs = packageManager === 'npm' ? ['install'] : ['install']

  return runSync(packageManager, installArgs, fumadocsDir, options)
}

/**
 * Run fumadocs-mdx postinstall to generate types
 */
async function runPostinstall(
  fumadocsDir: string,
  packageManager: string,
  options: { verbose?: boolean } = {}
): Promise<boolean> {
  console.log(`[mdxe] Generating Fumadocs types...`)

  // Run fumadocs-mdx directly
  const npx = packageManager === 'npm' ? 'npx' : packageManager === 'pnpm' ? 'pnpx' : 'npx'

  return runSync(npx, ['fumadocs-mdx'], fumadocsDir, options)
}

/**
 * Run the Fumadocs dev server
 *
 * This is the main entry point for `mdxe dev` when Docs type is detected.
 */
export async function runFumadocsDev(options: DevOptions): Promise<void> {
  const { projectDir, port = 3000, host = 'localhost', force = false, verbose = false } = options

  // Detect docs type
  const detection = detectDocsType(projectDir)

  if (!detection.isDocsType) {
    throw new Error('Not a Docs type project. Expected $type: Docs in index.mdx')
  }

  console.log(`[mdxe] Detected $type: Docs`)
  console.log(`[mdxe] Title: ${detection.config.title || detection.projectName}`)

  // Get output directory
  const fumadocsDir = getFumadocsOutputDir(projectDir)

  // Check if scaffolding is needed
  if (force || needsScaffolding(projectDir)) {
    const result = await scaffoldFumadocs({
      projectDir,
      outputDir: fumadocsDir,
      detection,
      force,
      verbose,
    })

    if (!result.success) {
      throw new Error('Scaffolding failed')
    }
  }

  // Detect package manager
  const packageManager = detectPackageManager(projectDir)

  // Install dependencies if node_modules doesn't exist
  const nodeModulesDir = join(fumadocsDir, 'node_modules')
  if (!existsSync(nodeModulesDir)) {
    const installed = await installDependencies(fumadocsDir, packageManager, { verbose })
    if (!installed) {
      throw new Error('Failed to install dependencies')
    }
  }

  // Run fumadocs-mdx to generate types if .source doesn't exist
  const sourceDir = join(fumadocsDir, '.source')
  if (!existsSync(sourceDir)) {
    const generated = await runPostinstall(fumadocsDir, packageManager, { verbose })
    if (!generated) {
      console.warn('[mdxe] Warning: Failed to generate types. Continuing anyway...')
    }
  }

  // Start Next.js dev server
  console.log(`[mdxe] Starting dev server on http://${host}:${port}`)

  const nextArgs = ['next', 'dev', '--port', String(port)]
  if (host !== 'localhost') {
    nextArgs.push('--hostname', host)
  }

  const npx = packageManager === 'npm' ? 'npx' : packageManager === 'pnpm' ? 'pnpx' : 'npx'

  await runStream(npx, nextArgs, fumadocsDir, { verbose })
}

/**
 * Check if a project is a Docs type project
 */
export function isDocsProject(projectDir: string): boolean {
  const detection = detectDocsType(projectDir)
  return detection.isDocsType
}

export type { DocsDetectionResult }
