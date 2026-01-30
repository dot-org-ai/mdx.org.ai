/**
 * Tests for safe ClickHouse binary download
 *
 * Ensures that binary downloads are performed securely:
 * - Downloads are verified via checksum before execution
 * - No shell piping of downloaded content
 * - Proper error handling for network and verification failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import the functions we'll be testing
import {
  downloadBinary,
  verifyChecksum,
  getClickHouseDownloadUrl,
  type DownloadOptions,
  type DownloadResult,
} from '../src/utils/download.js'

describe('Safe Binary Download', () => {
  const testDir = join(tmpdir(), 'mdxe-download-test-' + Date.now())

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe('downloadBinary', () => {
    it('should download binary to specified path without shell piping', async () => {
      const destPath = join(testDir, 'test-binary')

      const result = await downloadBinary({
        url: 'https://httpbin.org/bytes/1024',
        destPath,
        skipChecksum: true, // For this basic test
      })

      expect(result.success).toBe(true)
      expect(existsSync(destPath)).toBe(true)
      // Verify file was downloaded with some content
      const stats = readFileSync(destPath)
      expect(stats.length).toBeGreaterThan(0)
    })

    it('should verify checksum before marking download as complete', async () => {
      const destPath = join(testDir, 'verified-binary')
      const testContent = 'test binary content'
      const expectedChecksum = createHash('sha256').update(testContent).digest('hex')

      // Mock a download that returns specific content
      const result = await downloadBinary({
        url: 'https://httpbin.org/base64/' + Buffer.from(testContent).toString('base64'),
        destPath,
        expectedChecksum,
        checksumAlgorithm: 'sha256',
      })

      expect(result.success).toBe(true)
      expect(result.verified).toBe(true)
    })

    it('should fail when checksum does not match', async () => {
      const destPath = join(testDir, 'bad-checksum-binary')

      const result = await downloadBinary({
        url: 'https://httpbin.org/bytes/1024',
        destPath,
        expectedChecksum: 'invalid-checksum-that-will-not-match',
        checksumAlgorithm: 'sha256',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('checksum')
      // File should be deleted after failed verification
      expect(existsSync(destPath)).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      const destPath = join(testDir, 'network-error-binary')

      const result = await downloadBinary({
        url: 'https://invalid.domain.that.does.not.exist.example/binary',
        destPath,
        skipChecksum: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should support retry on transient failures', async () => {
      const destPath = join(testDir, 'retry-binary')
      let attempts = 0

      // Mock fetch to fail first 2 times, succeed on 3rd
      const mockFetch = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Transient network error'))
        }
        return Promise.resolve({
          ok: true,
          headers: new Map([['content-length', '100']]),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        })
      })

      const originalFetch = global.fetch
      // @ts-expect-error - mocking fetch
      global.fetch = mockFetch

      try {
        const result = await downloadBinary({
          url: 'https://example.com/binary',
          destPath,
          skipChecksum: true,
          maxRetries: 3,
          retryDelay: 10, // Speed up test
        })

        expect(result.success).toBe(true)
        expect(attempts).toBe(3)
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should not execute downloaded content as shell commands', async () => {
      // This test ensures that downloaded content is NEVER passed to shell
      // The implementation should only write to disk, never pipe to sh/bash

      const destPath = join(testDir, 'no-shell-binary')
      const maliciousContent = '#!/bin/sh\nrm -rf / # This should never execute'

      // Mock fetch to return malicious content
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Map([['content-length', String(maliciousContent.length)]]),
        arrayBuffer: () => Promise.resolve(Buffer.from(maliciousContent)),
      })

      const originalFetch = global.fetch
      // @ts-expect-error - mocking fetch
      global.fetch = mockFetch

      try {
        await downloadBinary({
          url: 'https://example.com/binary',
          destPath,
          skipChecksum: true,
        })

        // Verify the content was written to disk (not piped to shell)
        expect(existsSync(destPath)).toBe(true)
        const written = readFileSync(destPath, 'utf-8')
        expect(written).toBe(maliciousContent)
      } finally {
        global.fetch = originalFetch
      }
    })
  })

  describe('verifyChecksum', () => {
    it('should verify SHA256 checksum correctly', async () => {
      const testFile = join(testDir, 'checksum-test')
      const content = 'test content for checksum'
      writeFileSync(testFile, content)

      const expectedChecksum = createHash('sha256').update(content).digest('hex')

      const result = await verifyChecksum(testFile, expectedChecksum, 'sha256')
      expect(result.valid).toBe(true)
      expect(result.actualChecksum).toBe(expectedChecksum)
    })

    it('should verify SHA512 checksum correctly', async () => {
      const testFile = join(testDir, 'checksum-test-512')
      const content = 'test content for sha512 checksum'
      writeFileSync(testFile, content)

      const expectedChecksum = createHash('sha512').update(content).digest('hex')

      const result = await verifyChecksum(testFile, expectedChecksum, 'sha512')
      expect(result.valid).toBe(true)
    })

    it('should detect checksum mismatch', async () => {
      const testFile = join(testDir, 'bad-checksum-test')
      const content = 'original content'
      writeFileSync(testFile, content)

      const wrongChecksum = createHash('sha256').update('different content').digest('hex')

      const result = await verifyChecksum(testFile, wrongChecksum, 'sha256')
      expect(result.valid).toBe(false)
      expect(result.actualChecksum).not.toBe(wrongChecksum)
    })

    it('should handle non-existent file', async () => {
      const result = await verifyChecksum(
        join(testDir, 'does-not-exist'),
        'somechecksum',
        'sha256'
      )
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('getClickHouseDownloadUrl', () => {
    it('should return correct URL for Linux amd64', () => {
      const url = getClickHouseDownloadUrl('linux', 'x64')
      expect(url.binaryUrl).toContain('clickhouse')
      expect(url.binaryUrl).toContain('amd64')
      expect(url.binaryUrl).toContain('packages.clickhouse.com')
      expect(url.checksumUrl).toContain('.sha')
      expect(url.platform).toBe('linux')
      expect(url.arch).toBe('amd64')
    })

    it('should return correct URL for Linux arm64', () => {
      const url = getClickHouseDownloadUrl('linux', 'arm64')
      expect(url.binaryUrl).toContain('aarch64')
      expect(url.checksumUrl).toBeDefined()
      expect(url.arch).toBe('aarch64')
    })

    it('should return correct URL for macOS x64', () => {
      const url = getClickHouseDownloadUrl('darwin', 'x64')
      expect(url.binaryUrl).toContain('clickhouse')
      expect(url.binaryUrl).toContain('amd64')
      expect(url.checksumUrl).toBeDefined()
      expect(url.platform).toBe('darwin')
    })

    it('should return correct URL for macOS arm64', () => {
      const url = getClickHouseDownloadUrl('darwin', 'arm64')
      expect(url.binaryUrl).toContain('aarch64')
      expect(url.platform).toBe('darwin')
      expect(url.arch).toBe('aarch64')
    })

    it('should throw for unsupported platform', () => {
      expect(() => getClickHouseDownloadUrl('win32', 'x64')).toThrow('Unsupported platform')
    })
  })
})

describe('ClickHouse Download Integration', () => {
  describe('downloadClickHouse (safe version)', () => {
    it('should not use curl piping to shell', async () => {
      // Import the actual downloadClickHouse function
      const { downloadClickHouse } = await import('../src/commands/db.js')

      // Get the source code and verify it doesn't contain unsafe patterns
      const dbSource = readFileSync(
        join(__dirname, '../src/commands/db.ts'),
        'utf-8'
      )

      // These patterns are unsafe and should not exist
      expect(dbSource).not.toContain('curl -fsSL')
      expect(dbSource).not.toContain('| sh')
      expect(dbSource).not.toContain('| bash')
      expect(dbSource).not.toContain('execSync(\'curl')
    })

    it('should use downloadBinary utility for safe downloads', async () => {
      const dbSource = readFileSync(
        join(__dirname, '../src/commands/db.ts'),
        'utf-8'
      )

      // The safe version should use the downloadBinary utility
      expect(dbSource).toContain('downloadBinary')
      // And should verify checksums
      expect(dbSource).toMatch(/checksum|verify/i)
    })
  })
})
