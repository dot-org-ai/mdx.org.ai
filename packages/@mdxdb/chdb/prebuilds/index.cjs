/**
 * Prebuilds loader for @mdxdb/chdb
 *
 * Automatically loads the correct native binary for the current platform.
 */

const { platform, arch } = require('os')
const { join } = require('path')
const { existsSync } = require('fs')

const PLATFORM = platform()
const ARCH = arch()
const PREBUILD_DIR = `${PLATFORM}-${ARCH}`

// Map platform/arch to prebuild directory
const prebuildPath = join(__dirname, PREBUILD_DIR)

if (!existsSync(prebuildPath)) {
  throw new Error(
    `@mdxdb/chdb: No prebuilt binary for ${PLATFORM}-${ARCH}. ` +
    `Supported platforms: linux-x64, linux-arm64, darwin-x64, darwin-arm64. ` +
    `You can build from source with: pnpm build:native`
  )
}

// Load the native addon
const binding = require(join(prebuildPath, 'chdb.node'))

module.exports = binding
