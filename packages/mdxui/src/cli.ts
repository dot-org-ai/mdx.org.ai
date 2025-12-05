#!/usr/bin/env node
/**
 * mdxui CLI
 *
 * Compose, Design, & Publish MDX-based UI Components
 *
 * Usage:
 *   mdxui storybook generate-sites --output "stories/sites"
 *   mdxui storybook scan --input "examples/*.mdx"
 */

import { writeFile, mkdir } from 'fs/promises'
import { dirname, join, resolve } from 'path'

const args = process.argv.slice(2)
const command = args[0]
const subcommand = args[1]

interface CLIOptions {
  input: string[]
  output: string
  prefix: string
  registry: string
  importPath: string
  verbose: boolean
}

function parseArgs(startIdx = 2): CLIOptions {
  const options: CLIOptions = {
    input: ['examples/*.mdx'],
    output: 'stories/generated',
    prefix: 'Sites',
    registry: '@mdxui/examples',
    importPath: '@mdxui/examples',
    verbose: false,
  }

  for (let i = startIdx; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    if (arg === '--input' || arg === '-i') {
      options.input = next?.split(',') || options.input
      i++
    } else if (arg === '--output' || arg === '-o') {
      options.output = next || options.output
      i++
    } else if (arg === '--prefix' || arg === '-p') {
      options.prefix = next || options.prefix
      i++
    } else if (arg === '--registry' || arg === '-r') {
      options.registry = next || options.registry
      i++
    } else if (arg === '--import-path' || arg === '--import') {
      options.importPath = next || options.importPath
      i++
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    }
  }

  return options
}

// ============================================
// Storybook Commands
// ============================================

async function storybookScan(options: CLIOptions) {
  console.log('Scanning for MDX files with layouts...\n')

  try {
    const { loadMDXFiles, filterWithLayouts, groupByCategory } = await import('@mdxui/storybook')

    const files = await loadMDXFiles(options.input)
    const withLayouts = filterWithLayouts(files)
    const byCategory = groupByCategory(withLayouts)

    console.log(`Found ${withLayouts.length} MDX files with layouts:\n`)

    for (const [category, categoryFiles] of byCategory) {
      console.log(`${category}:`)
      for (const file of categoryFiles) {
        console.log(`  - ${file.relativePath}`)
        if (file.layout) {
          console.log(`    Layout: ${file.layout.type}`)
          console.log(`    Name: ${file.layout.name}`)
        }
      }
      console.log()
    }
  } catch (error) {
    console.error('Error: @mdxui/storybook is required for this command')
    console.error('Install it with: pnpm add -D @mdxui/storybook')
    process.exit(1)
  }
}

async function storybookGenerate(options: CLIOptions) {
  console.log('Generating Storybook stories from MDX files...\n')

  try {
    const { loadMDXFiles, filterWithLayouts, generateStories, generateStoriesIndex } = await import('@mdxui/storybook')

    const files = await loadMDXFiles(options.input)
    const withLayouts = filterWithLayouts(files)

    if (withLayouts.length === 0) {
      console.log('No MDX files with layouts found.')
      return
    }

    const stories = generateStories(withLayouts, {
      categoryPrefix: options.prefix,
    })

    await mkdir(options.output, { recursive: true })

    for (const story of stories) {
      const outputPath = join(options.output, story.path)
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, story.content)
      console.log(`Generated: ${outputPath}`)
    }

    const indexContent = generateStoriesIndex(stories)
    const indexPath = join(options.output, 'index.ts')
    await writeFile(indexPath, indexContent)
    console.log(`Generated: ${indexPath}`)

    console.log(`\nGenerated ${stories.length} stories!`)
  } catch (error) {
    console.error('Error: @mdxui/storybook is required for this command')
    console.error('Install it with: pnpm add -D @mdxui/storybook')
    process.exit(1)
  }
}

