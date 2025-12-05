/**
 * @mdxe/github - Deploy MDX projects to GitHub Pages
 *
 * Supports deployment via:
 * - Direct git push to gh-pages branch
 * - GitHub Actions workflow generation
 * - GitHub API for configuration
 *
 * @packageDocumentation
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, cpSync, rmSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { tmpdir } from 'node:os'
import type { GitHubDeployOptions, DeployResult, RepositoryInfo, GitHubApiConfig } from './types.js'
import { setupPagesActions } from './actions.js'

export * from './types.js'
export { setupPagesActions, generatePagesWorkflow, generateNextJsWorkflow, writeWorkflow } from './actions.js'

/**
 * GitHub API client
 */
class GitHubApi {
  private config: Required<GitHubApiConfig>

  constructor(config: GitHubApiConfig) {
    this.config = {
      token: config.token,
      baseUrl: config.baseUrl || 'https://api.github.com',
      timeout: config.timeout || 30000,
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const url = `${this.config.baseUrl}${path}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.text()
        return { success: false, error: `HTTP ${response.status}: ${error}` }
      }

      const data = await response.json()
      return { success: true, result: data as T }
    } catch (error) {
      clearTimeout(timeoutId)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getRepository(owner: string, repo: string): Promise<{ success: boolean; info?: RepositoryInfo; error?: string }> {
    const response = await this.request<{
      default_branch: string
      has_pages: boolean
      visibility: 'public' | 'private' | 'internal'
      homepage?: string
    }>('GET', `/repos/${owner}/${repo}`)

    if (!response.success) {
      return { success: false, error: response.error }
    }

    return {
      success: true,
      info: {
        owner,
        repo,
        defaultBranch: response.result!.default_branch,
        hasPages: response.result!.has_pages,
        pagesUrl: response.result!.homepage,
        visibility: response.result!.visibility,
      },
    }
  }

  async enablePages(owner: string, repo: string, branch: string = 'gh-pages'): Promise<{ success: boolean; url?: string; error?: string }> {
    const response = await this.request<{ html_url: string }>('POST', `/repos/${owner}/${repo}/pages`, {
      source: {
        branch,
        path: '/',
      },
    })

    return {
      success: response.success,
      url: response.result?.html_url,
      error: response.error,
    }
  }

  async updatePages(owner: string, repo: string, options: { cname?: string; https?: boolean }): Promise<{ success: boolean; error?: string }> {
    const response = await this.request('PUT', `/repos/${owner}/${repo}/pages`, {
      cname: options.cname,
      https_enforced: options.https,
    })

    return { success: response.success, error: response.error }
  }
}

/**
 * Run a git command
 */
function runGit(
  args: string[],
  cwd: string,
  options: { dryRun?: boolean; silent?: boolean } = {}
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    if (options.dryRun) {
      console.log(`[dry-run] git ${args.join(' ')}`)
      resolve({ success: true, output: '' })
      return
    }

    const child = spawn('git', args, {
      cwd,
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
        output: output.trim(),
        error: code !== 0 ? errorOutput || `Git command failed with code ${code}` : undefined,
      })
    })

    child.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message })
    })
  })
}

/**
 * Run a command
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
      resolve({ success: false, output, error: err.message })
    })
  })
}

/**
 * Get repository info from git remote
 */
async function getRepositoryFromGit(projectDir: string): Promise<{ owner: string; repo: string } | null> {
  const result = await runGit(['remote', 'get-url', 'origin'], projectDir, { silent: true })

  if (!result.success) return null

  // Parse git URL (HTTPS or SSH format)
  const url = result.output
  let match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/)

  if (match) {
    return { owner: match[1], repo: match[2].replace('.git', '') }
  }

  return null
}

/**
 * Detect output directory
 */
function detectOutputDir(projectDir: string): string {
  const candidates = ['out', 'dist', '.next/out', 'build', 'public/_site']

  for (const dir of candidates) {
    const fullPath = join(projectDir, dir)
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      return dir
    }
  }

  // Check for Next.js
  if (existsSync(join(projectDir, 'next.config.js')) ||
      existsSync(join(projectDir, 'next.config.mjs'))) {
    return 'out'
  }

  return 'out'
}

/**
 * Copy directory recursively
 */
function copyDir(src: string, dest: string, exclude: string[] = []): void {
  if (!existsSync(src)) return

  mkdirSync(dest, { recursive: true })

  const entries = readdirSync(src)

  for (const entry of entries) {
    if (exclude.includes(entry)) continue

    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath, exclude)
    } else {
      cpSync(srcPath, destPath)
    }
  }
}

/**
 * Deploy using direct git push to gh-pages branch
 */
async function deployWithGit(options: GitHubDeployOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []

  logs.push('Deploying to GitHub Pages via git')

  // Get repository info
  let repoInfo = options.repository
    ? { owner: options.repository.split('/')[0], repo: options.repository.split('/')[1] }
    : await getRepositoryFromGit(projectDir)

  if (!repoInfo) {
    return { success: false, error: 'Could not determine repository. Set repository option or add git remote.', logs }
  }

  logs.push(`Repository: ${repoInfo.owner}/${repoInfo.repo}`)

  // Build first
  const buildCommand = options.buildCommand || 'build'
  logs.push(`Building with: npm run ${buildCommand}`)

  const buildResult = await runCommand('npm', ['run', buildCommand], projectDir, { dryRun: options.dryRun })

  if (!buildResult.success && !options.force) {
    logs.push('Warning: Build may have failed')
  }

  // Determine output directory
  const outputDir = options.outputDir || detectOutputDir(projectDir)
  const outputPath = join(projectDir, outputDir)

  if (!existsSync(outputPath) && !options.dryRun) {
    return { success: false, error: `Output directory '${outputDir}' not found`, logs }
  }

  logs.push(`Deploying from: ${outputDir}`)

  // Create temporary directory for gh-pages branch
  const tempDir = join(tmpdir(), `gh-pages-${Date.now()}`)
  const branch = options.branch || 'gh-pages'

  if (options.dryRun) {
    logs.push(`[dry-run] Would deploy to branch: ${branch}`)
    logs.push(`[dry-run] Files from: ${outputDir}`)
    return { success: true, logs }
  }

  try {
    mkdirSync(tempDir, { recursive: true })

    // Clone just the gh-pages branch (or create it)
    logs.push(`Preparing ${branch} branch...`)

    const cloneResult = await runGit(
      ['clone', '--depth', '1', '--branch', branch, `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`, '.'],
      tempDir,
      { silent: true }
    )

    if (!cloneResult.success) {
      // Branch doesn't exist, create orphan
      await runGit(['init'], tempDir, { silent: true })
      await runGit(['checkout', '--orphan', branch], tempDir, { silent: true })
    }

    // Clean the directory (except .git)
    if (options.clean !== false) {
      const entries = readdirSync(tempDir)
      for (const entry of entries) {
        if (entry === '.git') continue
        if (options.preserve?.includes(entry)) continue
        rmSync(join(tempDir, entry), { recursive: true, force: true })
      }
    }

    // Copy built files
    logs.push('Copying files...')
    copyDir(outputPath, tempDir, ['.git'])

    // Add CNAME file for custom domain
    if (options.customDomain) {
      writeFileSync(join(tempDir, 'CNAME'), options.customDomain)
      logs.push(`Set custom domain: ${options.customDomain}`)
    }

    // Add .nojekyll to disable Jekyll processing
    writeFileSync(join(tempDir, '.nojekyll'), '')

    // Configure git user
    const authorName = options.authorName || 'github-actions[bot]'
    const authorEmail = options.authorEmail || 'github-actions[bot]@users.noreply.github.com'

    await runGit(['config', 'user.name', authorName], tempDir, { silent: true })
    await runGit(['config', 'user.email', authorEmail], tempDir, { silent: true })

    // Stage all files
    await runGit(['add', '-A'], tempDir, { silent: true })

    // Check if there are changes
    const statusResult = await runGit(['status', '--porcelain'], tempDir, { silent: true })

    if (!statusResult.output.trim()) {
      logs.push('No changes to deploy')
      rmSync(tempDir, { recursive: true, force: true })
      return {
        success: true,
        url: `https://${repoInfo.owner}.github.io/${repoInfo.repo}`,
        logs,
      }
    }

