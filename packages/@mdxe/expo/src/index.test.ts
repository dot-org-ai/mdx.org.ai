import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import type { MDXLDDocument, MDXLDAstNode } from 'mdxld'

// ===========================================================================
// Mock React Native modules - using vi.hoisted for proper hoisting
// ===========================================================================

const {
  mockText,
  mockView,
  mockImage,
  mockPressable,
  mockLinking,
  mockStyleSheet,
  mockPlatform,
} = vi.hoisted(() => {
  const mockLinking = {
    openURL: vi.fn(),
    canOpenURL: vi.fn().mockResolvedValue(true),
    getInitialURL: vi.fn().mockResolvedValue(null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }

  const mockStyleSheet = {
    create: vi.fn((styles: Record<string, unknown>) => styles),
    flatten: vi.fn((styles: unknown[]) => Object.assign({}, ...styles)),
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  }

  const mockPlatform = {
    OS: 'ios',
    Version: '16.0',
    select: vi.fn((options: Record<string, unknown>) => options.ios ?? options.default),
  }

  const mockText = vi.fn((props: unknown) => props)
  const mockView = vi.fn((props: unknown) => props)
  const mockImage = vi.fn((props: unknown) => props)
  const mockPressable = vi.fn((props: unknown) => props)

  return {
    mockText,
    mockView,
    mockImage,
    mockPressable,
    mockLinking,
    mockStyleSheet,
    mockPlatform,
  }
})

vi.mock('react-native', () => ({
  Text: mockText,
  View: mockView,
  Image: mockImage,
  Pressable: mockPressable,
  Linking: mockLinking,
  StyleSheet: mockStyleSheet,
  Platform: mockPlatform,
}))

// ===========================================================================
// Import modules after mocks
// ===========================================================================

import {
  parse,
  createMDXRuntime,
  fetchMDX,
  loadMDX,
  defaultConfig,
  type ExpoMDXConfig,
  type MDXEvaluateResult,
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

const MDX_WITH_IMAGES = `---
title: Image Gallery
---

# Gallery

![Alt Text](https://example.com/image.png)

Some text.

![Another Image](./local/image.jpg)`

const MDX_WITH_LINKS = `---
title: Links Example
---

# Links

[External Link](https://example.com)

[Internal Link](/docs/intro)

[Deep Link](myapp://screen/details)`

const MDX_WITH_LISTS = `---
title: Lists
---

# Lists

- Item 1
- Item 2
- Item 3

1. First
2. Second
3. Third`

const MDX_WITH_BLOCKQUOTE = `---
title: Quote
---

# Quote

> This is a blockquote
> spanning multiple lines`

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('@mdxe/expo module exports', () => {
  it('exports parse function from mdxld', () => {
    expect(parse).toBeDefined()
    expect(typeof parse).toBe('function')
  })

  it('exports createMDXRuntime function', () => {
    expect(createMDXRuntime).toBeDefined()
    expect(typeof createMDXRuntime).toBe('function')
  })

  it('exports fetchMDX function', () => {
    expect(fetchMDX).toBeDefined()
    expect(typeof fetchMDX).toBe('function')
  })

  it('exports loadMDX function', () => {
    expect(loadMDX).toBeDefined()
    expect(typeof loadMDX).toBe('function')
  })

  it('exports defaultConfig', () => {
    expect(defaultConfig).toBeDefined()
    expect(typeof defaultConfig).toBe('object')
  })

  it('exports component utilities from components.js', async () => {
    const mod = await import('./components.js')
    expect(mod.createMDXComponents).toBeDefined()
    expect(mod.MDXDocument).toBeDefined()
    expect(mod.MDXContent).toBeDefined()
    expect(mod.defaultTheme).toBeDefined()
    expect(mod.darkTheme).toBeDefined()
  })

  it('exports router utilities from router.js', async () => {
    const mod = await import('./router.js')
    expect(mod.extractRouteMetadata).toBeDefined()
    expect(mod.createMDXRoute).toBeDefined()
    expect(mod.createRouteLoader).toBeDefined()
    expect(mod.useMDXRoute).toBeDefined()
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

  it('handles MDX with images', () => {
    const doc = parse(MDX_WITH_IMAGES)
    expect(doc.content).toContain('![Alt Text]')
    expect(doc.content).toContain('https://example.com/image.png')
  })

  it('handles MDX with links', () => {
    const doc = parse(MDX_WITH_LINKS)
    expect(doc.content).toContain('[External Link]')
    expect(doc.content).toContain('[Deep Link]')
  })
})

// ===========================================================================
// createMDXRuntime() Tests
// ===========================================================================

describe('createMDXRuntime()', () => {
  it('creates a runtime with default config', () => {
    const runtime = createMDXRuntime()
    expect(runtime.getConfig()).toEqual(defaultConfig)
  })

  it('merges custom config with defaults', () => {
    const customConfig: ExpoMDXConfig = {
      components: { CustomButton: () => null },
      useRouter: false,
    }

    const runtime = createMDXRuntime(customConfig)
    const config = runtime.getConfig()

    expect(config.useRouter).toBe(false)
    expect(config.components?.CustomButton).toBeDefined()
  })

  it('parses content via runtime', () => {
    const runtime = createMDXRuntime()

    const doc = runtime.parse(`---
title: Test
---

# Hello`)

    expect(doc.data.title).toBe('Test')
    expect(doc.content).toContain('# Hello')
  })

  it('returns available components', () => {
    const runtime = createMDXRuntime({
      components: {
        Button: () => null,
        Card: () => null,
      },
    })

    const components = runtime.getComponents()

    expect(Object.keys(components)).toContain('Button')
    expect(Object.keys(components)).toContain('Card')
  })

  it('handles empty component config', () => {
    const runtime = createMDXRuntime({
      components: {},
    })

    const components = runtime.getComponents()
    expect(components).toEqual({})
  })

  it('preserves scope configuration', () => {
    const runtime = createMDXRuntime({
      scope: { customVar: 'value' },
    })

    const config = runtime.getConfig()
    expect(config.scope?.customVar).toBe('value')
  })

  it('preserves baseUrl configuration', () => {
    const runtime = createMDXRuntime({
      baseUrl: 'https://example.com',
    })

    const config = runtime.getConfig()
    expect(config.baseUrl).toBe('https://example.com')
  })

  it('runtime methods are chainable', () => {
    const runtime = createMDXRuntime()
    const doc = runtime.parse('# Test')
    const config = runtime.getConfig()
    const components = runtime.getComponents()

    expect(doc).toBeDefined()
    expect(config).toBeDefined()
    expect(components).toBeDefined()
  })
})

// ===========================================================================
// fetchMDX() Tests
// ===========================================================================

describe('fetchMDX()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and parses MDX from URL', async () => {
    const mockContent = `---
title: Remote Content
---

# Fetched

This was fetched from a URL.`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockContent),
    })

    const doc = await fetchMDX('https://example.com/content.mdx')

    expect(doc.data.title).toBe('Remote Content')
    expect(doc.content).toContain('# Fetched')
  })

  it('throws error on failed fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    })

    await expect(fetchMDX('https://example.com/missing.mdx')).rejects.toThrow(
      'Failed to fetch MDX from https://example.com/missing.mdx: Not Found'
    )
  })

  it('handles network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(fetchMDX('https://example.com/content.mdx')).rejects.toThrow('Network error')
  })

  it('parses frontmatter from remote content', async () => {
    const mockContent = `---
$type: Article
$id: https://example.com/articles/1
title: Remote Article
author: Remote Author
tags:
  - remote
  - test
---

# Remote Article Content`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockContent),
    })

    const doc = await fetchMDX('https://example.com/article.mdx')

    expect(doc.type).toBe('Article')
    expect(doc.id).toBe('https://example.com/articles/1')
    expect(doc.data.tags).toEqual(['remote', 'test'])
  })

  it('handles empty response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(''),
    })

    const doc = await fetchMDX('https://example.com/empty.mdx')

    expect(doc.content).toBe('')
  })

  it('handles 500 server error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    })

    await expect(fetchMDX('https://example.com/error.mdx')).rejects.toThrow(
      'Failed to fetch MDX from https://example.com/error.mdx: Internal Server Error'
    )
  })
})

