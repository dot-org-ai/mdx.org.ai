/**
 * @mdxe/do - Deploy MDX projects to the .do platform
 *
 * The .do platform provides managed serverless deployment with:
 * - Static site hosting
 * - OpenNext SSR support
 * - KV, D1, R2, and Durable Object bindings
 * - Multi-tenant deployments via Workers for Platforms
 * - OAuth-based authentication via oauth.do
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, relative, extname } from 'node:path'
import { execSync } from 'node:child_process'
import { ensureLoggedIn } from 'oauth.do'

export * from './types.js'
export { DoApi, createDoApiFromEnv, DEFAULT_API_URL } from './api.js'

import type { DoDeployOptions, DeployResult, SourceTypeInfo, AssetFile, DeployPayload } from './types.js'
import { DoApi } from './api.js'

/**
 * Content type mapping for common extensions
 */
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

/**
 * Detect project source type
 */
export function detectSourceType(projectDir: string): SourceTypeInfo {
  const dir = resolve(projectDir)
  const pkgPath = join(dir, 'package.json')

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {}
  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  // Check for OpenNext (Next.js on Cloudflare)
  if (deps['@opennextjs/cloudflare']) {
    return {
      isStatic: false,
      adapter: 'opennext',
      framework: 'nextjs',
      outputDir: '.open-next',
    }
  }

  // Check for Next.js
  if (deps.next) {
    const nextConfigPath = join(dir, 'next.config.js')
    const nextConfigMjsPath = join(dir, 'next.config.mjs')
    const configPath = existsSync(nextConfigMjsPath) ? nextConfigMjsPath : nextConfigPath

    let isStatic = false
    if (existsSync(configPath)) {
      const config = readFileSync(configPath, 'utf-8')
      isStatic = config.includes("output: 'export'") || config.includes('output: "export"')
    }

    return {
      isStatic,
      adapter: isStatic ? 'static' : 'opennext',
      framework: 'nextjs',
      outputDir: isStatic ? 'out' : '.next',
    }
  }

  // Check for Astro
  if (deps.astro) {
    const hasCloudflareAdapter = deps['@astrojs/cloudflare']
    return {
      isStatic: !hasCloudflareAdapter,
      adapter: hasCloudflareAdapter ? 'astro-cloudflare' : 'static',
      framework: 'astro',
      outputDir: 'dist',
    }
  }

  // Check for Vite
  if (deps.vite) {
    return {
      isStatic: true,
      adapter: 'static',
      framework: 'vite',
      outputDir: 'dist',
    }
  }

  // Check for Fumadocs
  if (deps.fumadocs || deps['fumadocs-core'] || deps['fumadocs-ui']) {
    return {
      isStatic: false,
      adapter: 'opennext',
      framework: 'fumadocs',
      outputDir: '.next',
    }
  }

  // Default to static
  return {
    isStatic: true,
    adapter: 'static',
    outputDir: 'dist',
  }
}

/**
 * Read files recursively from a directory
 */
function readFilesRecursively(dir: string, basePath = ''): AssetFile[] {
  const files: AssetFile[] = []

  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relativePath = basePath ? `${basePath}/${entry}` : entry
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...readFilesRecursively(fullPath, relativePath))
    } else {
      const ext = extname(entry).toLowerCase()
      const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.webp', '.avif'].includes(ext)

      files.push({
        path: relativePath,
        content: isBinary
          ? readFileSync(fullPath).toString('base64')
          : readFileSync(fullPath, 'utf-8'),
        contentType: CONTENT_TYPES[ext] || 'application/octet-stream',
      })
    }
  }

  return files
}

/**
 * Run a command and return the result
 */
