#!/usr/bin/env bun
/**
 * Build mdxdb as single-file executables for multiple platforms
 *
 * Uses Bun's compile feature: https://bun.sh/docs/bundler/executables
 *
 * Platforms:
 * - darwin-arm64 (macOS Apple Silicon)
 * - darwin-x64 (macOS Intel)
 * - linux-arm64 (Linux ARM)
 * - linux-x64 (Linux x64)
 * - windows-x64 (Windows)
 */

import { $ } from 'bun'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

const ROOT = dirname(dirname(import.meta.path))
const DIST = join(ROOT, 'dist-exe')

// Platforms to build for
const PLATFORMS = [
  { target: 'bun-darwin-arm64', name: 'mdxdb-darwin-arm64' },
  { target: 'bun-darwin-x64', name: 'mdxdb-darwin-x64' },
  { target: 'bun-linux-arm64', name: 'mdxdb-linux-arm64' },
  { target: 'bun-linux-x64', name: 'mdxdb-linux-x64' },
  { target: 'bun-windows-x64', name: 'mdxdb-windows-x64.exe' },
]

async function build() {
  console.log('Building mdxdb executables...\n')

  // Create dist directory
  mkdirSync(DIST, { recursive: true })

  // Get CLI entry point
  const entry = join(ROOT, 'src', 'cli.ts')

  if (!existsSync(entry)) {
    console.error(`Entry point not found: ${entry}`)
    process.exit(1)
  }

  // Build for each platform
  for (const { target, name } of PLATFORMS) {
    const output = join(DIST, name)
    console.log(`Building ${name}...`)

    try {
      await $`bun build ${entry} --compile --target=${target} --outfile=${output}`.quiet()
      console.log(`  ✅ ${name}`)
    } catch (error) {
      console.error(`  ❌ Failed to build ${name}:`, error)
    }
  }

  console.log('\nDone! Executables are in dist-exe/')
}

// Build only current platform (faster for development)
async function buildCurrent() {
  const entry = join(ROOT, 'src', 'cli.ts')
  const output = join(DIST, 'mdxdb')

  mkdirSync(DIST, { recursive: true })

  console.log('Building mdxdb for current platform...')
  await $`bun build ${entry} --compile --outfile=${output}`
  console.log(`✅ Built: ${output}`)
}

// Main
const args = process.argv.slice(2)

if (args.includes('--current') || args.includes('-c')) {
  await buildCurrent()
} else {
  await build()
}