// ===========================================================================
// loadMDX() Tests
// ===========================================================================

describe('loadMDX()', () => {
  it('throws not implemented error', async () => {
    await expect(loadMDX('/path/to/file.mdx')).rejects.toThrow('loadMDX is not yet implemented')
  })

  it('includes path in error message', async () => {
    await expect(loadMDX('/custom/path.mdx')).rejects.toThrow('/custom/path.mdx')
  })

  it('suggests alternatives in error message', async () => {
    await expect(loadMDX('/path/to/file.mdx')).rejects.toThrow('bundled assets or fetch from a remote source')
  })
})

// ===========================================================================
// defaultConfig Tests
// ===========================================================================

describe('defaultConfig', () => {
  it('has expected default values', () => {
    expect(defaultConfig.components).toEqual({})
    expect(defaultConfig.useRouter).toBe(true)
    expect(defaultConfig.scope).toEqual({})
  })

  it('has empty components by default', () => {
    expect(Object.keys(defaultConfig.components || {})).toHaveLength(0)
  })

  it('has useRouter enabled by default', () => {
    expect(defaultConfig.useRouter).toBe(true)
  })

  it('has empty scope by default', () => {
    expect(Object.keys(defaultConfig.scope || {})).toHaveLength(0)
  })

  it('does not have baseUrl by default', () => {
    expect(defaultConfig.baseUrl).toBeUndefined()
  })
})