    // Commit
    const commitMessage = options.commitMessage || 'Deploy to GitHub Pages'
    await runGit(['commit', '-m', commitMessage], tempDir, { silent: true })

    // Get commit SHA
    const shaResult = await runGit(['rev-parse', 'HEAD'], tempDir, { silent: true })
    const commitSha = shaResult.output.substring(0, 7)

    // Push
    logs.push('Pushing to GitHub...')

    // Use token if provided
    let pushUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`
    if (options.token) {
      pushUrl = `https://x-access-token:${options.token}@github.com/${repoInfo.owner}/${repoInfo.repo}.git`
    }

    const pushResult = await runGit(['push', '-f', pushUrl, `HEAD:${branch}`], tempDir, { silent: true })

    if (!pushResult.success) {
      rmSync(tempDir, { recursive: true, force: true })
      return { success: false, error: `Push failed: ${pushResult.error}`, logs }
    }

    logs.push(`Deployed successfully (${commitSha})`)

    // Cleanup
    rmSync(tempDir, { recursive: true, force: true })

    return {
      success: true,
      url: options.customDomain
        ? `https://${options.customDomain}`
        : `https://${repoInfo.owner}.github.io/${repoInfo.repo}`,
      commitSha,
      logs,
    }
  } catch (error) {
    // Cleanup on error
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs }
  }
}

