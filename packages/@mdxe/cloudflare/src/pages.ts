/**
 * @mdxe/cloudflare - Cloudflare Pages Deployment
 *
 * Deploy MDX projects to Cloudflare Pages with support for:
 * - Static site generation
 * - Branch deployments
 * - Direct API uploads
 *
 * @packageDocumentation
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { CloudflarePagesOptions, DeployResult } from './types.js'
import { CloudflareApi } from './api.js'

/**
 * Check if wrangler is installed
 */
function checkWrangler(): boolean {
  const result = spawnSync('npx', ['wrangler', '--version'], {
    stdio: 'pipe',
    shell: true,
  })
  return result.status === 0
}

/**
 * Run a command and return the result
 */
function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options: { dryRun?: boolean; silent?: boolean } = {}
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    if (options.dryRun) {
      console.log(`[dry-run] ${command} ${args.join(' ')}`)
      resolve({ success: true, output: '' })
      return
    }

    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: options.silent ? 'pipe' : 'inherit',
    })

    let output = ''
    let errorOutput = ''

    if (options.silent) {
      child.stdout?.on('data', (data) => {
        output += data.toString()
      })
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })
    }

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: code !== 0 ? errorOutput || `Command exited with code ${code}` : undefined,
      })
    })

    child.on('error', (err) => {
      resolve({
        success: false,
        output,
        error: err.message,
      })
    })
  })
}

/**
 * Read directory recursively and return all files as buffers
 */
function readAssetsRecursively(
  dir: string,
  basePath: string = ''
): Array<{ path: string; content: Buffer }> {
  const files: Array<{ path: string; content: Buffer }> = []

  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relativePath = basePath ? `${basePath}/${entry}` : entry
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...readAssetsRecursively(fullPath, relativePath))
    } else {
      files.push({
        path: relativePath,
        content: readFileSync(fullPath),
      })
    }
  }

  return files
}

/**
 * Detect output directory for the project
 */
function detectOutputDir(projectDir: string): string {
  // Check for common output directories
  const candidates = ['out', 'dist', '.next/out', 'build', 'public']

  for (const dir of candidates) {
    const fullPath = join(projectDir, dir)
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      return dir
    }
  }

  // Check package.json for hints
  const pkgPath = join(projectDir, 'package.json')
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    // Check for Next.js with static export
    if (pkg.dependencies?.next || pkg.devDependencies?.next) {
      return 'out'
    }

    // Check for Vite
    if (pkg.dependencies?.vite || pkg.devDependencies?.vite) {
      return 'dist'
    }
  }

  return 'out'
}

/**
 * Create Cloudflare API client from options
 */
function createApiClient(options: CloudflarePagesOptions): CloudflareApi {
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = options.apiToken || process.env.CLOUDFLARE_API_TOKEN

  if (!accountId) {
    throw new Error('Cloudflare account ID is required. Set accountId option or CLOUDFLARE_ACCOUNT_ID env var.')
  }
  if (!apiToken) {
    throw new Error('Cloudflare API token is required. Set apiToken option or CLOUDFLARE_API_TOKEN env var.')
  }

  return new CloudflareApi({
    accountId,
    apiToken,
    baseUrl: options.apiBaseUrl,
    headers: options.apiHeaders,
  })
}

/**
 * Deploy using wrangler pages deploy
 */