// ===========================================================================
// Components Module Tests
// ===========================================================================

describe('Components module', () => {
  describe('defaultTheme', () => {
    it('has all required color properties', async () => {
      const { defaultTheme } = await import('./components.js')
      expect(defaultTheme.colors.text).toBeDefined()
      expect(defaultTheme.colors.heading).toBeDefined()
      expect(defaultTheme.colors.link).toBeDefined()
      expect(defaultTheme.colors.code).toBeDefined()
      expect(defaultTheme.colors.codeBackground).toBeDefined()
      expect(defaultTheme.colors.blockquote).toBeDefined()
      expect(defaultTheme.colors.border).toBeDefined()
    })

    it('has all required font properties', async () => {
      const { defaultTheme } = await import('./components.js')
      expect(defaultTheme.fonts.body).toBeDefined()
      expect(defaultTheme.fonts.heading).toBeDefined()
      expect(defaultTheme.fonts.mono).toBeDefined()
    })

    it('has all required spacing values', async () => {
      const { defaultTheme } = await import('./components.js')
      expect(defaultTheme.spacing.xs).toBeDefined()
      expect(defaultTheme.spacing.sm).toBeDefined()
      expect(defaultTheme.spacing.md).toBeDefined()
      expect(defaultTheme.spacing.lg).toBeDefined()
      expect(defaultTheme.spacing.xl).toBeDefined()
    })

    it('has all required font size values', async () => {
      const { defaultTheme } = await import('./components.js')
      expect(defaultTheme.fontSize.xs).toBeDefined()
      expect(defaultTheme.fontSize.sm).toBeDefined()
      expect(defaultTheme.fontSize.base).toBeDefined()
      expect(defaultTheme.fontSize.lg).toBeDefined()
      expect(defaultTheme.fontSize.xl).toBeDefined()
      expect(defaultTheme.fontSize['2xl']).toBeDefined()
      expect(defaultTheme.fontSize['3xl']).toBeDefined()
      expect(defaultTheme.fontSize['4xl']).toBeDefined()
    })
  })

  describe('darkTheme', () => {
    it('has different colors than light theme', async () => {
      const { defaultTheme, darkTheme } = await import('./components.js')
      expect(darkTheme.colors.text).not.toBe(defaultTheme.colors.text)
      expect(darkTheme.colors.heading).not.toBe(defaultTheme.colors.heading)
    })

    it('shares font and spacing with light theme', async () => {
      const { defaultTheme, darkTheme } = await import('./components.js')
      expect(darkTheme.fonts).toEqual(defaultTheme.fonts)
      expect(darkTheme.spacing).toEqual(defaultTheme.spacing)
    })
  })

  describe('createMDXComponents()', () => {
    it('creates all heading components', async () => {
      const { createMDXComponents, defaultTheme } = await import('./components.js')
      const components = createMDXComponents(defaultTheme)

      expect(components.h1).toBeDefined()
      expect(components.h2).toBeDefined()
      expect(components.h3).toBeDefined()
      expect(components.h4).toBeDefined()
      expect(components.h5).toBeDefined()
      expect(components.h6).toBeDefined()
    })

    it('creates text formatting components', async () => {
      const { createMDXComponents, defaultTheme } = await import('./components.js')
      const components = createMDXComponents(defaultTheme)

      expect(components.p).toBeDefined()
      expect(components.strong).toBeDefined()
      expect(components.em).toBeDefined()
      expect(components.code).toBeDefined()
      expect(components.pre).toBeDefined()
    })

    it('creates list components', async () => {
      const { createMDXComponents, defaultTheme } = await import('./components.js')
      const components = createMDXComponents(defaultTheme)

      expect(components.ul).toBeDefined()
      expect(components.ol).toBeDefined()
      expect(components.li).toBeDefined()
    })

    it('creates media components', async () => {
      const { createMDXComponents, defaultTheme } = await import('./components.js')
      const components = createMDXComponents(defaultTheme)

      expect(components.img).toBeDefined()
      expect(components.a).toBeDefined()
    })

    it('creates structural components', async () => {
      const { createMDXComponents, defaultTheme } = await import('./components.js')
      const components = createMDXComponents(defaultTheme)

      expect(components.blockquote).toBeDefined()
      expect(components.hr).toBeDefined()
    })
  })

  describe('MDXDocument component', () => {
    it('renders document with default theme', async () => {
      const { MDXDocument } = await import('./components.js')
      const doc = parse(BASIC_MDX)

      const element = MDXDocument({ doc })
      expect(element).toBeDefined()
    })

    it('renders document with custom theme', async () => {
      const { MDXDocument, darkTheme } = await import('./components.js')
      const doc = parse(BASIC_MDX)

      const element = MDXDocument({ doc, theme: darkTheme })
      expect(element).toBeDefined()
    })

    it('renders document with custom components', async () => {
      const { MDXDocument, defaultTheme } = await import('./components.js')
      const doc = parse(BASIC_MDX)

      const customComponents = {
        h1: ({ children }: { children?: React.ReactNode }) =>
          React.createElement('custom-h1', null, children),
      }

      const element = MDXDocument({ doc, theme: defaultTheme, components: customComponents })
      expect(element).toBeDefined()
    })
  })

  describe('MDXContent component', () => {
    it('renders content string', async () => {
      const { MDXContent } = await import('./components.js')

      const element = MDXContent({ content: '# Hello' })
      expect(element).toBeDefined()
    })

    it('renders content with theme', async () => {
      const { MDXContent, darkTheme } = await import('./components.js')

      const element = MDXContent({ content: '# Hello', theme: darkTheme })
      expect(element).toBeDefined()
    })
  })
})