async function storybookGenerateSites(options: CLIOptions) {
  console.log('Generating Storybook stories from site registry...\n')

  // Import @mdxui/storybook
  let generateCombinedStoriesFile: typeof import('@mdxui/storybook').generateCombinedStoriesFile
  try {
    const storybook = await import('@mdxui/storybook')
    generateCombinedStoriesFile = storybook.generateCombinedStoriesFile
  } catch (error) {
    console.error('Error: @mdxui/storybook is required for this command')
    console.error('Install it with: pnpm add -D @mdxui/storybook')
    if (options.verbose) console.error(error)
    process.exit(1)
  }

  // Resolve the registry path (support relative paths)
  let registryPath = options.registry
  if (registryPath.startsWith('.') || registryPath.startsWith('/')) {
    registryPath = resolve(process.cwd(), registryPath)
  }

  // Dynamic import of the registry
  let registry: Array<Record<string, unknown>>
  try {
    const registryModule = await import(registryPath)
    registry = registryModule.siteRegistry

    if (!registry || !Array.isArray(registry)) {
      console.error(`Error: Could not find siteRegistry export in ${options.registry}`)
      console.error('Make sure the module exports: export const siteRegistry = [...]')
      process.exit(1)
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.error(`Error: Could not find registry module: ${options.registry}`)
      console.error('Specify a valid package name or relative path with --registry')
    } else {
      console.error(`Error loading registry:`, error)
    }
    process.exit(1)
  }

  console.log(`Found ${registry.length} sites in registry\n`)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = generateCombinedStoriesFile(registry as any, {
      outputDir: options.output,
      titlePrefix: options.prefix,
      registryPackage: options.importPath,
    })

    await mkdir(options.output, { recursive: true })

    const outputPath = join(options.output, 'Sites.stories.tsx')
    await writeFile(outputPath, content)
    console.log(`Generated: ${outputPath}`)

    console.log(`\nGenerated stories for ${registry.length} sites!`)
  } catch (error) {
    console.error('Error generating stories:', error)
    process.exit(1)
  }
}

function showStorybookHelp() {
  console.log(`
mdxui storybook - Generate Storybook stories from MDX

Commands:
  scan            Scan for MDX files with layouts
  generate        Generate stories from MDX files
  generate-sites  Generate stories from @mdxui/examples site registry

Options:
  --input, -i      Glob patterns for MDX files (comma-separated)
  --output, -o     Output directory for generated stories
  --prefix, -p     Category prefix for story titles (default: Sites)
  --registry, -r   Path to load site registry from (default: @mdxui/examples)
  --import-path    Import path used in generated files (default: @mdxui/examples)
  --verbose, -v    Enable verbose output

Examples:
  mdxui storybook scan --input "examples/*.mdx"
  mdxui storybook generate --input "examples/sites/*.mdx" --output "stories/sites"
  mdxui storybook generate-sites --output "stories/sites"
  mdxui storybook generate-sites --registry "./path/to/examples" --import-path "@mdxui/examples"
`)
}

async function handleStorybook() {
  const options = parseArgs(2)

  switch (subcommand) {
    case 'scan':
      await storybookScan(options)
      break
    case 'generate':
      await storybookGenerate(options)
      break
    case 'generate-sites':
      await storybookGenerateSites(options)
      break
    case '--help':
    case '-h':
    case undefined:
      showStorybookHelp()
      break
    default:
      console.error(`Unknown storybook command: ${subcommand}`)
      showStorybookHelp()
      process.exit(1)
  }
}

// ============================================
// Main CLI
// ============================================

function showHelp() {
  console.log(`
mdxui - Compose, Design, & Publish MDX-based UI Components

Commands:
  storybook       Generate Storybook stories from MDX files

Options:
  --help, -h      Show this help message
  --version, -V   Show version

Examples:
  mdxui storybook generate-sites --output "stories/sites"
  mdxui storybook scan --input "examples/*.mdx"

For command-specific help:
  mdxui storybook --help
`)
}

function showVersion() {
  // Read version from package.json in production
  console.log('mdxui v0.0.0')
}

async function main() {
  switch (command) {
    case 'storybook':
      await handleStorybook()
      break
    case '--help':
    case '-h':
    case undefined:
      showHelp()
      break
    case '--version':
    case '-V':
      showVersion()
      break
    default:
      console.error(`Unknown command: ${command}`)
      showHelp()
      process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
