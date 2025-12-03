/**
 * @mdxdb/sources - Web scraping source adapter
 * Supports: fetch + linkedom, HTMLRewriter (CF Workers), Playwright
 */

import type {
  ScraperSourceConfig,
  SelectorConfig,
  PageConfig,
  SourceRequest,
  SourceResponse,
  SourceClient,
  CacheConfig,
  TransformConfig,
  TransformContext,
} from './types.js'
import { CacheManager, createCacheConfig, defaultCache } from './cache.js'
import { createProxyFetch } from './proxy.js'

/**
 * Extracted data from a page
 */
export interface ScrapedData {
  [key: string]: unknown
}

/**
 * HTMLRewriter handler types (Cloudflare Workers)
 */
interface HTMLRewriterElement {
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  prepend(content: string, options?: { html?: boolean }): void
  append(content: string, options?: { html?: boolean }): void
  setInnerContent(content: string, options?: { html?: boolean }): void
  remove(): void
  tagName: string
}

interface HTMLRewriterText {
  text: string
  lastInTextNode: boolean
}

interface HTMLRewriter {
  on(selector: string, handlers: {
    element?: (element: HTMLRewriterElement) => void
    text?: (text: HTMLRewriterText) => void
  }): HTMLRewriter
  transform(response: Response): Response
}

/**
 * Playwright browser types
 */
interface PlaywrightBrowser {
  newPage(): Promise<PlaywrightPage>
  close(): Promise<void>
}

interface PlaywrightPage {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>
  content(): Promise<string>
  $(selector: string): Promise<PlaywrightElementHandle | null>
  $$(selector: string): Promise<PlaywrightElementHandle[]>
  evaluate<T>(fn: () => T): Promise<T>
  close(): Promise<void>
  setExtraHTTPHeaders(headers: Record<string, string>): Promise<void>
}

interface PlaywrightElementHandle {
  textContent(): Promise<string | null>
  getAttribute(name: string): Promise<string | null>
  $(selector: string): Promise<PlaywrightElementHandle | null>
  $$(selector: string): Promise<PlaywrightElementHandle[]>
}

/**
 * DOM-like interface for linkedom compatibility
 */
interface DOMElement {
  querySelector(selector: string): DOMElement | null
  querySelectorAll(selector: string): DOMElement[] | ArrayLike<DOMElement>
  getAttribute(name: string): string | null
  textContent: string | null
}

interface DOMDocument {
  querySelector(selector: string): DOMElement | null
  querySelectorAll(selector: string): DOMElement[] | ArrayLike<DOMElement>
}

/**
 * Scraper source client
 */
export class ScraperSource implements SourceClient<ScraperSourceConfig> {
  readonly config: ScraperSourceConfig
  private fetchFn: typeof fetch
  private cache: CacheManager
  private browser?: PlaywrightBrowser

  constructor(config: ScraperSourceConfig, cache?: CacheManager) {
    this.config = {
      ...config,
      engine: config.engine || 'fetch',
    }
    this.cache = cache || defaultCache

    // Set up fetch with proxy if configured
    this.fetchFn = config.proxy
      ? createProxyFetch(config.proxy)
      : fetch.bind(globalThis)
  }

  /**
   * Execute a scraping request
   */
  async request<R = unknown>(req: SourceRequest): Promise<SourceResponse<R>> {
    const url = this.buildUrl(req)

    // Get cache config
    const pageConfig = this.findPageConfig(req.path)
    const cacheConfig = pageConfig?.cache
      ? createCacheConfig(pageConfig.cache)
      : this.config.cache
        ? createCacheConfig(this.config.cache)
        : null

    // Check cache
    if (cacheConfig && req.method === 'GET') {
      const cacheKey = this.cache.generateKey(req, cacheConfig)

      const result = await this.cache.get<R>(
        cacheKey,
        () => this.scrape<R>(url, pageConfig),
        cacheConfig
      )

      return {
        data: result.data,
        status: 200,
        headers: new Headers(),
        cached: result.cached,
        stale: result.stale,
        cacheKey,
      }
    }

    // Scrape directly
    const data = await this.scrape<R>(url, pageConfig)

    return {
      data,
      status: 200,
      headers: new Headers(),
      cached: false,
      stale: false,
    }
  }

  /**
   * Scrape a URL
   */
  async scrape<R = unknown>(url: string, pageConfig?: PageConfig | null): Promise<R> {
    const engine = this.config.engine

    let html: string
    let response: Response | undefined

    // Fetch HTML based on engine
    if (engine === 'playwright') {
      html = await this.scrapeWithPlaywright(url)
    } else if (engine === 'htmlrewriter') {
      // For HTMLRewriter, we process during fetch
      const result = await this.scrapeWithHTMLRewriter(url, pageConfig)
      return result as R
    } else {
      // Default: fetch + parse with linkedom
      const result = await this.fetchHtml(url)
      html = result.html
      response = result.response
    }

    // Parse HTML and extract data
    const data = await this.extractData(html, pageConfig)

    // Apply transform
    const transform = pageConfig?.transform || this.config.transform
    if (transform?.response && response) {
      const context: TransformContext = {
        request: { method: 'GET', path: url },
        response,
        source: this.config,
      }
      return (await transform.response(data, context)) as R
    }

    return data as R
  }

