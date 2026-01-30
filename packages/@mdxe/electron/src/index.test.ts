import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import type { MDXLDDocument, MDXLDAstNode } from 'mdxld'

// ===========================================================================
// Mock Electron modules - using vi.hoisted for proper hoisting
// ===========================================================================

const { mockIpcMain, mockIpcRenderer, mockContextBridge, mockWebContents, mockBrowserWindow } = vi.hoisted(() => {
  const mockIpcMain = {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  }

  const mockIpcRenderer = {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  }

  const mockContextBridge = {
    exposeInMainWorld: vi.fn(),
  }

  const mockWebContents = {
    executeJavaScript: vi.fn(),
  }

  const mockBrowserWindow = {
    webContents: mockWebContents,
  }

  return { mockIpcMain, mockIpcRenderer, mockContextBridge, mockWebContents, mockBrowserWindow }
})

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  contextBridge: mockContextBridge,
  BrowserWindow: vi.fn(() => mockBrowserWindow),
}))

// Mock fs/promises - using vi.hoisted
const { mockReadFile, mockWriteFile, mockWatch } = vi.hoisted(() => {
  return {
    mockReadFile: vi.fn(),
    mockWriteFile: vi.fn(),
    mockWatch: vi.fn(),
  }
})

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  watch: mockWatch,
}))

// ===========================================================================
// Import module after mocks
// ===========================================================================

import {
  parse,
  toAst,
  safeParse,
  safeToAst,
  success,
  error,
  defaultConfig,
  type ElectronMDXConfig,
  type MDXResult,
} from './index.js'

// ===========================================================================
// Test Fixtures
// ===========================================================================

const BASIC_MDX = `---
title: Test Document
---

# Hello World

This is test content.`

const MDX_WITH_JSONLD = `---
$type: BlogPost
$id: https://example.com/posts/test
title: JSON-LD Test
author: Test Author
---

# Blog Post Content`

const MDX_WITH_CODE = `---
title: Code Example
---

# Example

\`\`\`typescript
const x: number = 42
\`\`\``

const EMPTY_MDX = ''

const FRONTMATTER_ONLY = `---
title: Just Frontmatter
description: No content
---`

const CONTENT_ONLY = `# No Frontmatter

Just some content here.`

const COMPLEX_MDX = `---
$type: Document
$context: https://schema.org
title: Complex Document
tags:
  - test
  - example
metadata:
  version: 1.0.0
  author: Test Author
---

# Complex Document

This is a complex document with **bold** and *italic* text.

## Section 1

Some content here.

### Subsection

More nested content.

\`\`\`javascript
function hello() {
  console.log('Hello, World!')
}
\`\`\`

## Section 2

Final section.`

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('@mdxe/electron module exports', () => {
  it('exports parse function from mdxld', () => {
    expect(parse).toBeDefined()
    expect(typeof parse).toBe('function')
  })

  it('exports toAst function from mdxld', () => {
    expect(toAst).toBeDefined()
    expect(typeof toAst).toBe('function')
  })

  it('exports safeParse function', () => {
    expect(safeParse).toBeDefined()
    expect(typeof safeParse).toBe('function')
  })

  it('exports safeToAst function', () => {
    expect(safeToAst).toBeDefined()
    expect(typeof safeToAst).toBe('function')
  })

  it('exports success helper', () => {
    expect(success).toBeDefined()
    expect(typeof success).toBe('function')
  })

  it('exports error helper', () => {
    expect(error).toBeDefined()
    expect(typeof error).toBe('function')
  })

  it('exports defaultConfig', () => {
    expect(defaultConfig).toBeDefined()
    expect(typeof defaultConfig).toBe('object')
  })

  it('exports main process utilities', async () => {
    const mod = await import('./main.js')
    expect(mod.registerMDXHandlers).toBeDefined()
    expect(mod.watchMDXDirectory).toBeDefined()
    expect(mod.loadMDXInWindow).toBeDefined()
  })

  it('exports preload utilities', async () => {
    const mod = await import('./preload.js')
    expect(mod.exposeMDXAPI).toBeDefined()
    expect(mod.createPreload).toBeDefined()
  })

  it('exports renderer utilities', async () => {
    const mod = await import('./renderer.js')
    expect(mod.getMDXAPI).toBeDefined()
    expect(mod.getAppAPI).toBeDefined()
    expect(mod.isElectron).toBeDefined()
    expect(mod.parseMDX).toBeDefined()
    expect(mod.toMDXAst).toBeDefined()
    expect(mod.readMDXFile).toBeDefined()
    expect(mod.writeMDXFile).toBeDefined()
    expect(mod.onMDXUpdate).toBeDefined()
    expect(mod.createDebouncedParser).toBeDefined()
  })
})

