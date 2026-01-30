/**
 * Safe Binary Download Utilities
 *
 * Provides secure binary download with checksum verification.
 * NEVER pipes downloaded content to shell - always writes to disk first.
 *
 * @packageDocumentation
 */

import { createHash, type Hash } from 'node:crypto'
import { createWriteStream, existsSync, unlinkSync, chmodSync, createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { platform, arch } from 'node:os'

export interface DownloadOptions {
  /** URL to download from */
  url: string
  /** Destination file path */
  destPath: string
  /** Expected checksum (hex string) */
  expectedChecksum?: string
  /** Hash algorithm for checksum verification */
  checksumAlgorithm?: 'sha256' | 'sha512'
  /** Skip checksum verification (not recommended for production) */
  skipChecksum?: boolean
  /** Maximum number of retry attempts */
  maxRetries?: number
  /** Delay between retries in milliseconds */
  retryDelay?: number
  /** Whether to make the file executable after download */
  executable?: boolean
  /** Progress callback */
  onProgress?: (downloaded: number, total: number | null) => void
}

export interface DownloadResult {
  success: boolean
  verified?: boolean
  actualChecksum?: string
  error?: string
  bytesDownloaded?: number
}

export interface ChecksumResult {
  valid: boolean
  actualChecksum?: string
  error?: string
}

export interface ClickHouseUrl {
  binaryUrl: string
  checksumUrl: string
  platform?: string
  arch?: string
}

/**
 * Download a binary file securely to disk
 *
 * SECURITY: This function NEVER pipes downloaded content to shell.
 * Content is written directly to disk and can be verified via checksum.
 */
export async function downloadBinary(options: DownloadOptions): Promise<DownloadResult> {
  const {
    url,
    destPath,
    expectedChecksum,
    checksumAlgorithm = 'sha256',
    skipChecksum = false,
    maxRetries = 3,
    retryDelay = 1000,
    executable = true,
    onProgress,
  } = options

  let lastError: Error | undefined
  let attempts = 0

  while (attempts < maxRetries) {
    attempts++

    try {
      // Fetch the binary
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : null

      // Get the response body as array buffer
      const buffer = await response.arrayBuffer()
      const data = Buffer.from(buffer)

      // Write to file
      const writeStream = createWriteStream(destPath)
      await new Promise<void>((resolve, reject) => {
        writeStream.write(data, (err) => {
          if (err) reject(err)
          writeStream.end(resolve)
        })
      })

      if (onProgress) {
        onProgress(data.length, total)
      }

      // Verify checksum if required
      if (!skipChecksum && expectedChecksum) {
        const checksumResult = await verifyChecksum(destPath, expectedChecksum, checksumAlgorithm)

        if (!checksumResult.valid) {
          // Delete the file if checksum doesn't match
          if (existsSync(destPath)) {
            unlinkSync(destPath)
          }
          return {
            success: false,
            verified: false,
            actualChecksum: checksumResult.actualChecksum,
            error: `Checksum mismatch: expected ${expectedChecksum}, got ${checksumResult.actualChecksum}`,
          }
        }
      }

      // Make executable if requested
      if (executable && existsSync(destPath)) {
        chmodSync(destPath, 0o755)
      }

      return {
        success: true,
        verified: !skipChecksum && !!expectedChecksum,
        bytesDownloaded: data.length,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Clean up partial download on error
      if (existsSync(destPath)) {
        try {
          unlinkSync(destPath)
        } catch {
          // Ignore cleanup errors
        }
      }

      // Don't retry on last attempt
      if (attempts < maxRetries) {
        await sleep(retryDelay)
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Download failed after all retries',
  }
}

/**
 * Verify file checksum
 */
export async function verifyChecksum(
  filePath: string,
  expectedChecksum: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): Promise<ChecksumResult> {
  try {
    if (!existsSync(filePath)) {
      return {
        valid: false,
        error: 'File does not exist',
      }
    }

    const hash = createHash(algorithm)
    const stream = createReadStream(filePath)

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => hash.update(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    const actualChecksum = hash.digest('hex')
    const normalizedExpected = expectedChecksum.toLowerCase().trim()
    const normalizedActual = actualChecksum.toLowerCase()

    return {
      valid: normalizedExpected === normalizedActual,
      actualChecksum: normalizedActual,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get ClickHouse download URL for current platform
 *
 * Returns URLs for both the binary and its checksum file.
 * Uses the official ClickHouse package repository.
 */
export function getClickHouseDownloadUrl(
  os: string = platform(),
  cpuArch: string = arch()
): ClickHouseUrl {
  // ClickHouse version to download - update as needed
  const version = '24.8.4.13'

  // Map Node.js arch to ClickHouse arch names
  const archMap: Record<string, string> = {
    x64: 'amd64',
    arm64: 'aarch64',
  }

  const chArch = archMap[cpuArch]
  if (!chArch) {
    throw new Error(`Unsupported architecture: ${cpuArch}`)
  }

  // Validate platform
  if (os !== 'linux' && os !== 'darwin') {
    throw new Error(`Unsupported platform: ${os}. ClickHouse binaries are available for Linux and macOS only.`)
  }

  // Construct download URLs
  // ClickHouse provides tgz archives from packages.clickhouse.com
  // Format: https://packages.clickhouse.com/tgz/stable/clickhouse-common-static-VERSION-ARCH.tgz
  const baseUrl = `https://packages.clickhouse.com/tgz/stable`
  const binaryName = `clickhouse-common-static-${version}-${chArch}.tgz`

  return {
    binaryUrl: `${baseUrl}/${binaryName}`,
    checksumUrl: `${baseUrl}/${binaryName}.sha512`,
    // Include metadata for tests
    platform: os,
    arch: chArch,
  }
}

/**
 * Fetch checksum from a URL
 */
export async function fetchChecksum(url: string): Promise<string> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch checksum: HTTP ${response.status}`)
  }

  const text = await response.text()
  // Checksum files typically have format: "checksum  filename" or just "checksum"
  const checksum = text.trim().split(/\s+/)[0]

  if (!checksum || !/^[a-fA-F0-9]{64,128}$/.test(checksum)) {
    throw new Error('Invalid checksum format')
  }

  return checksum
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Download ClickHouse binary safely
 *
 * This is the main entry point for downloading ClickHouse.
 * It fetches the checksum, downloads the binary, and verifies integrity.
 */
export async function downloadClickHouseSafe(destDir: string): Promise<DownloadResult> {
  const urls = getClickHouseDownloadUrl()

  console.log('Fetching checksum...')
  let expectedChecksum: string

  try {
    expectedChecksum = await fetchChecksum(urls.checksumUrl)
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch checksum: ${error instanceof Error ? error.message : error}`,
    }
  }

  console.log(`Downloading ClickHouse from ${urls.binaryUrl}...`)

  const destPath = `${destDir}/clickhouse.tgz`

  const result = await downloadBinary({
    url: urls.binaryUrl,
    destPath,
    expectedChecksum,
    checksumAlgorithm: 'sha512',
    executable: false, // tgz is an archive, not directly executable
    onProgress: (downloaded, total) => {
      if (total) {
        const pct = Math.round((downloaded / total) * 100)
        process.stdout.write(`\rDownloading: ${pct}%`)
      }
    },
  })

  if (!result.success) {
    return result
  }

  console.log('\nDownload complete, verified checksum.')

  // Extract the archive
  const { execSync } = await import('node:child_process')

  try {
    execSync(`tar -xzf ${destPath} -C ${destDir}`, { stdio: 'pipe' })
    // Clean up the archive
    unlinkSync(destPath)

    // Find and make the binary executable
    const binaryPath = `${destDir}/clickhouse`
    if (existsSync(binaryPath)) {
      chmodSync(binaryPath, 0o755)
    }

    return {
      success: true,
      verified: true,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract archive: ${error instanceof Error ? error.message : error}`,
    }
  }
}