// ===========================================================================
// Router Module Tests
// ===========================================================================

describe('Router module', () => {
  describe('extractRouteMetadata()', () => {
    it('extracts standard route metadata', async () => {
      const { extractRouteMetadata } = await import('./router.js')
      const doc = parse(`---
title: My Page
description: A test page
showInNav: true
order: 5
icon: home
---

# Content`)

      const metadata = extractRouteMetadata(doc)

      expect(metadata.title).toBe('My Page')
      expect(metadata.description).toBe('A test page')
      expect(metadata.showInNav).toBe(true)
      expect(metadata.order).toBe(5)
      expect(metadata.icon).toBe('home')
    })

    it('handles missing metadata gracefully', async () => {
      const { extractRouteMetadata } = await import('./router.js')
      const doc = parse(`# Just content`)

      const metadata = extractRouteMetadata(doc)

      expect(metadata.title).toBeUndefined()
      expect(metadata.description).toBeUndefined()
      expect(metadata.showInNav).toBeUndefined()
    })

    it('includes custom metadata fields', async () => {
      const { extractRouteMetadata } = await import('./router.js')
      const doc = parse(`---
title: Custom
customField: value
nested:
  key: data
---

Content`)

      const metadata = extractRouteMetadata(doc)

      expect(metadata.title).toBe('Custom')
      expect(metadata.customField).toBe('value')
      expect(metadata.nested).toEqual({ key: 'data' })
    })
  })

  describe('createMDXRoute()', () => {
    it('creates a route from path and content', async () => {
      const { createMDXRoute } = await import('./router.js')
      const content = `---
title: Hello World
---

# Welcome`

      const route = createMDXRoute('/blog/hello-world', content)

      expect(route.path).toBe('/blog/hello-world')
      expect(route.segment).toBe('hello-world')
      expect(route.document.data.title).toBe('Hello World')
      expect(route.metadata.title).toBe('Hello World')
    })

    it('handles root path', async () => {
      const { createMDXRoute } = await import('./router.js')
      const route = createMDXRoute('/', '# Home')

      expect(route.path).toBe('/')
      expect(route.segment).toBe('')
    })

    it('handles nested paths', async () => {
      const { createMDXRoute } = await import('./router.js')
      const route = createMDXRoute('/docs/api/endpoints/users', '# Users API')

      expect(route.path).toBe('/docs/api/endpoints/users')
      expect(route.segment).toBe('users')
    })

    it('handles path with trailing slash', async () => {
      const { createMDXRoute } = await import('./router.js')
      const route = createMDXRoute('/blog/', '# Blog')

      expect(route.path).toBe('/blog/')
    })
  })

  describe('createRouteLoader()', () => {
    it('creates a loader with default config', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader()

      expect(loader.getBasePath()).toBe('')
    })

    it('creates a loader with custom base path', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader({ basePath: '/content' })

      expect(loader.getBasePath()).toBe('/content')
    })

    it('converts file paths to route paths', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader()

      expect(loader.toRoutePath('/blog/hello.mdx')).toBe('/blog/hello')
      expect(loader.toRoutePath('/docs/index.mdx')).toBe('/docs/')
      expect(loader.toRoutePath('/[slug].mdx')).toBe('/:slug')
      expect(loader.toRoutePath('/posts/[id]/comments.mdx')).toBe('/posts/:id/comments')
    })

    it('applies custom path transforms', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader({
        transformPath: (path) => path.toLowerCase(),
      })

      expect(loader.toRoutePath('/Blog/HELLO.mdx')).toBe('/blog/hello')
    })

    it('adds base path to routes', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader({ basePath: '/api/v1' })

      expect(loader.toRoutePath('/users.mdx')).toBe('/api/v1/users')
    })

    it('checks if path matches loader', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader({ basePath: '/docs' })

      expect(loader.matches('/docs/intro')).toBe(true)
      expect(loader.matches('/docs')).toBe(true)
      expect(loader.matches('/blog/post')).toBe(false)
    })

    it('handles custom extensions', async () => {
      const { createRouteLoader } = await import('./router.js')
      const loader = createRouteLoader({ extension: '.md' })

      expect(loader.toRoutePath('/readme.md')).toBe('/readme')
    })
  })

  describe('useMDXRoute()', () => {
    it('returns null as placeholder', async () => {
      const { useMDXRoute } = await import('./router.js')
      const route = useMDXRoute()

      expect(route).toBeNull()
    })

    it('accepts options without error', async () => {
      const { useMDXRoute } = await import('./router.js')
      const route = useMDXRoute({ fallback: '# Fallback' })

      expect(route).toBeNull()
    })
  })
})

