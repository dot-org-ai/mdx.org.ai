/**
 * Scaffolding for Fumadocs Next.js app
 *
 * Generates the Next.js app structure inside node_modules/mdxe/.fumadocs/
 * All files are generated from templates and point to the user's content directory.
 */

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { DocsConfig, DocsDetectionResult } from './detect.js'
import {
  generateNextConfig,
  generateSourceConfig,
  generateSource,
  generateAppLayout,
  generateGlobalCss,
  generateDocsLayout,
  generateDocsPage,
  generateNotFound,
  generateOpenNextConfig,
  generateWranglerConfig,
  generateTsconfig,
  generatePostcssConfig,
  generatePackageJson,
} from './templates/index.js'

/**
 * Options for scaffolding
 */
export interface ScaffoldOptions {
  /** User's project directory (where content is) */
  projectDir: string
  /** Output directory for generated app (node_modules/mdxe/.fumadocs) */
  outputDir: string
  /** Detection result with config */
  detection: DocsDetectionResult
  /** Force regeneration even if files exist */
  force?: boolean
  /** Verbose logging */
  verbose?: boolean
}

/**
 * Result of scaffolding
 */
export interface ScaffoldResult {
  /** Whether scaffolding was successful */
  success: boolean
  /** Path to generated app */
  appDir: string
  /** Files that were created */
  created: string[]
  /** Files that were skipped */
  skipped: string[]
  /** Any errors */
  errors: string[]
}

/**
 * Write a file if it doesn't exist or force is true
 */
function writeFile(
  filePath: string,
  content: string,
  options: { force?: boolean; verbose?: boolean },
  result: ScaffoldResult
): void {
  const relativePath = relative(result.appDir, filePath)

  if (existsSync(filePath) && !options.force) {
    result.skipped.push(relativePath)
    return
  }

  try {
    // Ensure directory exists
    const dir = join(filePath, '..')
    mkdirSync(dir, { recursive: true })

    writeFileSync(filePath, content, 'utf-8')
    result.created.push(relativePath)

    if (options.verbose) {
      console.log(`  Created: ${relativePath}`)
    }
  } catch (error) {
    result.errors.push(`Failed to write ${relativePath}: ${error}`)
  }
}

/**
 * Get the relative path from the generated app to the content directory
 */
function getContentRelativePath(outputDir: string, contentDir: string): string {
  // Calculate relative path from outputDir to contentDir
  const relativePath = relative(outputDir, contentDir)
  return relativePath
}

/**
 * Scaffold the Fumadocs Next.js app
 *
 * Generates all required files in the output directory.
 */
export async function scaffoldFumadocs(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { projectDir, outputDir, detection, force = false, verbose = false } = options

  const result: ScaffoldResult = {
    success: false,
    appDir: outputDir,
    created: [],
    skipped: [],
    errors: [],
  }

  if (verbose) {
    console.log(`[mdxe] Scaffolding Fumadocs app...`)
    console.log(`  Content: ${projectDir}`)
    console.log(`  Output: ${outputDir}`)
  }

  // Clean output directory if force
  if (force && existsSync(outputDir)) {
    if (verbose) {
      console.log(`  Cleaning existing output directory...`)
    }
    rmSync(outputDir, { recursive: true, force: true })
  }

  // Create output directory
  mkdirSync(outputDir, { recursive: true })

  // Calculate relative path from generated app to content
  const contentRelativePath = getContentRelativePath(outputDir, projectDir)
  const customizationDir = join(projectDir, '.mdx')
  const customizationRelativePath = getContentRelativePath(outputDir, customizationDir)

  // Extract config with defaults
  const config = detection.config
  const title = config.title || detection.projectName || 'Documentation'
  const description = config.description || ''
  const githubUrl = config.githubUrl || ''
  const baseUrl = config.baseUrl || '/'
  const domain = config.domain
  const route = config.route
  const zone = config.zone

  // Generate files
  const fileOpts = { force, verbose }

  // Root config files
  writeFile(
    join(outputDir, 'next.config.mjs'),
    generateNextConfig({
      contentDir: contentRelativePath,
      customizationDir: customizationRelativePath,
    }),
    fileOpts,
    result
  )

  writeFile(
    join(outputDir, 'source.config.ts'),
    generateSourceConfig({
      contentDir: contentRelativePath,
    }),
    fileOpts,
    result
  )

  writeFile(
    join(outputDir, 'tsconfig.json'),
    generateTsconfig({
      contentDir: contentRelativePath,
    }),
    fileOpts,
    result
  )

  writeFile(
    join(outputDir, 'postcss.config.mjs'),
    generatePostcssConfig(),
    fileOpts,
    result
  )

  writeFile(
    join(outputDir, 'open-next.config.ts'),
    generateOpenNextConfig(),
    fileOpts,
    result
  )

  writeFile(
    join(outputDir, 'wrangler.jsonc'),
    generateWranglerConfig({
      projectName: title,
      domain,
      route,
      zone,
    }),
    fileOpts,
    result
  )

  writeFile(
    join(outputDir, 'package.json'),
    generatePackageJson({
      projectName: title,
    }),
    fileOpts,
    result
  )

  // lib/source.ts
  writeFile(
    join(outputDir, 'lib', 'source.ts'),
    generateSource({
      baseUrl,
    }),
    fileOpts,
    result
  )

  // app/layout.tsx
  writeFile(
    join(outputDir, 'app', 'layout.tsx'),
    generateAppLayout({
      title,
      description,
      customizationDir: customizationRelativePath,
    }),
    fileOpts,
    result
  )

  // app/global.css
  writeFile(join(outputDir, 'app', 'global.css'), generateGlobalCss(), fileOpts, result)

  // app/not-found.tsx
  writeFile(join(outputDir, 'app', 'not-found.tsx'), generateNotFound(), fileOpts, result)

  // app/(docs)/layout.tsx
  writeFile(
    join(outputDir, 'app', '(docs)', 'layout.tsx'),
    generateDocsLayout({
      title,
      githubUrl,
      customizationDir: customizationRelativePath,
    }),
    fileOpts,
    result
  )

  // app/(docs)/[[...slug]]/page.tsx
  writeFile(
    join(outputDir, 'app', '(docs)', '[[...slug]]', 'page.tsx'),
    generateDocsPage(),
    fileOpts,
    result
  )

  // Check for errors
  if (result.errors.length > 0) {
    console.error(`[mdxe] Scaffolding completed with errors:`)
    for (const error of result.errors) {
      console.error(`  - ${error}`)
    }
  } else {
    result.success = true
    if (verbose) {
      console.log(`[mdxe] Scaffolding complete!`)
      console.log(`  Created: ${result.created.length} files`)
      console.log(`  Skipped: ${result.skipped.length} files`)
    }
  }

  return result
}

/**
 * Get the default output directory for the Fumadocs app
 */
export function getFumadocsOutputDir(projectDir: string): string {
  return join(projectDir, 'node_modules', 'mdxe', '.fumadocs')
}

/**
 * Check if scaffolding is needed (output dir doesn't exist or is empty)
 */
export function needsScaffolding(projectDir: string): boolean {
  const outputDir = getFumadocsOutputDir(projectDir)

  if (!existsSync(outputDir)) {
    return true
  }

  // Check if key files exist
  const requiredFiles = ['next.config.mjs', 'package.json', 'app/layout.tsx']

  for (const file of requiredFiles) {
    if (!existsSync(join(outputDir, file))) {
      return true
    }
  }

  return false
}