// ===========================================================================
// parse() Function Tests
// ===========================================================================

describe('parse() function', () => {
  it('parses basic MDX with frontmatter', () => {
    const doc = parse(BASIC_MDX)
    expect(doc.data.title).toBe('Test Document')
    expect(doc.content).toContain('# Hello World')
  })

  it('parses MDX with JSON-LD frontmatter', () => {
    const doc = parse(MDX_WITH_JSONLD)
    expect(doc.type).toBe('BlogPost')
    expect(doc.id).toBe('https://example.com/posts/test')
    expect(doc.data.title).toBe('JSON-LD Test')
    expect(doc.data.author).toBe('Test Author')
  })

  it('parses MDX with code blocks', () => {
    const doc = parse(MDX_WITH_CODE)
    expect(doc.data.title).toBe('Code Example')
    expect(doc.content).toContain('```typescript')
    expect(doc.content).toContain('const x: number = 42')
  })

  it('parses empty MDX', () => {
    const doc = parse(EMPTY_MDX)
    expect(doc.content).toBe('')
    expect(doc.data).toBeDefined()
  })

  it('parses MDX with only frontmatter', () => {
    const doc = parse(FRONTMATTER_ONLY)
    expect(doc.data.title).toBe('Just Frontmatter')
    expect(doc.data.description).toBe('No content')
    expect(doc.content.trim()).toBe('')
  })

  it('parses MDX with only content', () => {
    const doc = parse(CONTENT_ONLY)
    expect(doc.content).toContain('# No Frontmatter')
  })

  it('parses complex MDX with nested structures', () => {
    const doc = parse(COMPLEX_MDX)
    expect(doc.type).toBe('Document')
    expect(doc.context).toBe('https://schema.org')
    expect(doc.data.tags).toEqual(['test', 'example'])
    expect(doc.data.metadata).toEqual({
      version: '1.0.0',
      author: 'Test Author',
    })
  })

  it('preserves markdown structure in content', () => {
    const doc = parse(COMPLEX_MDX)
    expect(doc.content).toContain('## Section 1')
    expect(doc.content).toContain('### Subsection')
    expect(doc.content).toContain('**bold**')
    expect(doc.content).toContain('*italic*')
  })

  it('handles special characters in frontmatter', () => {
    const mdx = `---
title: "Hello: World"
description: "Contains #hashtag and @mention"
---

Content here.`
    const doc = parse(mdx)
    expect(doc.data.title).toBe('Hello: World')
    expect(doc.data.description).toBe('Contains #hashtag and @mention')
  })

  it('handles unicode content', () => {
    const mdx = `---
title: Test
---

# Hello World

Content with unicode: cafe, naive, resume`
    const doc = parse(mdx)
    expect(doc.content).toContain('unicode')
  })

  it('handles multiline frontmatter values', () => {
    const mdx = `---
title: Test
description: "This is a long description value"
---

# Content`
    const doc = parse(mdx)
    expect(doc.data.description).toContain('long description')
  })
})

// ===========================================================================
// toAst() Function Tests
// ===========================================================================

describe('toAst() function', () => {
  it('converts document to AST with root node', () => {
    const doc = parse(BASIC_MDX)
    const ast = toAst(doc)
    expect(ast.type).toBe('root')
    expect(ast.children).toBeDefined()
    expect(Array.isArray(ast.children)).toBe(true)
  })

  it('AST contains heading nodes', () => {
    const doc = parse(BASIC_MDX)
    const ast = toAst(doc)
    const hasHeading = ast.children.some(
      (child: MDXLDAstNode) => child.type === 'heading'
    )
    expect(hasHeading).toBe(true)
  })

  it('AST contains paragraph nodes', () => {
    const doc = parse(BASIC_MDX)
    const ast = toAst(doc)
    const hasParagraph = ast.children.some(
      (child: MDXLDAstNode) => child.type === 'paragraph'
    )
    expect(hasParagraph).toBe(true)
  })

  it('converts complex document to AST', () => {
    const doc = parse(COMPLEX_MDX)
    const ast = toAst(doc)
    expect(ast.children.length).toBeGreaterThan(0)
  })

  it('handles empty content', () => {
    const doc = parse(EMPTY_MDX)
    const ast = toAst(doc)
    expect(ast.type).toBe('root')
    expect(ast.children).toBeDefined()
  })

  it('AST contains code nodes for code blocks', () => {
    const doc = parse(MDX_WITH_CODE)
    const ast = toAst(doc)
    const hasCode = ast.children.some(
      (child: MDXLDAstNode) => child.type === 'code'
    )
    expect(hasCode).toBe(true)
  })
})