  /**
   * Fetch HTML content
   */
  private async fetchHtml(url: string): Promise<{ html: string; response: Response }> {
    const headers = new Headers(this.config.headers)

    if (this.config.userAgent) {
      headers.set('User-Agent', this.config.userAgent)
    }

    const response = await this.fetchFn(url, { headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    return { html, response }
  }

  /**
   * Scrape using Playwright (for JS-rendered pages)
   */
  private async scrapeWithPlaywright(url: string): Promise<string> {
    // Dynamically import playwright (optional peer dependency)
    let playwright: { chromium: { launch(): Promise<PlaywrightBrowser> } }
    try {
      // @ts-expect-error - playwright is an optional peer dependency
      playwright = await import('playwright')
    } catch {
      throw new Error('Playwright not installed. Run: npm install playwright')
    }

    // Launch browser if not already running
    if (!this.browser) {
      this.browser = await playwright.chromium.launch()
    }

    const page = await this.browser.newPage()

    try {
      // Set headers
      if (this.config.headers) {
        await page.setExtraHTTPHeaders(this.config.headers)
      }

      // Navigate to page
      const jsConfig = this.config.javascript
      await page.goto(url, {
        waitUntil: jsConfig?.waitUntil || 'networkidle',
        timeout: jsConfig?.timeout || 30000,
      })

      // Get page content
      return await page.content()
    } finally {
      await page.close()
    }
  }

  /**
   * Scrape using HTMLRewriter (Cloudflare Workers)
   */
  private async scrapeWithHTMLRewriter(
    url: string,
    pageConfig?: PageConfig | null
  ): Promise<ScrapedData> {
    // @ts-expect-error - HTMLRewriter is available in CF Workers
    const HTMLRewriterClass = globalThis.HTMLRewriter as new () => HTMLRewriter

    if (!HTMLRewriterClass) {
      throw new Error('HTMLRewriter not available. Use fetch engine instead.')
    }

    const headers = new Headers(this.config.headers)
    if (this.config.userAgent) {
      headers.set('User-Agent', this.config.userAgent)
    }

    const response = await this.fetchFn(url, { headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Determine which selectors to use
    const selectorNames = pageConfig?.selectors || Object.keys(this.config.selectors)
    const results: ScrapedData = {}

    // Build HTMLRewriter with all selectors
    let rewriter = new HTMLRewriterClass()

    for (const name of selectorNames) {
      const config = this.config.selectors[name]
      if (!config) continue

      const collectedText: string[] = []

      rewriter = rewriter.on(config.selector, {
        element: (element) => {
          if (config.attribute) {
            const value = element.getAttribute(config.attribute)
            if (value) {
              if (config.multiple) {
                if (!results[name]) results[name] = []
                ;(results[name] as string[]).push(value)
              } else {
                results[name] = value
              }
            }
          }
        },
        text: (text) => {
          if (!config.attribute) {
            collectedText.push(text.text)
            if (text.lastInTextNode) {
              const fullText = collectedText.join('').trim()
              if (fullText) {
                if (config.multiple) {
                  if (!results[name]) results[name] = []
                  ;(results[name] as string[]).push(fullText)
                } else {
                  results[name] = fullText
                }
              }
              collectedText.length = 0
            }
          }
        },
      })
    }

    // Process the response (consume it)
    const transformed = rewriter.transform(response)
    await transformed.text()

    // Apply transforms to each selector
    for (const name of selectorNames) {
      const config = this.config.selectors[name]
      if (config?.transform && results[name] !== undefined) {
        results[name] = config.transform(results[name] as string | string[] | null)
      }
    }

    return results
  }

  /**
   * Extract data from HTML using selectors
   */
  private async extractData(
    html: string,
    pageConfig?: PageConfig | null
  ): Promise<ScrapedData> {
    // Use linkedom for parsing
    const { parseHTML } = await import('linkedom')
    const { document } = parseHTML(html) as { document: DOMDocument }

    // Determine which selectors to use
    const selectorNames = pageConfig?.selectors || Object.keys(this.config.selectors)
    const results: ScrapedData = {}

    for (const name of selectorNames) {
      const config = this.config.selectors[name]
      if (!config) continue

      results[name] = this.extractWithSelector(document, config)
    }

    return results
  }

  /**
   * Extract data using a selector config
   */
  private extractWithSelector(
    root: DOMDocument | DOMElement,
    config: SelectorConfig
  ): unknown {
    const elements = config.multiple
      ? Array.from(root.querySelectorAll(config.selector))
      : [root.querySelector(config.selector)].filter((el): el is DOMElement => el !== null)

    if (elements.length === 0) {
      return config.multiple ? [] : null
    }

    const extractValue = (el: DOMElement): unknown => {
      // Handle nested selectors
      if (config.children) {
        const nested: Record<string, unknown> = {}
        for (const [childName, childConfig] of Object.entries(config.children)) {
          nested[childName] = this.extractWithSelector(el, childConfig)
        }
        return nested
      }

      // Extract attribute or text content
      let value: string | null
      if (config.attribute) {
        value = el.getAttribute(config.attribute)
      } else {
        value = el.textContent?.trim() ?? null
      }

      // Apply transform
      if (config.transform) {
        return config.transform(value)
      }

      return value
    }

    if (config.multiple) {
      return elements.map(extractValue)
    }

    const firstElement = elements[0]
    if (!firstElement) {
      return null
    }
    return extractValue(firstElement)
  }

  /**
   * Build full URL from request
   */
  private buildUrl(req: SourceRequest): string {
    let path = req.path

    // Replace path parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value))
      }
    }

    const url = new URL(path, this.config.baseUrl)

    // Add query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v)
          }
        } else {
          url.searchParams.set(key, value)
        }
      }
    }

    return url.toString()
  }

  /**
   * Find page config by path
   */
  private findPageConfig(path: string): PageConfig | null {
    if (!this.config.pages) return null

    for (const [, pageConfig] of Object.entries(this.config.pages)) {
      const pattern = pageConfig.path.replace(/:\w+/g, '[^/]+')
      if (new RegExp(`^${pattern}$`).test(path)) {
        return pageConfig
      }
    }

    return null
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(key?: string, tags?: string[]): Promise<void> {
    await this.cache.invalidate(key, tags)
  }

  /**
   * Scrape a named page
   */
  async page<R = unknown>(
    name: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): Promise<R> {
    const pageConfig = this.config.pages?.[name]
    if (!pageConfig) {
      throw new Error(`Page "${name}" not found`)
    }

    const response = await this.request<R>({
      method: 'GET',
      path: pageConfig.path,
      params,
      query,
    })

    return response.data
  }

  /**
   * Close browser if using Playwright
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = undefined
    }
  }
}

/**
 * Create a scraper source from configuration
 */
export function createScraperSource(
  config: ScraperSourceConfig,
  cache?: CacheManager
): ScraperSource {
  return new ScraperSource(config, cache)
}

/**
 * Selector builder helpers
 */
export const select = {
  /** Select text content */
  text(selector: string): SelectorConfig {
    return { selector }
  },

  /** Select attribute value */
  attr(selector: string, attribute: string): SelectorConfig {
    return { selector, attribute }
  },

  /** Select href attribute */
  href(selector: string): SelectorConfig {
    return { selector, attribute: 'href' }
  },

  /** Select src attribute */
  src(selector: string): SelectorConfig {
    return { selector, attribute: 'src' }
  },

  /** Select multiple elements */
  all(selector: string, config?: Partial<SelectorConfig>): SelectorConfig {
    return { selector, multiple: true, ...config }
  },

  /** Select with nested children */
  nested(
    selector: string,
    children: Record<string, SelectorConfig>
  ): SelectorConfig {
    return { selector, children }
  },

  /** Select with transform */
  transform<T>(
    selector: string,
    transform: (value: string | string[] | null) => T
  ): SelectorConfig {
    return { selector, transform }
  },
}

/**
 * Common transforms
 */
export const transforms = {
  /** Parse as number */
  number: (value: string | string[] | null) => {
    if (value === null) return null
    const str = Array.isArray(value) ? value[0] ?? '' : value
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''))
    return isNaN(num) ? null : num
  },

  /** Parse as integer */
  int: (value: string | string[] | null) => {
    if (value === null) return null
    const str = Array.isArray(value) ? value[0] ?? '' : value
    const num = parseInt(str.replace(/[^0-9-]/g, ''))
    return isNaN(num) ? null : num
  },

  /** Parse as boolean */
  boolean: (value: string | string[] | null) => {
    if (value === null) return false
    const str = Array.isArray(value) ? value[0] ?? '' : value
    return ['true', 'yes', '1'].includes(str.toLowerCase())
  },

  /** Parse as date */
  date: (value: string | string[] | null) => {
    if (value === null) return null
    const str = Array.isArray(value) ? value[0] ?? '' : value
    if (!str) return null
    const date = new Date(str)
    return isNaN(date.getTime()) ? null : date
  },

  /** Trim whitespace */
  trim: (value: string | string[] | null) => {
    if (value === null) return null
    if (Array.isArray(value)) return value.map((v) => v.trim())
    return value.trim()
  },

  /** Make URL absolute */
  absoluteUrl: (baseUrl: string) => (value: string | string[] | null) => {
    if (value === null) return null
    const resolve = (v: string) => new URL(v, baseUrl).toString()
    if (Array.isArray(value)) return value.map(resolve)
    return resolve(value)
  },

  /** Extract JSON from script tag */
  json: <T>(value: string | string[] | null): T | null => {
    if (value === null) return null
    try {
      const str = Array.isArray(value) ? value[0] ?? '' : value
      if (!str) return null
      return JSON.parse(str) as T
    } catch {
      return null
    }
  },
}
