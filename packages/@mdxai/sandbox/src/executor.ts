import {
  SandboxBinding,
  SandboxConfig,
  SandboxProcess,
  SandboxResult,
} from './types'

/**
 * Validate a git repository URL to prevent command injection
 *
 * Accepts:
 * - HTTPS URLs: https://github.com/user/repo.git
 * - SSH URLs: git@github.com:user/repo.git
 * - Git protocol: git://github.com/user/repo.git
 *
 * Rejects URLs containing shell metacharacters that could enable command injection.
 */
export function validateGitUrl(url: string): void {
  // Check for shell metacharacters that could enable command injection
  const dangerousChars = /[;&|`$(){}[\]<>\\'"!\n\r\t]/
  if (dangerousChars.test(url)) {
    throw new Error(`Invalid git URL: contains unsafe characters`)
  }

  // Validate URL format
  const validGitUrlPatterns = [
    // HTTPS URLs
    /^https:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](\/[-a-zA-Z0-9._~%]+)+\.git$/,
    /^https:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](\/[-a-zA-Z0-9._~%]+)+$/,
    // SSH URLs
    /^git@[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]:[-a-zA-Z0-9._~%\/]+\.git$/,
    /^git@[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9]:[-a-zA-Z0-9._~%\/]+$/,
    // Git protocol
    /^git:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](\/[-a-zA-Z0-9._~%]+)+\.git$/,
    /^git:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](\/[-a-zA-Z0-9._~%]+)+$/,
  ]

  const isValidUrl = validGitUrlPatterns.some(pattern => pattern.test(url))
  if (!isValidUrl) {
    throw new Error(`Invalid git URL format: ${url}`)
  }
}

/**
 * Validate a git branch name to prevent command injection
 *
 * Git branch names can contain alphanumeric characters, hyphens, underscores,
 * forward slashes (for hierarchical branches), and dots.
 */
export function validateBranchName(branch: string): void {
  // Check for shell metacharacters
  const dangerousChars = /[;&|`$(){}[\]<>\\'"!\n\r\t]/
  if (dangerousChars.test(branch)) {
    throw new Error(`Invalid branch name: contains unsafe characters`)
  }

  // Validate branch name format (alphanumeric, hyphens, underscores, slashes, dots)
  const validBranchPattern = /^[a-zA-Z0-9][-a-zA-Z0-9._\/]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/
  if (!validBranchPattern.test(branch)) {
    throw new Error(`Invalid branch name format: ${branch}`)
  }
}

/**
 * Execute Claude Code in a Cloudflare Sandbox
 *
 * This function:
 * 1. Sets up the sandbox environment (clone repo, write files, etc.)
 * 2. Executes `pnpm claude` with stream-json output
 * 3. Returns a SandboxProcess handle for streaming events
 *
 * @param sandbox - Cloudflare Sandbox binding
 * @param config - Sandbox execution configuration
 * @returns SandboxProcess handle
 */
export async function executeInSandbox(
  sandbox: SandboxBinding,
  config: SandboxConfig
): Promise<SandboxProcess> {
  console.log(`Starting sandbox execution for session ${config.sessionId}`)

  // 1. Clone repository if specified
  if (config.repo) {
    validateGitUrl(config.repo)
    console.log(`Cloning repository: ${config.repo}`)
    await sandbox.exec(
      `git clone ${config.repo} /workspace`,
      { timeout: 60000 }
    )

    // Checkout specific branch if specified
    if (config.branch) {
      validateBranchName(config.branch)
      console.log(`Checking out branch: ${config.branch}`)
      await sandbox.exec(
        `git checkout ${config.branch}`,
        { cwd: '/workspace', timeout: 10000 }
      )
    }
  } else {
    // Create workspace directory
    await sandbox.mkdir('/workspace', { recursive: true })
  }

  // 2. Write initial files
  if (config.files) {
    console.log(`Writing ${Object.keys(config.files).length} initial files`)
    for (const [path, content] of Object.entries(config.files)) {
      const fullPath = `/workspace/${path}`
      await sandbox.writeFile(fullPath, content)
    }
  }

  // 3. Build Claude Code command
  const claudeArgs = [
    'claude',
    '--output-format', 'stream-json',
    '--print', 'assistant,result,tool_use,tool_result',
    '--model', config.model,
    '-p', `"${config.prompt.replace(/"/g, '\\"')}"`,
  ]

  const command = `pnpm ${claudeArgs.join(' ')}`
  console.log(`Executing: ${command}`)

  // 4. Execute Claude Code with streaming
  const proc = await sandbox.exec(command, {
    cwd: config.cwd ? `/workspace/${config.cwd}` : '/workspace',
    env: {
      ...config.env,
      // Ensure Claude Code has necessary env vars
      ANTHROPIC_API_KEY: config.env?.ANTHROPIC_API_KEY || '',
    },
    stream: true,
    timeout: config.timeout,
  })

  console.log(`Sandbox process started: PID ${proc.pid}`)

  return proc
}

/**
 * Execute Claude Code in sandbox and wait for completion
 *
 * This is a convenience function that executes Claude Code and waits
 * for the process to complete, returning a SandboxResult.
 *
 * @param sandbox - Cloudflare Sandbox binding
 * @param config - Sandbox execution configuration
 * @returns SandboxResult with execution details
 */
export async function executeAndWait(
  sandbox: SandboxBinding,
  config: SandboxConfig
): Promise<SandboxResult> {
  const startedAt = new Date()

  try {
    const proc = await executeInSandbox(sandbox, config)
    const exitCode = await proc.exitCode
    const completedAt = new Date()

    return {
      sessionId: config.sessionId,
      exitCode,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
    }
  } catch (error) {
    const completedAt = new Date()

    return {
      sessionId: config.sessionId,
      exitCode: 1,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Kill a running sandbox process
 *
 * @param proc - Sandbox process to kill
 */
export async function killSandboxProcess(
  proc: SandboxProcess
): Promise<void> {
  console.log(`Killing sandbox process: PID ${proc.pid}`)
  await proc.kill()
}

/**
 * Setup sandbox environment without executing Claude Code
 *
 * This can be used to prepare a sandbox for manual inspection or
 * for running multiple commands sequentially.
 *
 * @param sandbox - Cloudflare Sandbox binding
 * @param config - Sandbox configuration (without prompt)
 */
export async function setupSandbox(
  sandbox: SandboxBinding,
  config: Omit<SandboxConfig, 'prompt'>
): Promise<void> {
  // Clone repository if specified
  if (config.repo) {
    validateGitUrl(config.repo)
    await sandbox.exec(`git clone ${config.repo} /workspace`, {
      timeout: 60000,
    })

    if (config.branch) {
      validateBranchName(config.branch)
      await sandbox.exec(`git checkout ${config.branch}`, {
        cwd: '/workspace',
        timeout: 10000,
      })
    }
  } else {
    await sandbox.mkdir('/workspace', { recursive: true })
  }

  // Write initial files
  if (config.files) {
    for (const [path, content] of Object.entries(config.files)) {
      const fullPath = `/workspace/${path}`
      await sandbox.writeFile(fullPath, content)
    }
  }
}