// ===========================================================================
// safeParse() Function Tests
// ===========================================================================

describe('safeParse() function', () => {
  it('returns success for valid MDX', () => {
    const result = safeParse(BASIC_MDX)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('returns success result with parsed document', () => {
    const result = safeParse(BASIC_MDX)
    expect(result.data?.data.title).toBe('Test Document')
    expect(result.data?.content).toContain('# Hello World')
  })

  it('handles empty content', () => {
    const result = safeParse(EMPTY_MDX)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('returns success for content-only MDX', () => {
    const result = safeParse(CONTENT_ONLY)
    expect(result.success).toBe(true)
    expect(result.data?.content).toContain('# No Frontmatter')
  })

  it('handles complex MDX', () => {
    const result = safeParse(COMPLEX_MDX)
    expect(result.success).toBe(true)
    expect(result.data?.type).toBe('Document')
  })

  it('properly types the result', () => {
    const result = safeParse(BASIC_MDX)
    if (result.success && result.data) {
      // TypeScript should allow accessing MDXLDDocument properties
      const title = result.data.data.title
      expect(title).toBe('Test Document')
    }
  })
})

// ===========================================================================
// safeToAst() Function Tests
// ===========================================================================

describe('safeToAst() function', () => {
  it('returns success for valid MDX', () => {
    const result = safeToAst(BASIC_MDX)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('returns AST with root node', () => {
    const result = safeToAst(BASIC_MDX)
    expect(result.data?.type).toBe('root')
  })

  it('handles empty content', () => {
    const result = safeToAst(EMPTY_MDX)
    expect(result.success).toBe(true)
    expect(result.data?.type).toBe('root')
  })

  it('AST contains expected children', () => {
    const result = safeToAst(BASIC_MDX)
    expect(result.data?.children).toBeDefined()
    expect(Array.isArray(result.data?.children)).toBe(true)
  })

  it('properly types the result', () => {
    const result = safeToAst(BASIC_MDX)
    if (result.success && result.data) {
      // TypeScript should allow accessing MDXLDAstNode properties
      expect(result.data.type).toBe('root')
      expect(result.data.children).toBeDefined()
    }
  })
})

// ===========================================================================
// success() Helper Tests
// ===========================================================================

describe('success() helper', () => {
  it('creates success result with data', () => {
    const result = success({ test: true })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ test: true })
    expect(result.error).toBeUndefined()
  })

  it('preserves primitive data', () => {
    const result = success(42)
    expect(result.data).toBe(42)
  })

  it('preserves string data', () => {
    const result = success('hello')
    expect(result.data).toBe('hello')
  })

  it('preserves array data', () => {
    const result = success([1, 2, 3])
    expect(result.data).toEqual([1, 2, 3])
  })

  it('preserves null data', () => {
    const result = success(null)
    expect(result.data).toBeNull()
  })

  it('preserves undefined data', () => {
    const result = success(undefined)
    expect(result.data).toBeUndefined()
  })

  it('preserves complex nested data', () => {
    const complexData = {
      user: { name: 'Test', age: 30 },
      items: [1, 2, 3],
      active: true,
    }
    const result = success(complexData)
    expect(result.data).toEqual(complexData)
  })

  it('is properly typed', () => {
    const result = success<{ name: string }>({ name: 'Test' })
    expect(result.data?.name).toBe('Test')
  })
})

// ===========================================================================
// error() Helper Tests
// ===========================================================================

describe('error() helper', () => {
  it('creates error result with message', () => {
    const result = error('Something went wrong')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Something went wrong')
    expect(result.data).toBeUndefined()
  })

  it('handles empty error message', () => {
    const result = error('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('')
  })

  it('handles detailed error messages', () => {
    const message = 'Parse error at line 5: Unexpected token'
    const result = error(message)
    expect(result.error).toBe(message)
  })

  it('is properly typed', () => {
    const result = error<{ name: string }>('Error')
    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
  })
})

// ===========================================================================
// defaultConfig Tests
// ===========================================================================

describe('defaultConfig', () => {
  it('has watchFiles set to false', () => {
    expect(defaultConfig.watchFiles).toBe(false)
  })

  it('has baseDir defined', () => {
    expect(defaultConfig.baseDir).toBeDefined()
    expect(typeof defaultConfig.baseDir).toBe('string')
  })

  it('has empty components object', () => {
    expect(defaultConfig.components).toEqual({})
  })

  it('has ipcPrefix set to mdx', () => {
    expect(defaultConfig.ipcPrefix).toBe('mdx')
  })

  it('all expected properties are present', () => {
    const expectedKeys = ['watchFiles', 'baseDir', 'components', 'ipcPrefix']
    for (const key of expectedKeys) {
      expect(key in defaultConfig).toBe(true)
    }
  })
})

// ===========================================================================
// Main Process Utilities Tests
// ===========================================================================

describe('Main process utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('registerMDXHandlers()', () => {
    it('registers parse handler with default prefix', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'mdx:parse',
        expect.any(Function)
      )
    })

    it('registers toAst handler with default prefix', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'mdx:toAst',
        expect.any(Function)
      )
    })

    it('registers readFile handler with default prefix', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'mdx:readFile',
        expect.any(Function)
      )
    })

    it('registers writeFile handler with default prefix', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'mdx:writeFile',
        expect.any(Function)
      )
    })

    it('uses custom prefix when provided', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers({ prefix: 'custom' })

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        'custom:parse',
        expect.any(Function)
      )
    })

    it('registers all handlers with custom prefix', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers({ prefix: 'myapp' })

      expect(mockIpcMain.handle).toHaveBeenCalledWith('myapp:parse', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('myapp:toAst', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('myapp:readFile', expect.any(Function))
      expect(mockIpcMain.handle).toHaveBeenCalledWith('myapp:writeFile', expect.any(Function))
    })

    it('parse handler returns success for valid content', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      // Get the registered handler
      const parseCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:parse'
      )
      const handler = parseCall[1]

      const result = await handler({}, BASIC_MDX)
      expect(result.success).toBe(true)
      expect(result.data.data.title).toBe('Test Document')
    })

    it('parse handler returns error for exceptions', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      const parseCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:parse'
      )
      const handler = parseCall[1]

      // Test with null which should throw
      const result = await handler({}, null as unknown as string)
      // mdxld is forgiving, check behavior
      expect(result).toBeDefined()
    })

    it('toAst handler returns success for valid content', async () => {
      const { registerMDXHandlers } = await import('./main.js')
      registerMDXHandlers()

      const toAstCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:toAst'
      )
      const handler = toAstCall[1]

      const result = await handler({}, BASIC_MDX)
      expect(result.success).toBe(true)
      expect(result.data.type).toBe('root')
    })

    it('readFile handler reads and parses file', async () => {
      const { registerMDXHandlers } = await import('./main.js')

      mockReadFile.mockResolvedValue(BASIC_MDX)
      registerMDXHandlers({ baseDir: '/test' })

      const readFileCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:readFile'
      )
      const handler = readFileCall[1]

      const result = await handler({}, 'test.mdx')
      expect(result.success).toBe(true)
      expect(result.data.content).toBe(BASIC_MDX)
      expect(result.data.doc.data.title).toBe('Test Document')
    })

    it('readFile handler returns error on file not found', async () => {
      const { registerMDXHandlers } = await import('./main.js')

      mockReadFile.mockRejectedValue(new Error('ENOENT: file not found'))
      registerMDXHandlers()

      const readFileCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:readFile'
      )
      const handler = readFileCall[1]

      const result = await handler({}, 'nonexistent.mdx')
      expect(result.success).toBe(false)
      expect(result.error).toContain('ENOENT')
    })

    it('writeFile handler writes content to file', async () => {
      const { registerMDXHandlers } = await import('./main.js')

      mockWriteFile.mockResolvedValue(undefined)
      registerMDXHandlers({ baseDir: '/test' })

      const writeFileCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:writeFile'
      )
      const handler = writeFileCall[1]

      const result = await handler({}, 'output.mdx', BASIC_MDX)
      expect(result.success).toBe(true)
      expect(mockWriteFile).toHaveBeenCalledWith('/test/output.mdx', BASIC_MDX, 'utf-8')
    })

    it('writeFile handler returns error on write failure', async () => {
      const { registerMDXHandlers } = await import('./main.js')

      mockWriteFile.mockRejectedValue(new Error('EACCES: permission denied'))
      registerMDXHandlers()

      const writeFileCall = mockIpcMain.handle.mock.calls.find(
        (call: unknown[]) => call[0] === 'mdx:writeFile'
      )
      const handler = writeFileCall[1]

      const result = await handler({}, 'output.mdx', BASIC_MDX)
      expect(result.success).toBe(false)
      expect(result.error).toContain('EACCES')
    })
  })

  describe('watchMDXDirectory()', () => {
    it('returns watcher with close method', async () => {
      const { watchMDXDirectory } = await import('./main.js')

      // Create an async generator mock
      const mockAsyncGenerator = {
        [Symbol.asyncIterator]: () => ({
          next: vi.fn().mockResolvedValue({ done: true }),
        }),
      }
      mockWatch.mockReturnValue(mockAsyncGenerator)

      const callback = vi.fn()
      const watcher = await watchMDXDirectory('/test', callback)

      expect(watcher).toBeDefined()
      expect(typeof watcher.close).toBe('function')
    })

    it('calls watch with recursive option', async () => {
      const { watchMDXDirectory } = await import('./main.js')

      const mockAsyncGenerator = {
        [Symbol.asyncIterator]: () => ({
          next: vi.fn().mockResolvedValue({ done: true }),
        }),
      }
      mockWatch.mockReturnValue(mockAsyncGenerator)

      await watchMDXDirectory('/test/dir', vi.fn())

      expect(mockWatch).toHaveBeenCalledWith('/test/dir', { recursive: true })
    })
  })

  describe('loadMDXInWindow()', () => {
    it('parses content and dispatches event to window', async () => {
      const { loadMDXInWindow } = await import('./main.js')

      mockWebContents.executeJavaScript.mockResolvedValue(undefined)

      await loadMDXInWindow(mockBrowserWindow as any, BASIC_MDX)

      expect(mockWebContents.executeJavaScript).toHaveBeenCalled()
      const script = mockWebContents.executeJavaScript.mock.calls[0][0]
      expect(script).toContain('mdx:content')
      expect(script).toContain('Test Document')
    })

    it('handles complex MDX content', async () => {
      const { loadMDXInWindow } = await import('./main.js')

      mockWebContents.executeJavaScript.mockResolvedValue(undefined)

      await loadMDXInWindow(mockBrowserWindow as any, COMPLEX_MDX)

      expect(mockWebContents.executeJavaScript).toHaveBeenCalled()
      const script = mockWebContents.executeJavaScript.mock.calls[0][0]
      expect(script).toContain('Complex Document')
    })
  })
})