// ===========================================================================
// Image Handling Tests
// ===========================================================================

describe('Image handling', () => {
  it('parses MDX with remote images', () => {
    const doc = parse(MDX_WITH_IMAGES)
    expect(doc.content).toContain('https://example.com/image.png')
  })

  it('parses MDX with local images', () => {
    const doc = parse(MDX_WITH_IMAGES)
    expect(doc.content).toContain('./local/image.jpg')
  })

  it('preserves alt text in parsed content', () => {
    const doc = parse(MDX_WITH_IMAGES)
    expect(doc.content).toContain('Alt Text')
    expect(doc.content).toContain('Another Image')
  })
})

// ===========================================================================
// Deep Linking Tests
// ===========================================================================

describe('Deep linking', () => {
  it('parses MDX with deep links', () => {
    const doc = parse(MDX_WITH_LINKS)
    expect(doc.content).toContain('myapp://screen/details')
  })

  it('parses MDX with external links', () => {
    const doc = parse(MDX_WITH_LINKS)
    expect(doc.content).toContain('https://example.com')
  })

  it('parses MDX with internal links', () => {
    const doc = parse(MDX_WITH_LINKS)
    expect(doc.content).toContain('/docs/intro')
  })

  it('route loader handles deep link paths', async () => {
    const { createRouteLoader } = await import('./router.js')
    const loader = createRouteLoader({ basePath: '' })

    // Dynamic route parameters for deep links
    expect(loader.toRoutePath('/[screen]/[id].mdx')).toBe('/:screen/:id')
  })
})

