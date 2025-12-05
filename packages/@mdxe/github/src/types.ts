/**
 * @mdxe/github - Type Definitions
 *
 * @packageDocumentation
 */

/**
 * GitHub Pages deployment options
 */
export interface GitHubDeployOptions {
  /** Project directory to deploy */
  projectDir: string

  /** Repository in format owner/repo */
  repository?: string

  /** Branch to deploy from (default: gh-pages) */
  branch?: string

  /** Source branch for content (default: main) */
  sourceBranch?: string

  /** Output directory to deploy */
  outputDir?: string

  /** Build command to run */
  buildCommand?: string

  /** GitHub token for API access */
  token?: string

  /** Custom domain for GitHub Pages */
  customDomain?: string

  /** Enable HTTPS enforcement */
  enforceHttps?: boolean

  /** Commit message for deployment */
  commitMessage?: string

  /** Author name for commits */
  authorName?: string

  /** Author email for commits */
  authorEmail?: string

  /** Clean the target branch before deploying */
  clean?: boolean

  /** Preserve certain files when cleaning */
  preserve?: string[]

  /** Dry run mode */
  dryRun?: boolean

  /** Force deployment even with uncommitted changes */
  force?: boolean

  /** Use GitHub Actions instead of direct push */
  useActions?: boolean

  /** Path prefix for GitHub Pages (e.g., /repo-name/) */
  basePath?: string
}

/**
 * GitHub API configuration
 */
export interface GitHubApiConfig {
  /** GitHub personal access token */
  token: string

  /** GitHub API base URL */
  baseUrl?: string

  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Deploy result
 */
export interface DeployResult {
  /** Whether deployment succeeded */
  success: boolean

  /** Deployment URL */
  url?: string

  /** Commit SHA */
  commitSha?: string

  /** Error message if failed */
  error?: string

  /** Build/deployment logs */
  logs?: string[]
}

/**
 * Repository info
 */
export interface RepositoryInfo {
  owner: string
  repo: string
  defaultBranch: string
  hasPages: boolean
  pagesUrl?: string
  visibility: 'public' | 'private' | 'internal'
}

/**
 * GitHub Pages configuration
 */
export interface PagesConfig {
  source: {
    branch: string
    path: '/' | '/docs'
  }
  cname?: string
  https?: boolean
  buildType?: 'legacy' | 'workflow'
}

/**
 * GitHub Actions workflow for Pages
 */
export interface ActionsWorkflow {
  name: string
  on: {
    push?: { branches: string[] }
    workflow_dispatch?: Record<string, unknown>
  }
  permissions?: {
    contents?: string
    pages?: string
    'id-token'?: string
  }
  jobs: Record<string, WorkflowJob>
}

/**
 * Workflow job definition
 */
export interface WorkflowJob {
  'runs-on': string
  environment?: {
    name: string
    url?: string
  }
  steps: WorkflowStep[]
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  name?: string
  uses?: string
  with?: Record<string, unknown>
  run?: string
  env?: Record<string, string>
  id?: string
}