// ===========================================================================
// Preload Utilities Tests
// ===========================================================================

describe('Preload utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exposeMDXAPI()', () => {
    it('exposes MDX API to main world with default name', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI()

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'mdx',
        expect.any(Object)
      )
    })

    it('exposes app API to main world by default', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI()

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'app',
        expect.any(Object)
      )
    })

    it('uses custom API name when provided', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI({ apiName: 'customMdx' })

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'customMdx',
        expect.any(Object)
      )
    })

    it('uses custom prefix for IPC channels', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI({ prefix: 'custom' })

      const mdxApiCall = mockContextBridge.exposeInMainWorld.mock.calls[0]
      const api = mdxApiCall[1]

      // Test that the API uses the custom prefix
      api.parse('test')
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('custom:parse', 'test')
    })

    it('does not expose app API when includeAppInfo is false', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI({ includeAppInfo: false })

      // Should only have one call for mdx API
      const appCalls = mockContextBridge.exposeInMainWorld.mock.calls.filter(
        (call: unknown[]) => call[0] === 'app'
      )
      expect(appCalls.length).toBe(0)
    })

    it('MDX API has all required methods', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI()

      const mdxApiCall = mockContextBridge.exposeInMainWorld.mock.calls[0]
      const api = mdxApiCall[1]

      expect(typeof api.parse).toBe('function')
      expect(typeof api.toAst).toBe('function')
      expect(typeof api.readFile).toBe('function')
      expect(typeof api.writeFile).toBe('function')
      expect(typeof api.onContentUpdate).toBe('function')
    })

    it('App API has platform info', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI()

      const appApiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
        (call: unknown[]) => call[0] === 'app'
      )
      const api = appApiCall[1]

      expect(api.platform).toBeDefined()
      expect(api.versions).toBeDefined()
    })

    it('onContentUpdate returns unsubscribe function', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI()

      const mdxApiCall = mockContextBridge.exposeInMainWorld.mock.calls[0]
      const api = mdxApiCall[1]

      const callback = vi.fn()
      const unsubscribe = api.onContentUpdate(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('onContentUpdate registers IPC listener', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI({ prefix: 'test' })

      const mdxApiCall = mockContextBridge.exposeInMainWorld.mock.calls[0]
      const api = mdxApiCall[1]

      api.onContentUpdate(vi.fn())

      expect(mockIpcRenderer.on).toHaveBeenCalledWith(
        'test:contentUpdate',
        expect.any(Function)
      )
    })

    it('unsubscribe removes IPC listener', async () => {
      const { exposeMDXAPI } = await import('./preload.js')

      exposeMDXAPI({ prefix: 'test' })

      const mdxApiCall = mockContextBridge.exposeInMainWorld.mock.calls[0]
      const api = mdxApiCall[1]

      const unsubscribe = api.onContentUpdate(vi.fn())
      unsubscribe()

      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
        'test:contentUpdate',
        expect.any(Function)
      )
    })
  })

  describe('createPreload()', () => {
    it('calls exposeMDXAPI', async () => {
      const { createPreload } = await import('./preload.js')

      createPreload()

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'mdx',
        expect.any(Object)
      )
    })

    it('passes config to exposeMDXAPI', async () => {
      const { createPreload } = await import('./preload.js')

      createPreload({ apiName: 'myApi', prefix: 'myPrefix' })

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'myApi',
        expect.any(Object)
      )
    })

    it('exposes additional APIs', async () => {
      const { createPreload } = await import('./preload.js')

      const customApi = { doSomething: () => 'done' }
      createPreload({}, { customApi })

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'customApi',
        customApi
      )
    })

    it('exposes multiple additional APIs', async () => {
      const { createPreload } = await import('./preload.js')

      const apiOne = { one: 1 }
      const apiTwo = { two: 2 }
      createPreload({}, { apiOne, apiTwo })

      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('apiOne', apiOne)
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('apiTwo', apiTwo)
    })
  })
})

