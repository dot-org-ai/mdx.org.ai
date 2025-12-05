/**
 * @mdxe/github - GitHub Actions Workflow Generator
 *
 * Generate GitHub Actions workflows for deploying to GitHub Pages
 *
 * @packageDocumentation
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { ActionsWorkflow, GitHubDeployOptions } from './types.js'

/**
 * Generate a GitHub Actions workflow for deploying to Pages
 *
 * @param options - Deployment options
 * @returns Generated workflow YAML content
 */
export function generatePagesWorkflow(options: GitHubDeployOptions): string {
  const buildCommand = options.buildCommand || 'npm run build'
  const outputDir = options.outputDir || 'out'
  const sourceBranch = options.sourceBranch || 'main'

  const workflow: ActionsWorkflow = {
    name: 'Deploy to GitHub Pages',
    on: {
      push: { branches: [sourceBranch] },
      workflow_dispatch: {},
    },
    permissions: {
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    },
    jobs: {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20',
              cache: 'npm',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Build',
            run: buildCommand,
            env: options.basePath ? { BASE_PATH: options.basePath } : undefined,
          },
          {
            name: 'Setup Pages',
            uses: 'actions/configure-pages@v4',
          },
          {
            name: 'Upload artifact',
            uses: 'actions/upload-pages-artifact@v3',
            with: {
              path: outputDir,
            },
          },
        ],
      },
      deploy: {
        'runs-on': 'ubuntu-latest',
        environment: {
          name: 'github-pages',
          url: '${{ steps.deployment.outputs.page_url }}',
        },
        steps: [
          {
            name: 'Deploy to GitHub Pages',
            id: 'deployment',
            uses: 'actions/deploy-pages@v4',
          },
        ],
      },
    },
  }

  // Add needs dependency
  ;(workflow.jobs.deploy as { needs?: string })['needs'] = 'build'

  return workflowToYaml(workflow)
}

/**
 * Generate a workflow for Next.js static export
 */
export function generateNextJsWorkflow(options: GitHubDeployOptions): string {
  const sourceBranch = options.sourceBranch || 'main'
  const basePath = options.basePath || ''

  const workflow: ActionsWorkflow = {
    name: 'Deploy Next.js to GitHub Pages',
    on: {
      push: { branches: [sourceBranch] },
      workflow_dispatch: {},
    },
    permissions: {
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    },
    jobs: {
      build: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20',
              cache: 'npm',
            },
          },
          {
            name: 'Setup Pages',
            uses: 'actions/configure-pages@v4',
            with: {
              static_site_generator: 'next',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Build with Next.js',
            run: 'npx next build',
            env: basePath ? { NEXT_PUBLIC_BASE_PATH: basePath } : undefined,
          },
          {
            name: 'Upload artifact',
            uses: 'actions/upload-pages-artifact@v3',
            with: {
              path: './out',
            },
          },
        ],
      },
      deploy: {
        'runs-on': 'ubuntu-latest',
        environment: {
          name: 'github-pages',
          url: '${{ steps.deployment.outputs.page_url }}',
        },
        steps: [
          {
            name: 'Deploy to GitHub Pages',
            id: 'deployment',
            uses: 'actions/deploy-pages@v4',
          },
        ],
      },
    },
  }

  // Add needs dependency
  ;(workflow.jobs.deploy as { needs?: string })['needs'] = 'build'

  return workflowToYaml(workflow)
}

/**
 * Convert workflow object to YAML string
 */
function workflowToYaml(workflow: ActionsWorkflow): string {
  const lines: string[] = []

  lines.push(`name: ${workflow.name}`)
  lines.push('')
  lines.push('on:')

  if (workflow.on.push) {
    lines.push('  push:')
    lines.push(`    branches: [${workflow.on.push.branches.join(', ')}]`)
  }

  if (workflow.on.workflow_dispatch) {
    lines.push('  workflow_dispatch:')
  }

  lines.push('')

  if (workflow.permissions) {
    lines.push('permissions:')
    for (const [key, value] of Object.entries(workflow.permissions)) {
      lines.push(`  ${key}: ${value}`)
    }
    lines.push('')
  }

  lines.push('jobs:')

  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    lines.push(`  ${jobName}:`)
    lines.push(`    runs-on: ${job['runs-on']}`)

    const needs = (job as { needs?: string }).needs
    if (needs) {
      lines.push(`    needs: ${needs}`)
    }

    if (job.environment) {
      lines.push('    environment:')
      lines.push(`      name: ${job.environment.name}`)
      if (job.environment.url) {
        lines.push(`      url: ${job.environment.url}`)
      }
    }

    lines.push('    steps:')

    for (const step of job.steps) {
      if (step.name) {
        lines.push(`      - name: ${step.name}`)
      } else {
        lines.push('      -')
      }

      if (step.id) {
        lines.push(`        id: ${step.id}`)
      }

      if (step.uses) {
        lines.push(`        uses: ${step.uses}`)
      }

      if (step.with) {
        lines.push('        with:')
        for (const [key, value] of Object.entries(step.with)) {
          if (typeof value === 'string') {
            lines.push(`          ${key}: ${value}`)
          } else if (typeof value === 'boolean') {
            lines.push(`          ${key}: ${value}`)
          } else if (typeof value === 'number') {
            lines.push(`          ${key}: ${value}`)
          }
        }
      }

      if (step.run) {
        lines.push(`        run: ${step.run}`)
      }

      if (step.env) {
        lines.push('        env:')
        for (const [key, value] of Object.entries(step.env)) {
          lines.push(`          ${key}: ${value}`)
        }
      }
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Write a GitHub Actions workflow to the repository
 *
 * @param projectDir - Project directory
 * @param workflowName - Name of the workflow file
 * @param content - Workflow YAML content
 */
export function writeWorkflow(
  projectDir: string,
  workflowName: string,
  content: string
): void {
  const workflowDir = join(projectDir, '.github', 'workflows')

  if (!existsSync(workflowDir)) {
    mkdirSync(workflowDir, { recursive: true })
  }

  const workflowPath = join(workflowDir, `${workflowName}.yml`)
  writeFileSync(workflowPath, content)
}

/**
 * Setup GitHub Actions for Pages deployment
 *
 * @param options - Deployment options
 * @returns Path to the generated workflow file
 *
 * @example
 * ```ts
 * import { setupPagesActions } from '@mdxe/github/actions'
 *
 * const workflowPath = setupPagesActions({
 *   projectDir: './my-project',
 *   sourceBranch: 'main',
 *   outputDir: 'out',
 * })
 * ```
 */
export function setupPagesActions(options: GitHubDeployOptions): string {
  const { projectDir } = options

  // Detect if this is a Next.js project
  const isNextJs = existsSync(join(projectDir, 'next.config.js')) ||
    existsSync(join(projectDir, 'next.config.mjs')) ||
    existsSync(join(projectDir, 'next.config.ts'))

  const workflow = isNextJs
    ? generateNextJsWorkflow(options)
    : generatePagesWorkflow(options)

  writeWorkflow(projectDir, 'deploy-pages', workflow)

  return join(projectDir, '.github', 'workflows', 'deploy-pages.yml')
}
