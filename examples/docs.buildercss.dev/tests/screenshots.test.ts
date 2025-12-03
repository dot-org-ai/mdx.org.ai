import { chromium, Browser, Page } from 'playwright'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn, ChildProcess } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// All component routes to screenshot
const components = {
  layouts: [
    'stacked',
    'sidebar',
    'docs',
    'auth',
    'dashboard',
    'fullscreen',
    'split',
  ],
  pages: [
    'home',
    'about',
    'pricing',
    'product',
    'blog',
    'article',
    'docs',
    'contact',
    'careers',
    'changelog',
    'privacy-policy',
    'terms',
    'not-found',
    'error',
    'waitlist',
  ],
  views: [
    'dashboard',
    'list',
    'grid',
    'table',
    'form',
    'detail',
    'chat',
    'settings',
    'editor',
    'user-profile',
    'users',
    'api-keys',
    'billing',
    'calendar',
    'kanban',
  ],
  sections: [
    'hero',
    'features',
    'testimonials',
    'logos',
    'faq',
    'cta',
    'stats',
    'team',
    'newsletter',
  ],
  containers: [
    'modal',
    'slideover',
    'popup',
    'drawer',
    'fullscreen',
    'inline',
  ],
}

const BASE_URL = 'http://localhost:9876'
const SCREENSHOT_DIR = join(rootDir, 'public', 'screenshots')

let browser: Browser
let page: Page
let serverProcess: ChildProcess

async function waitForServer(url: string, timeout = 30000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Server at ${url} did not start within ${timeout}ms`)
}

describe('BuilderCSS Screenshots', () => {
  beforeAll(async () => {
    // Create screenshot directories
    for (const category of Object.keys(components)) {
      const dir = join(SCREENSHOT_DIR, category)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }

    // Start the dev server
    console.log('Starting dev server...')
    serverProcess = spawn('pnpm', ['mdxe', 'dev', '--dir', rootDir, '--port', '9876'], {
      stdio: 'pipe',
      shell: true,
    })

    serverProcess.stdout?.on('data', (data) => {
      console.log(`Server: ${data}`)
    })

    serverProcess.stderr?.on('data', (data) => {
      console.error(`Server error: ${data}`)
    })

    // Wait for server to be ready
    await waitForServer(`${BASE_URL}/docs.buildercss.dev/`)
    console.log('Server ready!')

    // Launch browser
    browser = await chromium.launch({ headless: true })
    page = await browser.newPage()
    await page.setViewportSize({ width: 1280, height: 720 })
  }, 60000)

  afterAll(async () => {
    if (page) await page.close()
    if (browser) await browser.close()
    if (serverProcess) {
      serverProcess.kill('SIGTERM')
    }
  })

  // Generate tests for each category
  for (const [category, items] of Object.entries(components)) {
    describe(category, () => {
      for (const item of items) {
        it(`should capture ${item} screenshot`, async () => {
          const url = `${BASE_URL}/docs.buildercss.dev/${category}/${item}`
          const screenshotPath = join(SCREENSHOT_DIR, category, `${item}.png`)

          // Navigate to the page
          await page.goto(url, { waitUntil: 'networkidle' })

          // Wait for Preview component to render (if present)
          const preview = await page.$('[data-preview], article[data-view], article[data-page], article[data-layout], section[data-section], div[data-container]')

          if (preview) {
            // Screenshot just the preview element
            await preview.screenshot({
              path: screenshotPath,
              type: 'png',
            })
          } else {
            // Screenshot the full page if no preview found
            await page.screenshot({
              path: screenshotPath,
              type: 'png',
              fullPage: false,
            })
          }

          // Verify screenshot was created
          expect(existsSync(screenshotPath)).toBe(true)
        }, 30000)
      }
    })
  }
})
