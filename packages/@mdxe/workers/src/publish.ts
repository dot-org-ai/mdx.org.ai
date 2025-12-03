/**
 * @mdxe/workers Publish
 *
 * Publish namespace bundles to Cloudflare Workers using wrangler
 *
 * @packageDocumentation
 */

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import type { NamespaceBundle, PublishOptions, PublishResult } from './types.js'

/**
 * Run a command and return stdout/stderr
 */
function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: Record<string, string> }
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr })
    })

    proc.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: err.message })
    })
  })
}

/**
 * Generate wrangler.jsonc configuration
 */
function generateWranglerConfig(options: {
  name: string
  accountId?: string
  compatibilityDate: string
  compatibilityFlags?: string[]
  hasAssets: boolean
  env?: Record<string, string>
}): string {
  const config: Record<string, unknown> = {
    $schema: 'https://cdn.jsdelivr.net/npm/wrangler@latest/config-schema.json',
    name: options.name,
    main: 'worker.js',
    compatibility_date: options.compatibilityDate,
  }

  if (options.accountId) {
    config.account_id = options.accountId
  }

  if (options.compatibilityFlags?.length) {
    config.compatibility_flags = options.compatibilityFlags
  }

  if (options.hasAssets) {
    config.assets = { directory: './public' }
  }

  if (options.env && Object.keys(options.env).length > 0) {
    config.vars = options.env
  }

  return JSON.stringify(config, null, 2)
}

/**
 * Publish a namespace bundle to Cloudflare Workers using wrangler
 *
 * @example
 * ```ts
 * import { build, publish } from '@mdxe/workers'
 *
 * // Build the project
 * const buildResult = await build({ projectDir: './my-site' })
 *
 * // Publish to Cloudflare Workers
 * const publishResult = await publish(buildResult.bundle!, {
 *   namespace: 'my-site',
 *   accountId: 'your-account-id',
 *   contentStorage: 'assets',
 * })
 * ```
 */
export async function publish(bundle: NamespaceBundle, options: PublishOptions): Promise<PublishResult> {
  const startTime = Date.now()
  const logs: string[] = []

  const { namespace, accountId, contentStorage = 'embedded', dryRun, verbose } = options

  try {
    // Create temp directory for deployment
    const deployDir = join(tmpdir(), `mdxe-deploy-${namespace}-${Date.now()}`)
    mkdirSync(deployDir, { recursive: true })

    logs.push(`Preparing deployment in ${deployDir}`)

    // Write worker code
    const workerPath = join(deployDir, 'worker.js')
    writeFileSync(workerPath, bundle.worker.main)
    logs.push(`Worker: ${bundle.worker.main.length} bytes`)

    // Write assets if using static assets
    const hasAssets = contentStorage === 'assets' && bundle.assets
    if (hasAssets && bundle.assets) {
      const publicDir = join(deployDir, 'public')
      mkdirSync(publicDir, { recursive: true })

      let assetCount = 0
      for (const [path, file] of Object.entries(bundle.assets.files)) {
        // Remove leading slash for file path
        const filePath = path.startsWith('/') ? path.slice(1) : path
        const fullPath = join(publicDir, filePath)

        // Ensure directory exists
        const dir = dirname(fullPath)
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }

        writeFileSync(fullPath, file.content)
        assetCount++
      }

      logs.push(`Assets: ${assetCount} files`)
    }

    // Generate wrangler.jsonc
    const wranglerConfig = generateWranglerConfig({
      name: namespace,
      accountId,
      compatibilityDate: bundle.meta.config.compatibilityDate,
      compatibilityFlags: bundle.meta.config.compatibilityFlags,
      hasAssets: !!hasAssets,
      env: options.env,
    })

    const configPath = join(deployDir, 'wrangler.jsonc')
    writeFileSync(configPath, wranglerConfig)

    if (verbose) {
      logs.push(`Config: ${wranglerConfig}`)
    }

    if (dryRun) {
      logs.push('[DRY RUN] Would run: wrangler deploy')
      logs.push(`[DRY RUN] Worker size: ${bundle.worker.main.length} bytes`)
      logs.push(`[DRY RUN] Content documents: ${bundle.content.count}`)

      // Clean up
      rmSync(deployDir, { recursive: true, force: true })

      return {
        success: true,
        logs,
        duration: Date.now() - startTime,
        contentHash: bundle.content.hash,
      }
    }

    // Run wrangler deploy
    logs.push('Running wrangler deploy...')

    const result = await runCommand('npx', ['wrangler', 'deploy'], {
      cwd: deployDir,
    })

    if (verbose || result.code !== 0) {
      if (result.stdout) logs.push(`stdout: ${result.stdout}`)
      if (result.stderr) logs.push(`stderr: ${result.stderr}`)
    }

    // Clean up temp directory
    rmSync(deployDir, { recursive: true, force: true })

    if (result.code !== 0) {
      return {
        success: false,
        error: `wrangler deploy failed with code ${result.code}`,
        logs,
        duration: Date.now() - startTime,
      }
    }

    // Extract URL from wrangler output
    const urlMatch = result.stdout.match(/https:\/\/[^\s]+\.workers\.dev/)
    const url = urlMatch?.[0]

    const duration = Date.now() - startTime
    logs.push(`Published in ${duration}ms`)
    if (url) {
      logs.push(`URL: ${url}`)
    }

    return {
      success: true,
      url,
      scriptId: namespace,
      contentHash: bundle.content.hash,
      logs,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Build and publish in one step (convenience function)
 */
export async function buildAndPublish(
  projectDir: string,
  options: PublishOptions & { minify?: boolean; sourceMaps?: boolean }
): Promise<PublishResult> {
  // Import build dynamically to avoid circular dependency
  const { build } = await import('./build.js')

  const buildResult = await build({
    projectDir,
    minify: options.minify ?? true,
    sourceMaps: options.sourceMaps ?? false,
    contentStorage: options.contentStorage,
  })

  if (!buildResult.success || !buildResult.bundle) {
    return {
      success: false,
      error: buildResult.error || 'Build failed',
      logs: buildResult.logs,
      duration: buildResult.duration,
    }
  }

  return publish(buildResult.bundle, options)
}