// ===========================================================================
// Platform-specific Tests
// ===========================================================================

describe('Platform-specific rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('platform is available in mock', () => {
    expect(mockPlatform.OS).toBe('ios')
  })

  it('platform.select works correctly', () => {
    const result = mockPlatform.select({
      ios: 'iOS value',
      android: 'Android value',
      default: 'Default value',
    })
    expect(result).toBe('iOS value')
  })

  it('can simulate Android platform', () => {
    const originalOS = mockPlatform.OS
    mockPlatform.OS = 'android'
    mockPlatform.select.mockImplementation((options: Record<string, unknown>) => options.android ?? options.default)

    const result = mockPlatform.select({
      ios: 'iOS value',
      android: 'Android value',
      default: 'Default value',
    })

    expect(result).toBe('Android value')

    // Restore
    mockPlatform.OS = originalOS
    mockPlatform.select.mockImplementation((options: Record<string, unknown>) => options.ios ?? options.default)
  })
})

// ===========================================================================
// Native Styling Tests
// ===========================================================================

describe('Native styling', () => {
  it('StyleSheet.create is called correctly', async () => {
    const styles = mockStyleSheet.create({
      container: { flex: 1 },
      text: { fontSize: 16 },
    })

    expect(styles.container).toEqual({ flex: 1 })
    expect(styles.text).toEqual({ fontSize: 16 })
  })

  it('theme spacing values are numeric', async () => {
    const { defaultTheme } = await import('./components.js')

    expect(typeof defaultTheme.spacing.xs).toBe('number')
    expect(typeof defaultTheme.spacing.sm).toBe('number')
    expect(typeof defaultTheme.spacing.md).toBe('number')
    expect(typeof defaultTheme.spacing.lg).toBe('number')
    expect(typeof defaultTheme.spacing.xl).toBe('number')
  })

  it('theme font sizes are numeric', async () => {
    const { defaultTheme } = await import('./components.js')

    expect(typeof defaultTheme.fontSize.base).toBe('number')
    expect(typeof defaultTheme.fontSize['4xl']).toBe('number')
  })
})

// ===========================================================================
// Error Handling Tests
// ===========================================================================

describe('Error handling', () => {
  it('handles malformed frontmatter gracefully', () => {
    const malformed = `---
title: Test
invalid yaml content here
---

# Content`

    // Should not throw, may parse partially
    expect(() => parse(malformed)).not.toThrow()
  })

  it('handles very long content', () => {
    const longContent = '# Title\n\n' + 'Lorem ipsum '.repeat(10000)
    expect(() => parse(longContent)).not.toThrow()
  })

  it('handles special unicode characters', () => {
    const unicode = `---
title: Test
---

# Chinese characters

Some text.`

    const doc = parse(unicode)
    expect(doc).toBeDefined()
  })

  it('handles null-like values in frontmatter', () => {
    const mdx = `---
title: null
description: ~
---

# Content`

    const doc = parse(mdx)
    expect(doc.data.title).toBeNull()
  })

  it('handles deeply nested frontmatter', () => {
    const mdx = `---
level1:
  level2:
    level3:
      level4:
        value: deep
---

# Content`

    const doc = parse(mdx)
    expect(doc.data.level1).toBeDefined()
  })
})

// ===========================================================================
// Edge Cases Tests
// ===========================================================================

