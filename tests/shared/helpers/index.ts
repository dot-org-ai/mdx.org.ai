/**
 * Shared test helpers
 */

import { vi } from 'vitest'

/**
 * Create a mock JSX factory for testing mdxui components
 */
export function createMockJsx() {
  const calls: Array<{ type: unknown; props: Record<string, unknown>; children: unknown[] }> = []

  const jsx = vi.fn((type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]) => {
    const call = {
      type,
      props: props || {},
      children: children.flat(),
    }
    calls.push(call)
    return {
      $$typeof: Symbol.for('react.element'),
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children },
      key: null,
      ref: null,
    }
  })

  return {
    jsx,
    calls,
    reset: () => {
      calls.length = 0
      jsx.mockClear()
    },
    getLastCall: () => calls[calls.length - 1],
    getCallsByType: (type: string) => calls.filter((c) => c.type === type),
  }
}

/**
 * Create a mock Hono context for testing middleware
 */
export function createMockHonoContext(path: string, method = 'GET') {
  const headers = new Map<string, string>()
  let responseBody: unknown = null
  let responseStatus = 200

  return {
    req: {
      path,
      method,
      header: (name: string) => headers.get(name),
      query: (name: string) => null,
      param: (name: string) => null,
    },
    json: vi.fn((data: unknown, status?: number) => {
      responseBody = data
      if (status) responseStatus = status
      return new Response(JSON.stringify(data), {
        status: responseStatus,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
    html: vi.fn((html: string, status?: number) => {
      responseBody = html
      if (status) responseStatus = status
      return new Response(html, {
        status: responseStatus,
        headers: { 'Content-Type': 'text/html' },
      })
    }),
    text: vi.fn((text: string, status?: number) => {
      responseBody = text
      if (status) responseStatus = status
      return new Response(text, {
        status: responseStatus,
        headers: { 'Content-Type': 'text/plain' },
      })
    }),
    getResponseBody: () => responseBody,
    getResponseStatus: () => responseStatus,
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Create a deferred promise for async testing
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void
  let reject: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  }
}

/**
 * Capture console output during test
 */
export function captureConsole() {
  const logs: string[] = []
  const warns: string[] = []
  const errors: string[] = []

  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = (...args) => logs.push(args.join(' '))
  console.warn = (...args) => warns.push(args.join(' '))
  console.error = (...args) => errors.push(args.join(' '))

  return {
    logs,
    warns,
    errors,
    restore: () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
    },
  }
}

/**
 * Assert that HTML contains expected elements
 */
export function assertHtmlContains(html: string, expectations: {
  tags?: string[]
  text?: string[]
  attributes?: Record<string, string>
  notContains?: string[]
}) {
  const { tags = [], text = [], attributes = {}, notContains = [] } = expectations

  for (const tag of tags) {
    if (!html.includes(`<${tag}`) && !html.includes(`<${tag}>`)) {
      throw new Error(`Expected HTML to contain <${tag}> tag`)
    }
  }

  for (const content of text) {
    if (!html.includes(content)) {
      throw new Error(`Expected HTML to contain text: "${content}"`)
    }
  }

  for (const [attr, value] of Object.entries(attributes)) {
    const pattern = new RegExp(`${attr}=["']${value}["']`)
    if (!pattern.test(html)) {
      throw new Error(`Expected HTML to contain attribute ${attr}="${value}"`)
    }
  }

  for (const content of notContains) {
    if (html.includes(content)) {
      throw new Error(`Expected HTML to NOT contain: "${content}"`)
    }
  }
}

/**
 * Assert that markdown contains expected elements
 */
export function assertMarkdownContains(markdown: string, expectations: {
  headings?: Array<{ level: number; text: string }>
  lists?: string[]
  codeBlocks?: Array<{ lang?: string; content?: string }>
  links?: Array<{ text?: string; url?: string }>
  text?: string[]
}) {
  const { headings = [], lists = [], codeBlocks = [], links = [], text = [] } = expectations

  for (const { level, text: headingText } of headings) {
    const prefix = '#'.repeat(level)
    if (!markdown.includes(`${prefix} ${headingText}`)) {
      throw new Error(`Expected markdown to contain heading: ${prefix} ${headingText}`)
    }
  }

  for (const item of lists) {
    const hasBullet = markdown.includes(`- ${item}`) || markdown.includes(`* ${item}`)
    const hasNumber = /\d+\.\s/.test(markdown) && markdown.includes(item)
    if (!hasBullet && !hasNumber) {
      throw new Error(`Expected markdown to contain list item: ${item}`)
    }
  }

  for (const { lang, content } of codeBlocks) {
    if (lang && !markdown.includes(`\`\`\`${lang}`)) {
      throw new Error(`Expected markdown to contain code block with language: ${lang}`)
    }
    if (content && !markdown.includes(content)) {
      throw new Error(`Expected markdown to contain code: ${content}`)
    }
  }

  for (const { text: linkText, url } of links) {
    if (linkText && url && !markdown.includes(`[${linkText}](${url})`)) {
      throw new Error(`Expected markdown to contain link: [${linkText}](${url})`)
    }
  }

  for (const content of text) {
    if (!markdown.includes(content)) {
      throw new Error(`Expected markdown to contain text: "${content}"`)
    }
  }
}

/**
 * Compare two objects for structural equality (ignoring undefined values)
 */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object' || a === null || b === null) return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>

  const aKeys = Object.keys(aObj).filter((k) => aObj[k] !== undefined)
  const bKeys = Object.keys(bObj).filter((k) => bObj[k] !== undefined)

  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!structurallyEqual(aObj[key], bObj[key])) return false
  }

  return true
}
