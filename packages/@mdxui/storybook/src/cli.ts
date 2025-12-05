#!/usr/bin/env node
/**
 * MDXUI Storybook CLI
 *
 * Generate Storybook stories from MDX files or site registries.
 *
 * Usage:
 *   npx mdxui-storybook generate --input "examples/sites/index.mdx" --output "stories/generated"
 *   npx mdxui-storybook generate-sites --output "stories/sites"
 *   npx mdxui-storybook scan --input "examples/index.mdx"
 */

import { writeFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { loadMDXFiles, filterWithLayouts, groupByCategory } from './loader'
import { generateStories, generateStoriesIndex } from './generator'
import { generateCombinedStoriesFile, type SiteEntry } from './generateFromRegistry'

const args = process.argv.slice(2)
const command = args[0]

interface CLIOptions {
  input: string[]
  output: string
  categoryPrefix: string
  verbose: boolean
  registry: string
}

function parseArgs(): CLIOptions {
  const options: CLIOptions = {
    input: ['examples/**/*.mdx'],
    output: 'stories/generated',
    categoryPrefix: 'Examples',
    verbose: false,
    registry: '@mdxui/examples',
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    if (arg === '--input' || arg === '-i') {
      options.input = next?.split(',') || options.input
      i++
    } else if (arg === '--output' || arg === '-o') {
      options.output = next || options.output
      i++
    } else if (arg === '--prefix' || arg === '-p') {
      options.categoryPrefix = next || options.categoryPrefix
      i++
    } else if (arg === '--registry' || arg === '-r') {
      options.registry = next || options.registry
      i++
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    }
  }

  return options
}

async function scan(options: CLIOptions) {
  console.log('Scanning for MDX files with layouts...\n')

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
}

async function generate(options: CLIOptions) {
  console.log('Generating Storybook stories from MDX files...\n')

  const files = await loadMDXFiles(options.input)
  const withLayouts = filterWithLayouts(files)

  if (withLayouts.length === 0) {
    console.log('No MDX files with layouts found.')
    return
  }

  const stories = generateStories(withLayouts, {
    categoryPrefix: options.categoryPrefix,
  })

  // Create output directory
  await mkdir(options.output, { recursive: true })

  // Write story files
  for (const story of stories) {
    const outputPath = join(options.output, story.path)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, story.content)
    console.log(`Generated: ${outputPath}`)
  }

  // Write index file
  const indexContent = generateStoriesIndex(stories)
  const indexPath = join(options.output, 'index.ts')
  await writeFile(indexPath, indexContent)
  console.log(`Generated: ${indexPath}`)

  console.log(`\nGenerated ${stories.length} stories!`)
}

async function generateSites(options: CLIOptions) {
  console.log('Generating Storybook stories from site registry...\n')

  try {
    // Dynamic import of the registry
    const registryModule = await import(options.registry)
    const registry: SiteEntry[] = registryModule.siteRegistry

    if (!registry || !Array.isArray(registry)) {
      console.error(`Error: Could not find siteRegistry in ${options.registry}`)
      process.exit(1)
    }

    console.log(`Found ${registry.length} sites in registry\n`)

    // Generate the combined story file content
    const content = generateCombinedStoriesFile(registry, {
      outputDir: options.output,
      titlePrefix: options.categoryPrefix,
      registryPackage: options.registry,
    })

    // Create output directory
    await mkdir(options.output, { recursive: true })

    // Write the story file
    const outputPath = join(options.output, 'Sites.stories.tsx')
    await writeFile(outputPath, content)
    console.log(`Generated: ${outputPath}`)

    console.log(`\nGenerated stories for ${registry.length} sites!`)
  } catch (error) {
    console.error(`Error loading registry from ${options.registry}:`, error)
    process.exit(1)
  }
}

function showHelp() {
  console.log(`
MDXUI Storybook CLI

Commands:
  scan           Scan for MDX files with layouts
  generate       Generate Storybook stories from MDX files
  generate-sites Generate stories from @mdxui/examples site registry

Options:
  --input, -i     Glob patterns for MDX files (comma-separated)
  --output, -o    Output directory for generated stories
  --prefix, -p    Category prefix for story titles (default: Sites)
  --registry, -r  Package to import site registry from (default: @mdxui/examples)
  --verbose, -v   Enable verbose output
  --help, -h      Show this help message

Examples:
  npx mdxui-storybook scan --input "examples/*.mdx"
  npx mdxui-storybook generate --input "examples/sites/*.mdx" --output "stories/sites"
  npx mdxui-storybook generate-sites --output "stories/sites" --prefix "Sites"
`)
}

async function main() {
  const options = parseArgs()

  switch (command) {
    case 'scan':
      await scan(options)
      break
    case 'generate':
      await generate(options)
      break
    case 'generate-sites':
      await generateSites(options)
      break
    case '--help':
    case '-h':
    case undefined:
      showHelp()
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