describe('Edge cases', () => {
  it('handles MDX with JSX elements', () => {
    const mdx = `---
title: JSX Test
---

# Hello

<CustomComponent prop="value" />

Some text after component.`

    const doc = parse(mdx)
    expect(doc.content).toContain('<CustomComponent')
  })

  it('handles MDX with export statements', () => {
    const mdx = `---
title: Export Test
---

export const meta = { author: 'Test' }

# Hello`

    const doc = parse(mdx)
    expect(doc.content).toContain('export const meta')
  })

  it('handles MDX with import statements', () => {
    const mdx = `---
title: Import Test
---

import Component from './Component'

# Hello

<Component />`

    const doc = parse(mdx)
    expect(doc.content).toContain('import Component')
  })

  it('handles empty frontmatter', () => {
    const mdx = `---
---

# Content`

    const doc = parse(mdx)
    expect(doc.data).toBeDefined()
    expect(doc.content).toContain('# Content')
  })

  it('handles frontmatter with arrays', () => {
    const mdx = `---
items:
  - one
  - two
  - three
---

# Content`

    const doc = parse(mdx)
    expect(doc.data.items).toEqual(['one', 'two', 'three'])
  })

  it('handles frontmatter with numbers', () => {
    const mdx = `---
count: 42
price: 19.99
---

# Content`

    const doc = parse(mdx)
    expect(doc.data.count).toBe(42)
    expect(doc.data.price).toBe(19.99)
  })

  it('handles frontmatter with booleans', () => {
    const mdx = `---
published: true
draft: false
---

# Content`

    const doc = parse(mdx)
    expect(doc.data.published).toBe(true)
    expect(doc.data.draft).toBe(false)
  })

  it('handles content with multiple heading levels', () => {
    const mdx = `# H1

## H2

### H3

#### H4

##### H5

###### H6`

    const doc = parse(mdx)
    expect(doc.content).toContain('# H1')
    expect(doc.content).toContain('###### H6')
  })

  it('handles content with horizontal rules', () => {
    const mdx = `# Section 1

---

# Section 2`

    const doc = parse(mdx)
    expect(doc.content).toContain('---')
  })

  it('handles content with inline code', () => {
    const mdx = `# Code

Use \`const x = 1\` for constants.`

    const doc = parse(mdx)
    expect(doc.content).toContain('`const x = 1`')
  })
})

// ===========================================================================
// Integration Tests
// ===========================================================================

describe('Integration tests', () => {
  it('parses and creates route from MDX', async () => {
    const { createMDXRoute } = await import('./router.js')
    const content = COMPLEX_MDX

    const route = createMDXRoute('/docs/complex', content)

    expect(route.path).toBe('/docs/complex')
    expect(route.document.type).toBe('Document')
    expect(route.metadata.title).toBe('Complex Document')
  })

  it('runtime parses and returns components', () => {
    const runtime = createMDXRuntime({
      components: {
        Button: () => null,
        Card: () => null,
      },
    })

    const doc = runtime.parse(BASIC_MDX)
    const components = runtime.getComponents()

    expect(doc.data.title).toBe('Test Document')
    expect(Object.keys(components)).toContain('Button')
    expect(Object.keys(components)).toContain('Card')
  })

  it('handles full workflow: fetch, parse, route', async () => {
    const { createMDXRoute } = await import('./router.js')

    const mockContent = `---
title: Blog Post
$type: BlogPost
---

# Welcome to the Blog`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockContent),
    })

    const doc = await fetchMDX('https://example.com/post.mdx')
    const route = createMDXRoute('/blog/welcome', mockContent)

    expect(doc.type).toBe('BlogPost')
    expect(route.metadata.title).toBe('Blog Post')
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('Type definitions', () => {
  it('ExpoMDXConfig has expected properties', () => {
    const config: ExpoMDXConfig = {
      components: { Button: () => null },
      baseUrl: 'https://example.com',
      useRouter: true,
      scope: { myVar: 'value' },
    }

    expect(config.components).toBeDefined()
    expect(config.baseUrl).toBe('https://example.com')
    expect(config.useRouter).toBe(true)
    expect(config.scope?.myVar).toBe('value')
  })

  it('ExpoMDXConfig allows partial configuration', () => {
    const config: ExpoMDXConfig = {}
    expect(config.components).toBeUndefined()
    expect(config.baseUrl).toBeUndefined()
  })

  it('MDXEvaluateResult type structure is correct', () => {
    // Type check only - this validates the interface structure
    const mockResult: MDXEvaluateResult = {
      default: () => null as unknown as React.ReactElement,
      exports: { customExport: 'value' },
      data: { title: 'Test' },
    }

    expect(mockResult.default).toBeDefined()
    expect(mockResult.exports).toBeDefined()
    expect(mockResult.data).toBeDefined()
  })
})
