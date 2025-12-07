import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, '../fixtures')

test.describe('MDXDB Studio', () => {
  test.describe('UI Loading', () => {
    test('should load the studio homepage', async ({ page }) => {
      await page.goto('/')

      // Check title
      await expect(page).toHaveTitle('MDXDB Studio')

      // Check header is present - contains emoji + text
      await expect(page.locator('header h1')).toContainText('MDXDB Studio')
    })

    test('should display the file sidebar', async ({ page }) => {
      await page.goto('/')

      // File sidebar should be visible
      const sidebar = page.locator('.sidebar')
      await expect(sidebar).toBeVisible()
    })

    test('should display the editor area', async ({ page }) => {
      await page.goto('/')

      // Editor area should be visible
      const editor = page.locator('.editor')
      await expect(editor).toBeVisible()
    })
  })

  test.describe('File List', () => {
    test('should display files from the content directory', async ({ page }) => {
      await page.goto('/')

      // Wait for file tree to load - look for any file-item that contains our file name
      const fileItem = page.locator('.file-item', { hasText: 'hello.mdx' })
      await expect(fileItem).toBeVisible({ timeout: 5000 })
    })

    test('should show nested files in directories', async ({ page }) => {
      await page.goto('/')

      // The file tree auto-expands directories, so nested files should be visible
      // Wait for docs folder and its child
      const docsFolder = page.locator('.file-item', { hasText: 'docs' })
      await expect(docsFolder).toBeVisible({ timeout: 5000 })

      // Child file should also be visible (auto-expanded)
      const childFile = page.locator('.file-item', { hasText: 'getting-started.mdx' })
      await expect(childFile).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('File Selection', () => {
    test('should load file content when clicking a file', async ({ page }) => {
      await page.goto('/')

      // Wait for file tree to load
      const helloFile = page.locator('.file-item', { hasText: 'hello.mdx' })
      await expect(helloFile).toBeVisible({ timeout: 5000 })

      // Click on hello.mdx
      await helloFile.click()

      // Wait for content to load in textarea
      const textarea = page.locator('textarea')
      await expect(textarea).toHaveValue(/Hello World/, { timeout: 5000 })
    })

    test('should show file path in header when selected', async ({ page }) => {
      await page.goto('/')

      // Wait for file tree and click file
      const helloFile = page.locator('.file-item', { hasText: 'hello.mdx' })
      await expect(helloFile).toBeVisible({ timeout: 5000 })
      await helloFile.click()

      // Header should show the file path
      await expect(page.locator('#currentPath')).toContainText('hello.mdx', { timeout: 5000 })
    })
  })

  test.describe('Document Editing', () => {
    test('should allow editing document content', async ({ page }) => {
      await page.goto('/')

      // Wait and click file
      const helloFile = page.locator('.file-item', { hasText: 'hello.mdx' })
      await expect(helloFile).toBeVisible({ timeout: 5000 })
      await helloFile.click()

      // Wait for editor to load
      const textarea = page.locator('textarea')
      await expect(textarea).toHaveValue(/Hello World/, { timeout: 5000 })

      // Get current content
      const originalContent = await textarea.inputValue()

      // Modify content
      await textarea.fill(originalContent + '\n\n## New Section')

      // Dirty indicator should show
      await expect(page.locator('#dirtyIndicator')).toBeVisible({ timeout: 3000 })
    })

    test('should save document and persist changes', async ({ page }) => {
      const testPath = 'edit-test.mdx'
      const testFile = path.join(FIXTURES_DIR, testPath)

      // Create a test file
      fs.writeFileSync(testFile, '---\ntitle: Original\n---\n\n# Original')

      try {
        await page.goto('/')

        // Wait for file tree to refresh
        const fileItem = page.locator('.file-item', { hasText: testPath })
        await expect(fileItem).toBeVisible({ timeout: 5000 })
        await fileItem.click()

        // Wait for content to load
        const textarea = page.locator('textarea')
        await expect(textarea).toHaveValue(/Original/, { timeout: 5000 })

        // Edit the content
        await textarea.fill('---\ntitle: Modified\n---\n\n# Modified Content')

        // Click save button
        await page.click('#saveBtn')

        // Wait for save to complete
        await page.waitForTimeout(500)

        // Verify file was saved
        const content = fs.readFileSync(testFile, 'utf-8')
        expect(content).toContain('Modified')
      } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile)
        }
      }
    })
  })

  test.describe('API Integration', () => {
    test('should fetch files via API', async ({ request }) => {
      const response = await request.get('/api/files')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.files).toBeDefined()
      expect(Array.isArray(data.files)).toBe(true)
      expect(data.files.length).toBeGreaterThan(0)
    })

    test('should fetch document content via API', async ({ request }) => {
      const response = await request.get('/api/document?path=hello.mdx')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.content).toBeDefined()
      expect(data.content).toContain('Hello World')
      expect(data.doc).toBeDefined()
      expect(data.doc.data.title).toBe('Hello World')
    })

    test('should create and save document via API', async ({ request }) => {
      const testPath = 'api-test.mdx'
      const testFile = path.join(FIXTURES_DIR, testPath)
      const testContent = '---\ntitle: API Test\n---\n\n# Created via API'

      try {
        // Create via API (POST creates new document with template)
        const createResponse = await request.post('/api/document', {
          data: {
            path: testPath,
            template: testContent
          }
        })

        expect(createResponse.ok()).toBeTruthy()

        // Verify file exists
        expect(fs.existsSync(testFile)).toBe(true)

        const content = fs.readFileSync(testFile, 'utf-8')
        expect(content).toContain('API Test')
      } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile)
        }
      }
    })

    test('should update document via API', async ({ request }) => {
      const testPath = 'api-update-test.mdx'
      const testFile = path.join(FIXTURES_DIR, testPath)

      // Create initial file
      fs.writeFileSync(testFile, '---\ntitle: Initial\n---\n\n# Initial')

      try {
        // Update via API (PUT)
        const updateResponse = await request.put('/api/document', {
          data: {
            path: testPath,
            content: '---\ntitle: Updated\n---\n\n# Updated via API'
          }
        })

        expect(updateResponse.ok()).toBeTruthy()

        // Verify file was updated
        const content = fs.readFileSync(testFile, 'utf-8')
        expect(content).toContain('Updated')
      } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile)
        }
      }
    })

    test('should parse content via API', async ({ request }) => {
      const response = await request.post('/api/parse', {
        data: {
          content: '---\ntitle: Parse Test\nauthor: Test Author\n---\n\n# Content'
        }
      })

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.doc).toBeDefined()
      expect(data.doc.data.title).toBe('Parse Test')
      expect(data.doc.data.author).toBe('Test Author')
    })

    test('should delete document via API', async ({ request }) => {
      const testPath = 'api-delete-test.mdx'
      const testFile = path.join(FIXTURES_DIR, testPath)

      // Create file first
      fs.writeFileSync(testFile, '---\ntitle: Delete Me\n---\n\n# Delete')

      // Delete via API
      const response = await request.delete(`/api/document?path=${testPath}`)
      expect(response.ok()).toBeTruthy()

      // Verify file was deleted
      expect(fs.existsSync(testFile)).toBe(false)
    })
  })

  test.describe('Real-time Updates', () => {
    test('should reflect file content after reload', async ({ page }) => {
      const testPath = 'realtime-test.mdx'
      const testFile = path.join(FIXTURES_DIR, testPath)

      // Create initial file
      fs.writeFileSync(testFile, '---\ntitle: Initial\n---\n\n# Initial Content')

      try {
        await page.goto('/')

        // Wait for file to appear and click it
        const fileItem = page.locator('.file-item', { hasText: testPath })
        await expect(fileItem).toBeVisible({ timeout: 5000 })
        await fileItem.click()

        // Verify initial content
        const textarea = page.locator('textarea')
        await expect(textarea).toHaveValue(/Initial Content/, { timeout: 5000 })

        // Externally modify the file
        fs.writeFileSync(testFile, '---\ntitle: Updated Externally\n---\n\n# Updated Content')

        // Reload and check - content should reflect external changes
        await page.reload()

        // Wait for file tree to reload and click the file again
        await expect(page.locator('.file-item', { hasText: testPath })).toBeVisible({ timeout: 5000 })
        await page.locator('.file-item', { hasText: testPath }).click()

        // Content should reflect external changes
        await expect(page.locator('textarea')).toHaveValue(/Updated Content/, { timeout: 5000 })
      } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile)
        }
      }
    })
  })
})