/**
 * Deploy using GitHub Actions
 */
async function deployWithActions(options: GitHubDeployOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []

  logs.push('Setting up GitHub Actions for deployment')

  try {
    const workflowPath = setupPagesActions(options)
    logs.push(`Created workflow: ${relative(projectDir, workflowPath)}`)

    // Commit and push the workflow
    logs.push('Committing workflow file...')

    if (!options.dryRun) {
      await runGit(['add', '.github/workflows/deploy-pages.yml'], projectDir, { silent: true })
      await runGit(['commit', '-m', 'Add GitHub Pages deployment workflow'], projectDir, { silent: true })
      await runGit(['push'], projectDir, { silent: true })
    }

    logs.push('Workflow pushed. GitHub Actions will deploy on next push.')

    // Get repository info for URL
    const repoInfo = await getRepositoryFromGit(projectDir)
    const url = repoInfo
      ? `https://${repoInfo.owner}.github.io/${repoInfo.repo}`
      : undefined

    return { success: true, url, logs }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs }
  }
}

/**
 * Deploy using managed API
 */
async function deployWithManagedApi(options: GitHubDeployOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []
  logs.push('Using managed API for GitHub Pages deployment')

  const managedApiUrl = process.env.GITHUB_API_URL || 'https://apis.do'

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
    await runCommand('npm', ['run', 'build'], projectDir, { dryRun: options.dryRun })

    const outputDir = options.outputDir || detectOutputDir(projectDir)
    const outputPath = join(projectDir, outputDir)

    // Get repository info
    const repoInfo = options.repository
      ? { owner: options.repository.split('/')[0], repo: options.repository.split('/')[1] }
      : await getRepositoryFromGit(projectDir)

    if (!repoInfo && !options.dryRun) {
      return { success: false, error: 'Could not determine repository', logs }
    }

    // Read files for deployment
    const files: Array<{ path: string; content: string }> = []

    function readDir(dir: string, basePath: string = '') {
      if (!existsSync(dir)) return

      const entries = readdirSync(dir)
      for (const entry of entries) {
        const fullPath = join(dir, entry)
        const relativePath = basePath ? `${basePath}/${entry}` : entry
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          readDir(fullPath, relativePath)
        } else {
          files.push({
            path: relativePath,
            content: readFileSync(fullPath).toString('base64'),
          })
        }
      }
    }

    if (existsSync(outputPath)) {
      readDir(outputPath)
    }

    logs.push(`Found ${files.length} files to deploy`)

    const payload = {
      repository: repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : undefined,
      branch: options.branch || 'gh-pages',
      customDomain: options.customDomain,
      files: files.map(f => ({ path: f.path, content: f.content, encoding: 'base64' })),
    }

    if (options.dryRun) {
      logs.push(`[dry-run] Would POST to ${managedApiUrl}/github/pages`)
      logs.push(`[dry-run] Files: ${files.length}`)
      return { success: true, logs }
    }

    logs.push(`Deploying to ${managedApiUrl}/github/pages...`)

    const response = await fetch(`${managedApiUrl}/github/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json() as { success: boolean; url?: string; commitSha?: string; error?: string }

    if (result.success) {
      logs.push(`Deployment successful${result.url ? `: ${result.url}` : ''}`)
      return { success: true, url: result.url, commitSha: result.commitSha, logs }
    } else {
      throw new Error(result.error || 'Unknown error')
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs }
  }
}

/**
 * Deploy to GitHub Pages
 *
 * @param options - Deployment options
 * @returns Deploy result
 *
 * @example
 * ```ts
 * import { deploy } from '@mdxe/github'
 *
 * const result = await deploy({
 *   projectDir: './my-project',
 *   repository: 'myuser/myrepo',
 * })
 *
 * console.log(result.url)
 * ```
 */
export async function deploy(options: GitHubDeployOptions): Promise<DeployResult> {
  const logs: string[] = []
  logs.push('GitHub Pages deployment starting')

  // Use GitHub Actions if requested
  if (options.useActions) {
    const result = await deployWithActions(options)
    return { ...result, logs: [...logs, ...(result.logs || [])] }
  }

  // Use managed API if no token provided and not using actions
  if (!options.token && process.env.GITHUB_API_URL) {
    const result = await deployWithManagedApi(options)
    return { ...result, logs: [...logs, ...(result.logs || [])] }
  }

  // Default: Direct git push
  const result = await deployWithGit(options)
  return { ...result, logs: [...logs, ...(result.logs || [])] }
}

/**
 * Configure GitHub Pages for a repository
 */
export async function configurePagesApi(options: {
  token: string
  owner: string
  repo: string
  customDomain?: string
  enforceHttps?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const api = new GitHubApi({ token: options.token })

  // Enable Pages
  const enableResult = await api.enablePages(options.owner, options.repo)

  if (!enableResult.success && !enableResult.error?.includes('already exists')) {
    return { success: false, error: enableResult.error }
  }

  // Update configuration if needed
  if (options.customDomain || options.enforceHttps) {
    const updateResult = await api.updatePages(options.owner, options.repo, {
      cname: options.customDomain,
      https: options.enforceHttps,
    })

    if (!updateResult.success) {
      return { success: false, error: updateResult.error }
    }
  }

  return { success: true }
}

/**
 * Provider interface for unified deployment
 */
export interface GitHubProvider {
  readonly platform: 'github'
  readonly name: string
  deploy(options: GitHubDeployOptions): Promise<DeployResult>
  configurePagesApi?(options: {
    owner: string
    repo: string
    customDomain?: string
    enforceHttps?: boolean
  }): Promise<{ success: boolean; error?: string }>
}

/**
 * Create a GitHub deploy provider
 */
export function createProvider(config?: {
  token?: string
}): GitHubProvider {
  const token = config?.token || process.env.GITHUB_TOKEN

  return {
    platform: 'github',
    name: 'GitHub Pages',

    async deploy(options: GitHubDeployOptions): Promise<DeployResult> {
      return deploy({
        ...options,
        token: options.token || token,
      })
    },

    async configurePagesApi(options: {
      owner: string
      repo: string
      customDomain?: string
      enforceHttps?: boolean
    }) {
      if (!token) {
        return { success: false, error: 'GitHub token required' }
      }
      return configurePagesApi({
        ...options,
        token,
      })
    },
  }
}