async function deployWithWrangler(options: CloudflarePagesOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []

  logs.push('Deploying to Cloudflare Pages via wrangler')

  // Build the project first
  if (options.buildCommand) {
    logs.push(`Building with: ${options.buildCommand}`)
    const buildResult = await runCommand('npm', ['run', options.buildCommand.replace('npm run ', '')], projectDir, {
      dryRun: options.dryRun,
    })

    if (!buildResult.success) {
      return { success: false, error: `Build failed: ${buildResult.error}`, logs, type: 'pages' }
    }
    logs.push('Build completed successfully')
  } else {
    // Try default build command
    logs.push('Building project...')
    const buildResult = await runCommand('npm', ['run', 'build'], projectDir, { dryRun: options.dryRun })

    if (!buildResult.success) {
      logs.push('Warning: Build command failed, proceeding with existing files')
    } else {
      logs.push('Build completed successfully')
    }
  }

  const outputDir = options.outputDir || detectOutputDir(projectDir)
  const outputPath = join(projectDir, outputDir)

  if (!existsSync(outputPath)) {
    return {
      success: false,
      error: `Output directory '${outputDir}' not found. Did the build complete successfully?`,
      logs,
      type: 'pages',
    }
  }

  logs.push(`Deploying from: ${outputDir}`)

  const deployArgs = ['wrangler', 'pages', 'deploy', outputDir]

  if (options.projectName) {
    deployArgs.push('--project-name', options.projectName)
  }

  if (options.branch) {
    deployArgs.push('--branch', options.branch)
  }

  if (options.dryRun) {
    logs.push(`[dry-run] Would deploy ${outputDir} to Cloudflare Pages`)
    return { success: true, logs, type: 'pages' }
  }

  const deployResult = await runCommand('npx', deployArgs, projectDir, { silent: true })

  if (!deployResult.success) {
    return { success: false, error: `Deployment failed: ${deployResult.error}`, logs, type: 'pages' }
  }

  // Extract URL from output
  const urlMatch = deployResult.output.match(/https:\/\/[^\s]+\.pages\.dev/)
  const url = urlMatch ? urlMatch[0] : undefined

  // Extract deployment ID
  const idMatch = deployResult.output.match(/Deployment ID:\s*(\S+)/)
  const deploymentId = idMatch ? idMatch[1] : undefined

  logs.push(`Deployment successful${url ? `: ${url}` : ''}`)

  return { success: true, url, deploymentId, logs, type: 'pages' }
}

/**
 * Deploy using direct Cloudflare API
 */
async function deployWithApi(options: CloudflarePagesOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []

  logs.push('Deploying to Cloudflare Pages via API')

  try {
    const api = createApiClient(options)
    const projectName = options.projectName || 'mdxe-pages'

    // Build first
    if (options.buildCommand) {
      logs.push(`Building with: ${options.buildCommand}`)
      const buildResult = await runCommand('npm', ['run', options.buildCommand.replace('npm run ', '')], projectDir, {
        dryRun: options.dryRun,
      })

      if (!buildResult.success) {
        return { success: false, error: `Build failed: ${buildResult.error}`, logs, type: 'pages' }
      }
    } else {
      logs.push('Building project...')
      await runCommand('npm', ['run', 'build'], projectDir, { dryRun: options.dryRun })
    }
    logs.push('Build completed')

    const outputDir = options.outputDir || detectOutputDir(projectDir)
    const outputPath = join(projectDir, outputDir)

    if (!existsSync(outputPath) && !options.dryRun) {
      return { success: false, error: `Output directory '${outputDir}' not found`, logs, type: 'pages' }
    }

    // Read all assets
    const assets = existsSync(outputPath) ? readAssetsRecursively(outputPath) : []
    logs.push(`Found ${assets.length} files to deploy`)

    if (options.dryRun) {
      logs.push(`[dry-run] Would create Pages project: ${projectName}`)
      logs.push(`[dry-run] Would upload ${assets.length} files`)
      return { success: true, logs, type: 'pages' }
    }

    // Create project if it doesn't exist (API will handle if it already exists)
    logs.push(`Creating/updating Pages project: ${projectName}`)
    await api.createPagesProject(projectName, {
      productionBranch: options.productionBranch || 'main',
      buildCommand: options.buildCommand,
      destinationDir: outputDir,
    })

    // Create deployment
    logs.push('Uploading files...')
    const result = await api.createPagesDeployment(projectName, assets, {
      branch: options.branch,
    })

    if (!result.success) {
      return { success: false, error: `Deployment failed: ${result.errors?.map(e => e.message).join(', ')}`, logs, type: 'pages' }
    }

    logs.push(`Deployment successful${result.url ? `: ${result.url}` : ''}`)

    return { success: true, url: result.url, deploymentId: result.id, logs, type: 'pages' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs, type: 'pages' }
  }
}

