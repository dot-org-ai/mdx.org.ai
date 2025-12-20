#!/usr/bin/env tsx
/**
 * Comprehensive publish script for mdx.org.ai and primitives
 *
 * This script handles:
 * 1. Publishing primitives packages in correct order
 * 2. Replacing file: and workspace:* references with npm versions
 * 3. Publishing mdx.org.ai packages in correct order
 *
 * Usage:
 *   pnpm tsx scripts/publish-all.ts --check        # Check publish order
 *   pnpm tsx scripts/publish-all.ts --dry-run      # Dry run (no publish)
 *   pnpm tsx scripts/publish-all.ts                # Publish all
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const primitivesDir = join(rootDir, 'primitives')

// Packages in correct publish order (dependencies first)
// Layer numbers indicate depth in dependency graph

const PRIMITIVES_ORDER = [
  // Layer 0 - No workspace dependencies
  { name: 'language-models', path: 'packages/language-models' },
  { name: 'ai-workflows', path: 'packages/ai-workflows' },

  // Layer 1
  { name: 'ai-providers', path: 'packages/ai-providers' },

  // Layer 2
  { name: 'ai-functions', path: 'packages/ai-functions' },

  // Layer 3
  { name: 'ai-database', path: 'packages/ai-database' },

  // Optional/utility
  { name: 'ai-evaluate', path: 'packages/ai-evaluate' },
]

const MDX_ORG_AI_ORDER = [
  // Layer 0 - Only external deps
  { name: 'mdxld', path: 'packages/mdxld' },
  { name: '@mdxe/cloudflare', path: 'packages/@mdxe/cloudflare' },
  { name: '@mdxe/do', path: 'packages/@mdxe/do' },
  { name: '@mdxe/github', path: 'packages/@mdxe/github' },
  { name: '@mdxe/vercel', path: 'packages/@mdxe/vercel' },
  { name: '@mdxdb/sqlite', path: 'packages/@mdxdb/sqlite' },

  // Layer 1
  { name: '@mdxe/fumadocs', path: 'packages/@mdxe/fumadocs' },
  { name: '@mdxld/extract', path: 'packages/@mdxld/extract' },

  // Layer 2
  { name: '@mdxdb/fs', path: 'packages/@mdxdb/fs' },
  { name: '@mdxe/deploy', path: 'packages/@mdxe/deploy' },

  // Layer 3
  { name: '@mdxdb/fumadocs', path: 'packages/@mdxdb/fumadocs' },
  { name: '@mdxdb/clickhouse', path: 'packages/@mdxdb/clickhouse' },

  // Layer 4
  { name: '@mdxui/fumadocs', path: 'packages/@mdxui/fumadocs' },
  { name: '@mdxdb/payload', path: 'packages/@mdxdb/payload' },

  // Layer 5
  { name: '@mdxe/hono', path: 'packages/@mdxe/hono' },
  { name: '@mdxe/payload', path: 'packages/@mdxe/payload' },

  // Layer 6 - Final
  { name: 'mdxe', path: 'packages/mdxe' },
]

interface PackageJson {
  name: string
  version: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

function readPackageJson(dir: string): PackageJson | null {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath)) return null
  return JSON.parse(readFileSync(pkgPath, 'utf-8'))
}

function writePackageJson(dir: string, pkg: PackageJson): void {
  const pkgPath = join(dir, 'package.json')
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function getNpmVersion(packageName: string): string | null {
  try {
    const result = execSync(`npm view ${packageName} version 2>/dev/null`, {
      encoding: 'utf-8',
    }).trim()
    return result || null
  } catch {
    return null
  }
}

function run(cmd: string, cwd?: string) {
  console.log(`> ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function printOrder() {
  console.log('\n=== PUBLISHING ORDER ===\n')

  console.log('PRIMITIVES (publish first):')
  console.log('─'.repeat(50))
  for (const { name, path } of PRIMITIVES_ORDER) {
    const fullPath = join(primitivesDir, path)
    const pkg = readPackageJson(fullPath)
    const npmVer = getNpmVersion(name)
    const status = pkg ? `v${pkg.version}` : 'NOT FOUND'
    const npmStatus = npmVer ? `npm: v${npmVer}` : 'NOT ON NPM'
    console.log(`  ${name.padEnd(25)} ${status.padEnd(15)} ${npmStatus}`)
  }

  console.log('\nMDX.ORG.AI (publish after primitives):')
  console.log('─'.repeat(50))
  for (const { name, path } of MDX_ORG_AI_ORDER) {
    const fullPath = join(rootDir, path)
    const pkg = readPackageJson(fullPath)
    const npmVer = getNpmVersion(name)
    const status = pkg ? `v${pkg.version}` : 'NOT FOUND'
    const npmStatus = npmVer ? `npm: v${npmVer}` : 'NOT ON NPM'
    console.log(`  ${name.padEnd(25)} ${status.padEnd(15)} ${npmStatus}`)
  }

  console.log('')
}

function fixMdxeFileReferences(dryRun: boolean) {
  console.log('\n=== FIXING file: REFERENCES ===\n')

  const mdxePkgPath = join(rootDir, 'packages/mdxe')
  const pkg = readPackageJson(mdxePkgPath)
  if (!pkg) {
    console.log('ERROR: mdxe package.json not found')
    return
  }

  const fileRefs: [string, string][] = []

  // Find file: references
  for (const [dep, ver] of Object.entries(pkg.dependencies || {})) {
    if (ver.startsWith('file:')) {
      const npmVer = getNpmVersion(dep)
      if (npmVer) {
        fileRefs.push([dep, npmVer])
        console.log(`  ${dep}: file:... -> ^${npmVer}`)
      } else {
        console.log(`  ${dep}: file:... -> NEEDS PUBLISHING FIRST`)
      }
    }
  }

  if (!dryRun && fileRefs.length > 0) {
    // Only update if all refs have npm versions
    const allHaveNpmVersions = fileRefs.every(([dep]) => getNpmVersion(dep))
    if (allHaveNpmVersions) {
      for (const [dep, ver] of fileRefs) {
        pkg.dependencies![dep] = `^${ver}`
      }
      writePackageJson(mdxePkgPath, pkg)
      console.log('\n  Updated mdxe/package.json')
    } else {
      console.log('\n  Skipping update - publish primitives first')
    }
  }
}

function buildAndPublish(
  packages: { name: string; path: string }[],
  baseDir: string,
  dryRun: boolean
) {
  for (const { name, path } of packages) {
    const fullPath = join(baseDir, path)
    if (!existsSync(fullPath)) {
      console.log(`  SKIP: ${name} (not found)`)
      continue
    }

    const pkg = readPackageJson(fullPath)
    if (!pkg) {
      console.log(`  SKIP: ${name} (no package.json)`)
      continue
    }

    const npmVer = getNpmVersion(name)
    if (npmVer === pkg.version) {
      console.log(`  SKIP: ${name}@${pkg.version} (already published)`)
      continue
    }

    console.log(`\n  Publishing ${name}@${pkg.version}...`)

    try {
      // Build
      run('pnpm build', fullPath)

      // Publish
      if (dryRun) {
        console.log(`  [DRY RUN] Would publish ${name}@${pkg.version}`)
      } else {
        run('npm publish --access public', fullPath)
        console.log(`  ✓ Published ${name}@${pkg.version}`)
      }
    } catch (error) {
      console.error(`  ✗ Failed to publish ${name}: ${error}`)
      throw error
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const checkOnly = args.includes('--check')
  const dryRun = args.includes('--dry-run')

  console.log('=== MDX.ORG.AI PUBLISH SCRIPT ===')
  console.log('')

  if (checkOnly) {
    printOrder()
    return
  }

  // Print order
  printOrder()

  // Fix file: references
  fixMdxeFileReferences(dryRun)

  if (dryRun) {
    console.log('\n[DRY RUN MODE - No actual publishing will occur]\n')
  }

  // Ask for confirmation
  if (!dryRun) {
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await new Promise<string>((resolve) => {
      rl.question('\nProceed with publishing? (y/N) ', resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  // Publish primitives first
  console.log('\n=== PUBLISHING PRIMITIVES ===\n')
  buildAndPublish(PRIMITIVES_ORDER, primitivesDir, dryRun)

  // Fix file: references after primitives are published
  if (!dryRun) {
    fixMdxeFileReferences(false)
  }

  // Publish mdx.org.ai packages
  console.log('\n=== PUBLISHING MDX.ORG.AI ===\n')
  buildAndPublish(MDX_ORG_AI_ORDER, rootDir, dryRun)

  console.log('\n=== PUBLISH COMPLETE ===\n')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