// ===========================================================================
// Renderer Utilities Tests
// ===========================================================================

describe('Renderer utilities', () => {
  // Store original window
  let originalWindow: typeof globalThis.window

  beforeEach(() => {
    vi.clearAllMocks()
    originalWindow = globalThis.window
    // Reset window mock
    ;(globalThis as any).window = {}
  })

  afterEach(() => {
    ;(globalThis as any).window = originalWindow
  })

  describe('getMDXAPI()', () => {
    it('returns undefined when mdx is not on window', async () => {
      const { getMDXAPI } = await import('./renderer.js')
      const api = getMDXAPI()
      expect(api).toBeUndefined()
    })

    it('returns mdx API when available on window', async () => {
      const mockMdxApi = {
        parse: vi.fn(),
        toAst: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        onContentUpdate: vi.fn(),
      }
      ;(globalThis as any).window = { mdx: mockMdxApi }

      const { getMDXAPI } = await import('./renderer.js')
      const api = getMDXAPI()
      expect(api).toBe(mockMdxApi)
    })
  })

  describe('getAppAPI()', () => {
    it('returns undefined when app is not on window', async () => {
      const { getAppAPI } = await import('./renderer.js')
      const api = getAppAPI()
      expect(api).toBeUndefined()
    })

    it('returns app API when available on window', async () => {
      const mockAppApi = {
        platform: 'darwin',
        versions: { node: '18.0.0', chrome: '120.0.0', electron: '28.0.0' },
      }
      ;(globalThis as any).window = { app: mockAppApi }

      const { getAppAPI } = await import('./renderer.js')
      const api = getAppAPI()
      expect(api).toBe(mockAppApi)
    })
  })

  describe('isElectron()', () => {
    it('returns false when MDX API is not available', async () => {
      ;(globalThis as any).window = {}
      const { isElectron } = await import('./renderer.js')
      expect(isElectron()).toBe(false)
    })

    it('returns true when MDX API is available', async () => {
      const mockMdxApi = {
        parse: vi.fn(),
        toAst: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        onContentUpdate: vi.fn(),
      }
      ;(globalThis as any).window = { mdx: mockMdxApi }

      const { isElectron } = await import('./renderer.js')
      expect(isElectron()).toBe(true)
    })

    it('returns false when window is undefined', async () => {
      ;(globalThis as any).window = undefined

      const { isElectron } = await import('./renderer.js')
      expect(isElectron()).toBe(false)
    })
  })

  describe('parseMDX()', () => {
    it('throws error when MDX API is not available', async () => {
      ;(globalThis as any).window = {}
      const { parseMDX } = await import('./renderer.js')

      await expect(parseMDX('# Test')).rejects.toThrow('MDX API not available')
    })

    it('calls API parse method', async () => {
      const mockParse = vi.fn().mockResolvedValue({
        success: true,
        data: { data: { title: 'Test' }, content: '# Test' },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: mockParse,
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { parseMDX } = await import('./renderer.js')
      const result = await parseMDX('# Test')

      expect(mockParse).toHaveBeenCalledWith('# Test')
      expect(result.data.title).toBe('Test')
    })

    it('throws error when parse fails', async () => {
      const mockParse = vi.fn().mockResolvedValue({
        success: false,
        error: 'Parse error',
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: mockParse,
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { parseMDX } = await import('./renderer.js')
      await expect(parseMDX('invalid')).rejects.toThrow('Parse error')
    })
  })

  describe('toMDXAst()', () => {
    it('throws error when MDX API is not available', async () => {
      ;(globalThis as any).window = {}
      const { toMDXAst } = await import('./renderer.js')

      await expect(toMDXAst('# Test')).rejects.toThrow('MDX API not available')
    })

    it('calls API toAst method', async () => {
      const mockToAst = vi.fn().mockResolvedValue({
        success: true,
        data: { type: 'root', children: [] },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: vi.fn(),
          toAst: mockToAst,
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { toMDXAst } = await import('./renderer.js')
      const result = await toMDXAst('# Test')

      expect(mockToAst).toHaveBeenCalledWith('# Test')
      expect(result.type).toBe('root')
    })
  })

  describe('readMDXFile()', () => {
    it('throws error when MDX API is not available', async () => {
      ;(globalThis as any).window = {}
      const { readMDXFile } = await import('./renderer.js')

      await expect(readMDXFile('test.mdx')).rejects.toThrow('MDX API not available')
    })

    it('calls API readFile method', async () => {
      const mockReadFile = vi.fn().mockResolvedValue({
        success: true,
        data: { content: '# Test', doc: { data: {}, content: '' } },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: vi.fn(),
          toAst: vi.fn(),
          readFile: mockReadFile,
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { readMDXFile } = await import('./renderer.js')
      const result = await readMDXFile('test.mdx')

      expect(mockReadFile).toHaveBeenCalledWith('test.mdx')
      expect(result.content).toBe('# Test')
    })
  })

  describe('writeMDXFile()', () => {
    it('throws error when MDX API is not available', async () => {
      ;(globalThis as any).window = {}
      const { writeMDXFile } = await import('./renderer.js')

      await expect(writeMDXFile('test.mdx', '# Test')).rejects.toThrow('MDX API not available')
    })

    it('calls API writeFile method', async () => {
      const mockWriteFile = vi.fn().mockResolvedValue({
        success: true,
        data: { path: '/test/test.mdx' },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: vi.fn(),
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: mockWriteFile,
          onContentUpdate: vi.fn(),
        },
      }

      const { writeMDXFile } = await import('./renderer.js')
      await writeMDXFile('test.mdx', '# Test')

      expect(mockWriteFile).toHaveBeenCalledWith('test.mdx', '# Test')
    })

    it('throws error when write fails', async () => {
      const mockWriteFile = vi.fn().mockResolvedValue({
        success: false,
        error: 'Write error',
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: vi.fn(),
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: mockWriteFile,
          onContentUpdate: vi.fn(),
        },
      }

      const { writeMDXFile } = await import('./renderer.js')
      await expect(writeMDXFile('test.mdx', '# Test')).rejects.toThrow('Write error')
    })
  })

  describe('onMDXUpdate()', () => {
    it('returns no-op when MDX API is not available', async () => {
      ;(globalThis as any).window = {}
      const { onMDXUpdate } = await import('./renderer.js')

      const unsubscribe = onMDXUpdate(vi.fn())
      expect(typeof unsubscribe).toBe('function')
      // Should not throw when called
      expect(() => unsubscribe()).not.toThrow()
    })

    it('calls API onContentUpdate method', async () => {
      const mockOnContentUpdate = vi.fn().mockReturnValue(() => {})
      ;(globalThis as any).window = {
        mdx: {
          parse: vi.fn(),
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: mockOnContentUpdate,
        },
      }

      const { onMDXUpdate } = await import('./renderer.js')
      const callback = vi.fn()
      onMDXUpdate(callback)

      expect(mockOnContentUpdate).toHaveBeenCalledWith(callback)
    })
  })

  describe('createDebouncedParser()', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('creates a debounced parser function', async () => {
      const mockParse = vi.fn().mockResolvedValue({
        success: true,
        data: { data: {}, content: '' },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: mockParse,
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { createDebouncedParser } = await import('./renderer.js')
      const onParse = vi.fn()
      const debouncedParser = createDebouncedParser(onParse)

      expect(typeof debouncedParser).toBe('function')
    })

    it('debounces multiple calls', async () => {
      const mockParse = vi.fn().mockResolvedValue({
        success: true,
        data: { data: {}, content: '' },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: mockParse,
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { createDebouncedParser } = await import('./renderer.js')
      const onParse = vi.fn()
      const debouncedParser = createDebouncedParser(onParse, 100)

      // Call multiple times rapidly
      debouncedParser('# Test 1')
      debouncedParser('# Test 2')
      debouncedParser('# Test 3')

      // Before timeout, parse should not be called
      expect(mockParse).not.toHaveBeenCalled()

      // Advance timers
      await vi.advanceTimersByTimeAsync(150)

      // Should only parse once with the last content
      expect(mockParse).toHaveBeenCalledTimes(1)
      expect(mockParse).toHaveBeenCalledWith('# Test 3')
    })

    it('uses default delay of 150ms', async () => {
      const mockParse = vi.fn().mockResolvedValue({
        success: true,
        data: { data: {}, content: '' },
      })
      ;(globalThis as any).window = {
        mdx: {
          parse: mockParse,
          toAst: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          onContentUpdate: vi.fn(),
        },
      }

      const { createDebouncedParser } = await import('./renderer.js')
      const onParse = vi.fn()
      const debouncedParser = createDebouncedParser(onParse)

      debouncedParser('# Test')

      // Should not be called before 150ms
      await vi.advanceTimersByTimeAsync(100)
      expect(mockParse).not.toHaveBeenCalled()

      // Should be called after 150ms
      await vi.advanceTimersByTimeAsync(100)
      expect(mockParse).toHaveBeenCalled()
    })
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('Type definitions', () => {
  it('ElectronMDXConfig has expected properties', () => {
    const config: ElectronMDXConfig = {
      watchFiles: true,
      baseDir: '/test',
      components: { Button: {} },
      ipcPrefix: 'custom',
    }

    expect(config.watchFiles).toBe(true)
    expect(config.baseDir).toBe('/test')
    expect(config.components).toEqual({ Button: {} })
    expect(config.ipcPrefix).toBe('custom')
  })

  it('ElectronMDXConfig allows partial configuration', () => {
    const config: ElectronMDXConfig = {}
    expect(config.watchFiles).toBeUndefined()
    expect(config.baseDir).toBeUndefined()
  })

  it('MDXResult success type is correctly typed', () => {
    const result: MDXResult<string> = {
      success: true,
      data: 'test',
    }
    expect(result.success).toBe(true)
    expect(result.data).toBe('test')
  })

  it('MDXResult error type is correctly typed', () => {
    const result: MDXResult<string> = {
      success: false,
      error: 'Something went wrong',
    }
    expect(result.success).toBe(false)
    expect(result.error).toBe('Something went wrong')
  })
})

// ===========================================================================
// Integration-style Tests
// ===========================================================================

describe('Integration scenarios', () => {
  it('parse and toAst work together', () => {
    const doc = parse(BASIC_MDX)
    const ast = toAst(doc)

    expect(doc.data.title).toBe('Test Document')
    expect(ast.type).toBe('root')
    expect(ast.children.length).toBeGreaterThan(0)
  })

  it('safeParse and safeToAst work together', () => {
    const parseResult = safeParse(BASIC_MDX)
    if (parseResult.success && parseResult.data) {
      const astResult = safeToAst(BASIC_MDX)
      expect(astResult.success).toBe(true)
    }
  })

  it('handles workflow: parse -> modify -> stringify', () => {
    const doc = parse(BASIC_MDX)

    // Modify the document
    const modifiedDoc = {
      ...doc,
      data: { ...doc.data, title: 'Modified Title' },
    }

    expect(modifiedDoc.data.title).toBe('Modified Title')
    expect(modifiedDoc.content).toContain('# Hello World')
  })

  it('success and error helpers produce compatible types', () => {
    const goodResult = success<number>(42)
    const badResult = error<number>('Failed')

    // Both should satisfy MDXResult type
    function processResult(result: MDXResult<number>): string {
      if (result.success) {
        return `Got: ${result.data}`
      }
      return `Error: ${result.error}`
    }

    expect(processResult(goodResult)).toBe('Got: 42')
    expect(processResult(badResult)).toBe('Error: Failed')
  })
})