function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options?: { dryRun?: boolean }
): { success: boolean; output?: string; error?: string } {
  if (options?.dryRun) {
    return { success: true, output: `[dry-run] Would run: ${command} ${args.join(' ')}` }
  }

  try {
    const output = execSync(`${command} ${args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { success: true, output }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Command failed',
    }
  }
}

/**
 * Generate a basic static worker script
 */
function generateStaticWorkerScript(): string {
  return `
// Static asset worker - generated by @mdxe/do
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    let path = url.pathname

    // Serve index.html for root
    if (path === '/' || path === '') {
      path = '/index.html'
    }

    // Try to serve from assets
    const asset = env.ASSETS?.get?.(path) || env.__STATIC_CONTENT?.[path]
    if (asset) {
      const contentType = getContentType(path)
      return new Response(asset, {
        headers: { 'Content-Type': contentType }
      })
    }

    // 404
    return new Response('Not Found', { status: 404 })
  }
}

function getContentType(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  const types = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
  }
  return types[ext] || 'application/octet-stream'
}
`.trim()
}

/**
 * Deploy an MDX project to the .do platform
 *
 * @param options - Deployment options
 * @returns Deploy result
 *
 * @example
 * ```ts
 * import { deploy } from '@mdxe/do'
 *
 * const result = await deploy({
 *   projectDir: './my-project',
 *   projectName: 'my-site',
 * })
 *
 * if (result.success) {
 *   console.log(`Deployed to: ${result.url}`)
 * }
 * ```
 */
export async function deploy(options: DoDeployOptions): Promise<DeployResult> {
  const startTime = Date.now()
  const logs: string[] = []
  const projectDir = resolve(options.projectDir)

  logs.push('Deploying to .do platform')

  try {
    // Authenticate
    let token: string
    if (options.dryRun) {
      token = 'dry-run-token'
      logs.push('Skipping authentication (dry run)')
    } else {
      logs.push('Authenticating via oauth.do...')
      const auth = await ensureLoggedIn()
      token = auth.token
      logs.push(auth.isNewLogin ? 'Logged in successfully' : 'Using existing session')
    }

    // Detect source type
    const sourceType = detectSourceType(projectDir)
    logs.push(`Detected: ${sourceType.framework || 'static'} (${sourceType.adapter})`)

    // Determine deployment mode
    const mode = options.mode || (sourceType.isStatic ? 'static' : 'opennext')
    logs.push(`Deployment mode: ${mode}`)

    // Build the project if needed
    if (options.buildCommand || !options.dryRun) {
      logs.push('Building project...')
      const buildCmd = options.buildCommand || 'npm run build'
      const parts = buildCmd.split(' ')
      const cmd = parts[0] || 'npm'
      const args = parts.slice(1)
      const buildResult = runCommand(cmd, args, projectDir, { dryRun: options.dryRun })

      if (!buildResult.success && !options.dryRun) {
        return {
          success: false,
          error: `Build failed: ${buildResult.error}`,
          logs,
          timing: { totalDuration: Date.now() - startTime },
        }
      }
      logs.push('Build completed')
    }

    // Read the worker code
    let workerCode: string
    const workerDir = join(projectDir, '.worker')
    const workerPath = join(workerDir, 'index.js')
    const openNextWorkerPath = join(projectDir, '.open-next', 'worker.js')

    if (mode === 'opennext' && existsSync(openNextWorkerPath)) {
      workerCode = readFileSync(openNextWorkerPath, 'utf-8')
      logs.push('Using OpenNext worker')
    } else if (existsSync(workerPath)) {
      workerCode = readFileSync(workerPath, 'utf-8')
      logs.push('Using existing worker')
    } else {
      // Generate a static worker
      if (!options.dryRun) {
        mkdirSync(workerDir, { recursive: true })
        writeFileSync(workerPath, generateStaticWorkerScript())
      }
      workerCode = generateStaticWorkerScript()
      logs.push('Generated static worker')
    }

    // Collect static assets
    const outputDir = options.outputDir || sourceType.outputDir || 'dist'
    const assetsDir = mode === 'opennext'
      ? join(projectDir, '.open-next', 'assets')
      : join(projectDir, outputDir)

    const assets = existsSync(assetsDir)
      ? readFilesRecursively(assetsDir)
      : []

    logs.push(`Found ${assets.length} static asset(s)`)

    // Prepare deployment payload
    const payload: DeployPayload = {
      name: options.projectName || 'mdxe-worker',
      code: workerCode,
      mode,
      compatibilityDate: options.compatibilityDate ?? new Date().toISOString().slice(0, 10),
      compatibilityFlags: options.compatibilityFlags,
      env: options.env,
      kvNamespaces: options.kvNamespaces,
      d1Databases: options.d1Databases,
      r2Buckets: options.r2Buckets,
      durableObjects: options.durableObjects,
      dispatchNamespace: options.dispatchNamespace,
      tenantId: options.tenantId,
      customDomain: options.customDomain,
      assets,
    }

    // Deploy via API
    const api = new DoApi({
      apiUrl: options.apiUrl,
      token,
    })

    const buildDuration = Date.now() - startTime
    const deployStart = Date.now()

    const result = await api.deploy(payload, { dryRun: options.dryRun })

    const deployDuration = Date.now() - deployStart

    return {
      ...result,
      logs: [...logs, ...(result.logs || [])],
      timing: {
        buildDuration,
        deployDuration,
        totalDuration: Date.now() - startTime,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      timing: { totalDuration: Date.now() - startTime },
    }
  }
}

/**
 * Provider interface for unified deployment
 */
export interface DoProvider {
  readonly platform: 'do'
  readonly name: string
  deploy(options: DoDeployOptions): Promise<DeployResult>
  getWorker?(name: string): Promise<{ success: boolean; worker?: unknown; error?: string }>
  deleteWorker?(name: string): Promise<{ success: boolean; error?: string }>
  listWorkers?(): Promise<{ success: boolean; workers?: unknown[]; error?: string }>
}

/**
 * Create a .do deploy provider
 */
export function createProvider(config?: {
  apiUrl?: string
  token?: string
}): DoProvider {
  const api = new DoApi(config)

  return {
    platform: 'do',
    name: '.do Platform',

    async deploy(options: DoDeployOptions): Promise<DeployResult> {
      return deploy({
        ...options,
        apiUrl: options.apiUrl || config?.apiUrl,
      })
    },

    async getWorker(name: string) {
      return api.getWorker(name)
    },

    async deleteWorker(name: string) {
      return api.deleteWorker(name)
    },

    async listWorkers() {
      return api.listWorkers()
    },
  }
}