/**
 * Deploy using managed workers.do API
 */
async function deployWithManagedApi(options: CloudflarePagesOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []
  logs.push('Using managed workers.do API for Pages deployment')

  const managedApiUrl = options.managedApiUrl || process.env.WORKERS_API_URL || 'https://apis.do'

  try {
    let token: string
    if (options.dryRun) {
      token = 'dry-run-token'
      logs.push('Skipping authentication (dry run)')
    } else {
      logs.push('Authenticating via oauth.do...')
      const { ensureLoggedIn } = await import('oauth.do')
      const auth = await ensureLoggedIn()
      token = auth.token
      logs.push(auth.isNewLogin ? 'Logged in successfully' : 'Using existing session')
    }

    // Build first
    logs.push('Building project...')
    const buildResult = await runCommand('npm', ['run', 'build'], projectDir, { dryRun: options.dryRun })

    if (!buildResult.success) {
      logs.push('Warning: Build may have failed')
    }

    const outputDir = options.outputDir || detectOutputDir(projectDir)
    const outputPath = join(projectDir, outputDir)

    const assets = existsSync(outputPath) ? readAssetsRecursively(outputPath) : []
    logs.push(`Found ${assets.length} files to deploy`)

    const payload = {
      name: options.projectName || 'mdxe-pages',
      type: 'pages',
      branch: options.branch || 'main',
      productionBranch: options.productionBranch || 'main',
      assets: assets.map(a => ({
        path: a.path,
        content: a.content.toString('base64'),
        encoding: 'base64',
      })),
      env: options.env,
    }

    if (options.dryRun) {
      logs.push(`[dry-run] Would POST to ${managedApiUrl}/pages`)
      logs.push(`[dry-run] Project name: ${payload.name}`)
      logs.push(`[dry-run] Files: ${assets.length}`)
      return { success: true, logs, type: 'pages' }
    }

    logs.push(`Deploying to ${managedApiUrl}/pages...`)

    const response = await fetch(`${managedApiUrl}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json() as { success: boolean; url?: string; deploymentId?: string; error?: string }

    if (result.success) {
      logs.push(`Deployment successful${result.url ? `: ${result.url}` : ''}`)
      return { success: true, url: result.url, deploymentId: result.deploymentId, logs, type: 'pages' }
    } else {
      throw new Error(result.error || 'Unknown error')
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs, type: 'pages' }
  }
}

/**
 * Deploy to Cloudflare Pages
 *
 * @param options - Deployment options
 * @returns Deploy result
 *
 * @example
 * ```ts
 * import { deployToPages } from '@mdxe/cloudflare/pages'
 *
 * const result = await deployToPages({
 *   projectDir: './my-project',
 *   projectName: 'my-site',
 *   branch: 'main',
 * })
 *
 * console.log(result.url)
 * ```
 */
export async function deployToPages(options: CloudflarePagesOptions): Promise<DeployResult> {
  const logs: string[] = []
  logs.push('Deploying to Cloudflare Pages')

  // Use managed API by default
  if (options.useManagedApi !== false && !options.useApi) {
    const result = await deployWithManagedApi(options)
    return { ...result, logs: [...logs, ...(result.logs || [])] }
  }

  // Use direct Cloudflare API if requested
  if (options.useApi) {
    const result = await deployWithApi(options)
    return { ...result, logs: [...logs, ...(result.logs || [])] }
  }

  // Use wrangler CLI
  if (!checkWrangler()) {
    return { success: false, error: 'wrangler is not installed. Install it with: npm install -D wrangler', logs, type: 'pages' }
  }
  logs.push('wrangler found')

  const result = await deployWithWrangler(options)
  return { ...result, logs: [...logs, ...(result.logs || [])] }
}

export { detectOutputDir }
