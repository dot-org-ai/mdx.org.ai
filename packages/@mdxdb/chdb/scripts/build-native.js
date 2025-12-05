#!/usr/bin/env node

/**
 * Build script for @mdxdb/chdb native bindings
 *
 * This script:
 * 1. Clones the chdb repository
 * 2. Modifies build.sh to add USE_USEARCH=1
 * 3. Builds the native library
 * 4. Copies to prebuilds directory
 */

import { execSync, spawn } from 'child_process'
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { platform, arch } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BUILD_DIR = join(ROOT, '.build')
const PREBUILDS_DIR = join(ROOT, 'prebuilds')

const CHDB_REPO = 'https://github.com/chdb-io/chdb.git'
const CHDB_NODE_REPO = 'https://github.com/chdb-io/chdb-node.git'

// Platform detection
const PLATFORM = platform()
const ARCH = arch()
const PREBUILD_NAME = `${PLATFORM}-${ARCH}`

console.log(`Building @mdxdb/chdb for ${PREBUILD_NAME}`)

// Ensure directories exist
mkdirSync(BUILD_DIR, { recursive: true })
mkdirSync(join(PREBUILDS_DIR, PREBUILD_NAME), { recursive: true })

/**
 * Run a command and stream output
 */
function run(cmd, options = {}) {
  console.log(`\n$ ${cmd}\n`)
  execSync(cmd, {
    stdio: 'inherit',
    cwd: BUILD_DIR,
    ...options,
  })
}

/**
 * Patch build.sh to add USE_USEARCH
 */
function patchBuildScript(buildShPath) {
  let content = readFileSync(buildShPath, 'utf8')

  // Add USE_USEARCH to CMAKE_ARGS if not already present
  if (!content.includes('ENABLE_USEARCH') && !content.includes('USE_USEARCH')) {
    // Find the CMAKE_ARGS section and add our flags
    content = content.replace(
      /CMAKE_ARGS="([^"]*)"/,
      (match, args) => {
        const newArgs = args + ' -DENABLE_USEARCH=1'
        return `CMAKE_ARGS="${newArgs}"`
      }
    )

    writeFileSync(buildShPath, content)
    console.log('Patched build.sh to add ENABLE_USEARCH=1')
  }
}

async function main() {
  try {
    // Step 1: Clone chdb core library
    const chdbDir = join(BUILD_DIR, 'chdb')
    if (!existsSync(chdbDir)) {
      console.log('\n=== Cloning chdb repository ===')
      run(`git clone --depth 1 ${CHDB_REPO}`)
    }

    // Step 2: Patch build script
    console.log('\n=== Patching build configuration ===')
    const buildShPath = join(chdbDir, 'chdb', 'build.sh')
    if (existsSync(buildShPath)) {
      patchBuildScript(buildShPath)
    }

    // Step 3: Build the core library
    console.log('\n=== Building chdb with vector support ===')
    run('make buildlib', { cwd: chdbDir })

    // Step 4: Clone chdb-node
    const chdbNodeDir = join(BUILD_DIR, 'chdb-node')
    if (!existsSync(chdbNodeDir)) {
      console.log('\n=== Cloning chdb-node repository ===')
      run(`git clone --depth 1 ${CHDB_NODE_REPO}`)
    }

    // Step 5: Copy built library to chdb-node
    console.log('\n=== Linking built library ===')
    // Find the built library and copy it
    const libName = PLATFORM === 'darwin' ? 'libchdb.dylib' : 'libchdb.so'
    const builtLib = join(chdbDir, 'buildlib', libName)
    if (existsSync(builtLib)) {
      cpSync(builtLib, join(chdbNodeDir, libName))
    }

    // Step 6: Build Node.js bindings
    console.log('\n=== Building Node.js bindings ===')
    run('npm install', { cwd: chdbNodeDir })
    run('npm run build', { cwd: chdbNodeDir })

    // Step 7: Copy to prebuilds
    console.log('\n=== Copying to prebuilds ===')
    const prebuildDir = join(PREBUILDS_DIR, PREBUILD_NAME)
    cpSync(
      join(chdbNodeDir, 'build', 'Release'),
      prebuildDir,
      { recursive: true }
    )

    console.log(`\n✅ Build complete! Prebuilds available in: ${prebuildDir}`)
    console.log('\nTo test:')
    console.log('  node -e "const {Session} = require(\'./prebuilds\'); console.log(new Session().query(\'SELECT generateULID()\', \'JSON\'))"')

  } catch (error) {
    console.error('\n❌ Build failed:', error.message)
    process.exit(1)
  }
}

main()
