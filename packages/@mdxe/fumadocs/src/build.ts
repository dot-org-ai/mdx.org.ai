/**
 * Build command for Fumadocs
 *
 * Handles building with Next.js and OpenNext for Cloudflare deployment.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createLogger, type Logger } from '@mdxe/test-utils/logging'
import { detectDocsType, type DocsDetectionResult } from './detect.js'
import { scaffoldFumadocs, getFumadocsOutputDir, needsScaffolding } from './scaffold.js'

// Create a module-level logger with the [mdxe] prefix
const log = createLogger({ level: 'info', prefix: '[mdxe]' })

/**
 * Options for building
 */
export interface BuildOptions {
  /** Project directory */
  projectDir: string
  /** Build for deployment (uses OpenNext) */
  deploy?: boolean
  /** Force regeneration of scaffold */
  force?: boolean
  /** Verbose logging */
  verbose?: boolean
}

/**
 * Result of build
 */
export interface BuildResult {
  /** Whether build was successful */
  success: boolean
  /** Path to build output */
  outputDir: string
  /** Build logs */
  logs: string[]
  /** Any errors */
  error?: string
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
): { success: boolean; output: string } {
  if (options.verbose) {
    log.debug('Running command', { command, args: args.join(' '), cwd })
  }

  const result = spawnSync(command, args, {
    cwd,
    stdio: options.verbose ? 'inherit' : 'pipe',
    shell: true,
    encoding: 'utf-8',
  })

  return {
    success: result.status === 0,
    output: result.stdout || '',
  }
}

/**
 * Install dependencies in the fumadocs app directory
 */
async function installDependencies(
  fumadocsDir: string,
  packageManager: string,
  options: { verbose?: boolean } = {}
): Promise<boolean> {
  log.info('Installing dependencies...', { packageManager, dir: fumadocsDir })

  const installArgs = packageManager === 'npm' ? ['install'] : ['install']

  const result = runSync(packageManager, installArgs, fumadocsDir, options)
  return result.success
}

/**
 * Run fumadocs-mdx postinstall to generate types
 */
async function runPostinstall(
  fumadocsDir: string,
  packageManager: string,
  options: { verbose?: boolean } = {}
): Promise<boolean> {
  log.info('Generating Fumadocs types...', { dir: fumadocsDir })

  const npx = packageManager === 'npm' ? 'npx' : packageManager === 'pnpm' ? 'pnpx' : 'npx'

  const result = runSync(npx, ['fumadocs-mdx'], fumadocsDir, options)
  return result.success
}

/**
 * Build the Fumadocs app
 *
 * This is the main entry point for `mdxe build` when Docs type is detected.
 */
export async function buildFumadocs(options: BuildOptions): Promise<BuildResult> {
  const { projectDir, deploy = false, force = false, verbose = false } = options

  const result: BuildResult = {
    success: false,
    outputDir: '',
    logs: [],
  }

  // Detect docs type
  const detection = detectDocsType(projectDir)

  if (!detection.isDocsType) {
    result.error = 'Not a Docs type project. Expected $type: Docs in index.mdx'
    return result
  }

  log.info('Building Fumadocs site...', { title: detection.config.title || detection.projectName })

  // Get output directory
  const fumadocsDir = getFumadocsOutputDir(projectDir)
  result.outputDir = fumadocsDir

  // Check if scaffolding is needed
  if (force || needsScaffolding(projectDir)) {
    const scaffoldResult = await scaffoldFumadocs({
      projectDir,
      outputDir: fumadocsDir,
      detection,
      force,
      verbose,
    })

    if (!scaffoldResult.success) {
      result.error = 'Scaffolding failed'
      return result
    }

    result.logs.push(`Scaffolded ${scaffoldResult.created.length} files`)
  }

  // Detect package manager
  const packageManager = detectPackageManager(projectDir)

  // Install dependencies if node_modules doesn't exist
  const nodeModulesDir = join(fumadocsDir, 'node_modules')
  if (!existsSync(nodeModulesDir)) {
    const installed = await installDependencies(fumadocsDir, packageManager, { verbose })
    if (!installed) {
      result.error = 'Failed to install dependencies'
      return result
    }
    result.logs.push('Installed dependencies')
  }

  // Run fumadocs-mdx to generate types if .source doesn't exist
  const sourceDir = join(fumadocsDir, '.source')
  if (!existsSync(sourceDir)) {
    const generated = await runPostinstall(fumadocsDir, packageManager, { verbose })
    if (!generated) {
      log.warn('Failed to generate types. Continuing anyway...')
    }
    result.logs.push('Generated types')
  }

  const npx = packageManager === 'npm' ? 'npx' : packageManager === 'pnpm' ? 'pnpx' : 'npx'

  // Build with Next.js
  log.info('Running Next.js build...')

  const buildResult = runSync(npx, ['next', 'build'], fumadocsDir, { verbose })

  if (!buildResult.success) {
    result.error = 'Next.js build failed'
    return result
  }

  result.logs.push('Next.js build complete')

  // If deploying, also run OpenNext build
  if (deploy) {
    log.info('Running OpenNext build...')

    const openNextResult = runSync(npx, ['opennextjs-cloudflare', 'build'], fumadocsDir, { verbose })

    if (!openNextResult.success) {
      result.error = 'OpenNext build failed'
      return result
    }

    result.logs.push('OpenNext build complete')
    result.outputDir = join(fumadocsDir, '.open-next')
  }

  result.success = true
  log.info('Build complete!', { outputDir: result.outputDir })

  return result
}

/**
 * Deploy the Fumadocs app to Cloudflare
 *
 * This builds with OpenNext and deploys using wrangler.
 */
export async function deployFumadocs(options: BuildOptions): Promise<BuildResult> {
  const { projectDir, force = false, verbose = false } = options

  // First, build for deployment
  const buildResult = await buildFumadocs({
    projectDir,
    deploy: true,
    force,
    verbose,
  })

  if (!buildResult.success) {
    return buildResult
  }

  const fumadocsDir = getFumadocsOutputDir(projectDir)
  const packageManager = detectPackageManager(projectDir)
  const npx = packageManager === 'npm' ? 'npx' : packageManager === 'pnpm' ? 'pnpx' : 'npx'

  log.info('Deploying to Cloudflare...')

  const deployResult = runSync(npx, ['wrangler', 'deploy'], fumadocsDir, { verbose })

  if (!deployResult.success) {
    buildResult.error = 'Wrangler deploy failed'
    buildResult.success = false
    return buildResult
  }

  buildResult.logs.push('Deployed to Cloudflare')
  log.info('Deployment complete!')

  return buildResult
}

export type { DocsDetectionResult }
