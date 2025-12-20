/**
 * Tests for template generators
 */

import { describe, it, expect } from 'vitest'
import {
  generateNextConfig,
  generateSourceConfig,
  generateSource,
  generateAppLayout,
  generateGlobalCss,
  generateDocsLayout,
  generateDocsPage,
  generateNotFound,
  generateOpenNextConfig,
  generateWranglerConfig,
  generateTsconfig,
  generatePostcssConfig,
  generatePackageJson,
} from './index.js'

describe('generateNextConfig', () => {
  it('generates valid next.config.mjs', () => {
    const config = generateNextConfig({
      contentDir: '../../../content',
      customizationDir: '../../../.mdx',
    })

    expect(config).toContain('createMDX')
    expect(config).toContain('../../../content')
    expect(config).toContain('reactStrictMode')
    expect(config).toContain('export default')
  })
})

describe('generateSourceConfig', () => {
  it('generates valid source.config.ts', () => {
    const config = generateSourceConfig({
      contentDir: '../../../content',
    })

    expect(config).toContain('fumadocs-mdx')
    expect(config).toContain('../../../content')
    expect(config).toContain('defineConfig')
  })
})

describe('generateSource', () => {
  it('generates valid lib/source.ts with default baseUrl', () => {
    const source = generateSource({ baseUrl: '/' })

    expect(source).toContain('loader')
    expect(source).toContain("baseUrl: '/'")
  })

  it('generates with custom baseUrl', () => {
    const source = generateSource({ baseUrl: '/docs' })

    expect(source).toContain("baseUrl: '/docs'")
  })
})

describe('generateAppLayout', () => {
  it('generates valid app/layout.tsx', () => {
    const layout = generateAppLayout({
      title: 'Test Docs',
      description: 'Test description',
      customizationDir: '../../../.mdx',
    })

    expect(layout).toContain('Test Docs')
    expect(layout).toContain('Test description')
    expect(layout).toContain('RootLayout')
    expect(layout).toContain('RootProvider')
  })

  it('handles missing description', () => {
    const layout = generateAppLayout({
      title: 'Test Docs',
      customizationDir: '../../../.mdx',
    })

    expect(layout).toContain('Test Docs')
    expect(layout).toContain("description: ''")
  })
})

describe('generateGlobalCss', () => {
  it('generates valid global.css', () => {
    const css = generateGlobalCss()

    expect(css).toContain("@import 'tailwindcss'")
    expect(css).toContain('fumadocs-ui/css/neutral.css')
    expect(css).toContain('fumadocs-ui/css/preset.css')
  })
})

describe('generateDocsLayout', () => {
  it('generates valid docs layout with github url', () => {
    const layout = generateDocsLayout({
      title: 'Docs',
      githubUrl: 'https://github.com/test/repo',
      customizationDir: '../../../.mdx',
    })

    expect(layout).toContain('DocsLayout')
    expect(layout).toContain('https://github.com/test/repo')
  })

  it('handles missing github url', () => {
    const layout = generateDocsLayout({
      title: 'Docs',
      customizationDir: '../../../.mdx',
    })

    expect(layout).toContain('DocsLayout')
    expect(layout).not.toContain('github')
  })
})

describe('generateDocsPage', () => {
  it('generates valid docs page', () => {
    const page = generateDocsPage()

    expect(page).toContain('source')
    expect(page).toContain('getPage')
    expect(page).toContain('notFound')
    expect(page).toContain('DocsPage')
    expect(page).toContain('generateStaticParams')
    expect(page).toContain('generateMetadata')
  })
})

describe('generateNotFound', () => {
  it('generates valid not-found page', () => {
    const notFound = generateNotFound()

    expect(notFound).toContain('NotFound')
    expect(notFound).toContain('404')
  })
})

describe('generateOpenNextConfig', () => {
  it('generates valid open-next.config.ts', () => {
    const config = generateOpenNextConfig()

    expect(config).toContain('@opennextjs/cloudflare')
    expect(config).toContain('export default')
  })
})

describe('generateWranglerConfig', () => {
  it('generates valid wrangler.jsonc with domain', () => {
    const config = generateWranglerConfig({
      projectName: 'Test Project',
      domain: 'test.example.com',
    })

    expect(config).toContain('test-project')
    expect(config).toContain('test.example.com/*')
    expect(config).toContain('example.com')
    expect(config).toContain('.open-next/worker.js')
    expect(config).toContain('.open-next/assets')
    expect(config).toContain('nodejs_compat')
  })

  it('generates without routes when no domain', () => {
    const config = generateWranglerConfig({
      projectName: 'Simple Project',
    })

    expect(config).toContain('simple-project')
    expect(config).not.toContain('routes')
    expect(config).not.toContain('zone_name')
  })

  it('uses explicit route and zone over derived', () => {
    const config = generateWranglerConfig({
      projectName: 'Test',
      domain: 'ignored.example.com',
      route: 'custom.route.com/*',
      zone: 'custom.zone.com',
    })

    expect(config).toContain('custom.route.com/*')
    expect(config).toContain('custom.zone.com')
    expect(config).not.toContain('ignored.example.com')
  })

  it('derives zone from subdomain correctly', () => {
    const config = generateWranglerConfig({
      projectName: 'Test',
      domain: 'beads.workflows.do',
    })

    expect(config).toContain('beads.workflows.do/*')
    expect(config).toContain('workflows.do')
  })

  it('handles two-part domain', () => {
    const config = generateWranglerConfig({
      projectName: 'Test',
      domain: 'example.com',
    })

    expect(config).toContain('example.com/*')
    expect(config).toContain('"zone_name": "example.com"')
  })
})

describe('generateTsconfig', () => {
  it('generates valid tsconfig.json', () => {
    const config = generateTsconfig({
      contentDir: '../../../content',
    })

    const parsed = JSON.parse(config)

    expect(parsed.compilerOptions).toBeDefined()
    expect(parsed.compilerOptions.strict).toBe(true)
    expect(parsed.compilerOptions.jsx).toBe('preserve')
    expect(parsed.include).toContain('**/*.ts')
    expect(parsed.include).toContain('**/*.tsx')
  })
})

describe('generatePostcssConfig', () => {
  it('generates valid postcss.config.mjs', () => {
    const config = generatePostcssConfig()

    expect(config).toContain('@tailwindcss/postcss')
    expect(config).toContain('plugins')
    expect(config).toContain('export default')
  })
})

describe('generatePackageJson', () => {
  it('generates valid package.json', () => {
    const pkgJson = generatePackageJson({
      projectName: 'My Docs',
    })

    const parsed = JSON.parse(pkgJson)

    expect(parsed.name).toContain('my-docs')
    expect(parsed.scripts.dev).toBeDefined()
    expect(parsed.scripts.build).toBeDefined()
    expect(parsed.dependencies).toBeDefined()
    expect(parsed.dependencies.next).toBeDefined()
    expect(parsed.dependencies['fumadocs-core']).toBeDefined()
    expect(parsed.dependencies['fumadocs-ui']).toBeDefined()
    expect(parsed.dependencies['fumadocs-mdx']).toBeDefined()
  })

  it('sanitizes project name for package name', () => {
    const pkgJson = generatePackageJson({
      projectName: 'My Fancy Docs!',
    })

    const parsed = JSON.parse(pkgJson)

    expect(parsed.name).not.toContain(' ')
    expect(parsed.name).not.toContain('!')
    expect(parsed.name).toBe('my-fancy-docs--docs')
  })
})
