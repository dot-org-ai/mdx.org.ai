/**
 * @mdxe/hono Server
 *
 * Development and production server for MDX applications using Hono
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createServer as createNetServer, type AddressInfo } from 'node:net'
import { join, relative, extname, basename } from 'node:path'

/**
 * Check if a port is available on a specific host
 */
function checkPort(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer()
    server.once('error', () => {
      resolve(false)
    })
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, host)
  })
}

/**
 * Check if a port is available on all relevant interfaces
 * Checks both IPv4 (127.0.0.1) and IPv6 (::1) to ensure full availability
 */
export async function isPortAvailable(port: number, host: string = 'localhost'): Promise<boolean> {
  // If host is 'localhost', check both IPv4 and IPv6
  if (host === 'localhost') {
    const [ipv4Available, ipv6Available] = await Promise.all([
      checkPort(port, '127.0.0.1'),
      checkPort(port, '::1'),
    ])
    return ipv4Available && ipv6Available
  }
  // Otherwise just check the specific host
  return checkPort(port, host)
}

/**
 * Find an available port starting from the given port
 * Auto-increments if the port is in use
 */
export async function findAvailablePort(startPort: number, host: string = 'localhost', maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    if (await isPortAvailable(port, host)) {
      return port
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`)
}
import { parse, type MDXLDDocument } from 'mdxld'
import { getRenderer, type TemplateContext } from './templates.js'
import { generateCSS, parseStyleOptions } from './styles.js'
import { generateAnalyticsScript, type AnalyticsConfig } from './analytics.js'
import { getWidgetCSS, getWidgetJS, getAllWidgetCSS, getAllWidgetJS, parseWidgetQuery, type WidgetName } from './widgets.js'
import {
  formatMiddleware,
  getFormat,
  parseFormat,
  renderDocument,
  shouldHandleFormat,
  type OutputFormat,
  FORMAT_CONTENT_TYPES,
} from './format.js'

/**
 * Server configuration options
 */
export interface ServerOptions {
  projectDir: string
  port?: number
  host?: string
  verbose?: boolean
}

/**
 * Build configuration options
 */
export interface BuildOptions {
  projectDir: string
  outDir?: string
  verbose?: boolean
}

/**
 * Site configuration loaded from mdxe.config.ts or package.json
 */
export interface SiteConfig {
  name: string
  url: string
  description?: string
  author?: string
}

/**
 * Get site configuration from project
 */
function getSiteConfig(projectDir: string): SiteConfig {
  const pkgPath = join(projectDir, 'package.json')
  let config: SiteConfig = {
    name: 'MDX Site',
    url: 'http://localhost:3000',
  }

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      config.name = pkg.name || config.name
      config.description = pkg.description
      config.author = pkg.author
      if (pkg.homepage) {
        config.url = pkg.homepage
      }
      // Check for mdxe config in package.json
      if (pkg.mdxe) {
        config = { ...config, ...pkg.mdxe }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return config
}

/**
 * Recursively find all MDX files in a directory
 */
function findMdxFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
      files.push(...findMdxFiles(fullPath, baseDir))
    } else if (stat.isFile() && (entry.endsWith('.mdx') || entry.endsWith('.md'))) {
      const relativePath = relative(baseDir, fullPath)
      files.push(relativePath)
    }
  }

  return files
}

/**
 * Convert file path to URL path
 */
function fileToUrl(filePath: string): string {
  let url = '/' + filePath
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '')
    .replace(/\/index$/, '')
    .replace(/^\[(.+)\]$/, ':$1') // Dynamic routes

  // Handle dynamic segments in path
  url = url.replace(/\/\[([^\]]+)\]/g, '/:$1')

  return url || '/'
}

/**
 * Load MDX document from file
 */
function loadDocument(filePath: string): MDXLDDocument | null {
  if (!existsSync(filePath)) return null
  try {
    const content = readFileSync(filePath, 'utf-8')
    return parse(content)
  } catch {
    return null
  }
}

/**
 * Directory entry for TOC
 */
interface DirEntry {
  name: string
  url: string
  isDir: boolean
  description?: string
}

/**
 * Get directory contents for TOC
 */
function getDirectoryContents(projectDir: string, dirPath: string): DirEntry[] {
  const fullDir = join(projectDir, dirPath)
  if (!existsSync(fullDir) || !statSync(fullDir).isDirectory()) {
    return []
  }

  const entries: DirEntry[] = []
  const items = readdirSync(fullDir)

  for (const item of items) {
    // Skip hidden files and special files
    if (item.startsWith('.') || item.startsWith('[')) continue
    if (item.toLowerCase() === 'readme.mdx' || item.toLowerCase() === 'readme.md') continue
    if (item === 'index.mdx' || item === 'index.md') continue

    const itemPath = join(fullDir, item)
    const stat = statSync(itemPath)
    const relativePath = dirPath ? `${dirPath}/${item}` : item

    if (stat.isDirectory()) {
      // Check if directory has a README or index
      const hasReadme = existsSync(join(itemPath, 'README.mdx')) ||
                       existsSync(join(itemPath, 'README.md')) ||
                       existsSync(join(itemPath, 'index.mdx')) ||
                       existsSync(join(itemPath, 'index.md'))

      if (hasReadme) {
        // Load README to get description
        const readmePath = existsSync(join(itemPath, 'README.mdx'))
          ? join(itemPath, 'README.mdx')
          : existsSync(join(itemPath, 'README.md'))
          ? join(itemPath, 'README.md')
          : existsSync(join(itemPath, 'index.mdx'))
          ? join(itemPath, 'index.mdx')
          : join(itemPath, 'index.md')

        const doc = loadDocument(readmePath)
        entries.push({
          name: item,
          url: '/' + relativePath,
          isDir: true,
          description: doc?.data.description as string || undefined,
        })
      }
    } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
      const doc = loadDocument(itemPath)
      const name = basename(item, extname(item))
      entries.push({
        name: doc?.data.title as string || name,
        url: fileToUrl(relativePath),
        isDir: false,
        description: doc?.data.description as string || undefined,
      })
    }
  }

  // Sort: directories first, then alphabetically
  return entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * Generate TOC HTML (list format)
 */
function generateTocHtml(entries: DirEntry[], title?: string): string {
  if (entries.length === 0) return ''

  const items = entries.map(entry => {
    const icon = entry.isDir ? '📁' : '📄'
    const desc = entry.description ? `<br><small>${escapeHtml(entry.description)}</small>` : ''
    return `<li>${icon} <a href="${entry.url}"><strong>${escapeHtml(entry.name)}</strong></a>${desc}</li>`
  }).join('\n          ')

  return `
    <nav class="toc">
      <h2>${title || 'Contents'}</h2>
      <ul>
          ${items}
      </ul>
    </nav>
  `
}

/**
 * Generate card grid HTML for Collection types (PicoCSS semantic)
 */
function generateCardGridHtml(entries: DirEntry[], title?: string): string {
  if (entries.length === 0) return ''

  const cards = entries.map(entry => {
    const icon = entry.isDir ? '📁' : '📄'
    return `
      <article>
        <header>
          <span class="icon">${icon}</span>
          <hgroup>
            <h3><a href="${entry.url}">${escapeHtml(entry.name)}</a></h3>
            ${entry.description ? `<p>${escapeHtml(entry.description)}</p>` : ''}
          </hgroup>
        </header>
      </article>`
  }).join('\n')

  return `
    <section class="card-grid">
      ${title ? `<h2>${escapeHtml(title)}</h2>` : ''}
      <div class="grid">
        ${cards}
      </div>
    </section>
  `
}

/**
 * PicoCSS-based HTML template
 */
const picoTemplate = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{{description}}">
  <title>{{title}}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    :root {
      --pico-font-size: 16px;
    }
    main {
      padding-top: 2rem;
      padding-bottom: 4rem;
    }
    article {
      margin-bottom: 2rem;
    }
    nav {
      margin-bottom: 2rem;
    }
    .site-header {
      border-bottom: 1px solid var(--pico-muted-border-color);
      margin-bottom: 2rem;
    }
    .site-footer {
      border-top: 1px solid var(--pico-muted-border-color);
      padding-top: 2rem;
      margin-top: 4rem;
      text-align: center;
      color: var(--pico-muted-color);
    }
    pre {
      background: var(--pico-code-background-color);
      padding: 1rem;
      border-radius: var(--pico-border-radius);
      overflow-x: auto;
    }
    code {
      font-size: 0.9em;
    }
    .toc {
      background: var(--pico-card-background-color);
      border: 1px solid var(--pico-muted-border-color);
      border-radius: var(--pico-border-radius);
      padding: 1.5rem;
      margin-top: 2rem;
    }
    .toc h2 {
      margin-top: 0;
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    .toc ul {
      margin-bottom: 0;
      padding-left: 0;
      list-style: none;
    }
    .toc li {
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--pico-muted-border-color);
    }
    .toc li:last-child {
      border-bottom: none;
    }
    .toc small {
      color: var(--pico-muted-color);
    }
  </style>
  {{head}}
</head>
<body>
  <header class="container site-header">
    <nav>
      <ul>
        <li><strong><a href="/">{{siteName}}</a></strong></li>
      </ul>
      <ul>
        <li><a href="/docs">Docs</a></li>
        <li><a href="/llms.txt">LLMs</a></li>
      </ul>
    </nav>
  </header>
  <main class="container">
    <article>
      {{content}}
    </article>
    {{toc}}
  </main>
  <footer class="container site-footer">
    <p>{{footer}}</p>
  </footer>
</body>
</html>`

/**
 * Simple markdown to HTML conversion
 */
function contentToHtml(content: string): string {
  let html = content

  // Preserve code blocks
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : ''
    const escaped = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const placeholder = `\x00CB${codeBlocks.length}\x00`
    codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`)
    return placeholder
  })

  // Inline code
  const inlineCodes: string[] = []
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const placeholder = `\x00IC${inlineCodes.length}\x00`
    inlineCodes.push(`<code>${escaped}</code>`)
    return placeholder
  })

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

  // Horizontal rules
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>')

  // Unordered lists
  html = html.replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Restore code blocks and inline code
  codeBlocks.forEach((block, i) => {
    html = html.replace(`\x00CB${i}\x00`, block)
  })
  inlineCodes.forEach((code, i) => {
    html = html.replace(`\x00IC${i}\x00`, code)
  })

  // Paragraphs
  const lines = html.split('\n')
  const result: string[] = []
  let inParagraph = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      continue
    }

    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('</ul') ||
      trimmed.startsWith('</ol') ||
      trimmed.startsWith('</blockquote')
    ) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      result.push(line)
      continue
    }

    if (!inParagraph) {
      result.push('<p>' + line)
      inParagraph = true
    } else {
      result.push(' ' + trimmed)
    }
  }

  if (inParagraph) {
    result.push('</p>')
  }

  return result.join('\n')
}

/**
 * Render MDX document to HTML page based on $type
 */
function renderPage(doc: MDXLDDocument, config: SiteConfig, toc?: string): string {
  const content = contentToHtml(doc.content)
  // Handle $type being string or string[] (use first if array)
  const rawType = doc.type
  const docType = Array.isArray(rawType) ? rawType[0] : rawType

  const render = getRenderer(docType)
  return render(doc, content, {
    toc,
    ctx: {
      siteName: config.name,
      siteUrl: config.url,
      year: new Date().getFullYear(),
    },
  })
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Create the Hono app with all routes
 */
export function createApp(options: ServerOptions): Hono {
  const { projectDir, verbose } = options
  const app = new Hono()
  const config = getSiteConfig(projectDir)
  const mdxFiles = findMdxFiles(projectDir)

  if (verbose) {
    console.log(`Found ${mdxFiles.length} MDX files`)
  }

  // Serve static files from public directory
  const publicDir = join(projectDir, 'public')
  if (existsSync(publicDir)) {
    app.use('/static/*', serveStatic({ root: './public' }))
  }

  // Add format middleware for content negotiation
  app.use('*', formatMiddleware())

  // Document registry: maps URL paths to file paths
  const documentRegistry = new Map<string, string>()

  // Helper to serve document in requested format
  const serveDocument = (
    c: import('hono').Context,
    doc: MDXLDDocument,
    toc?: string
  ): Response => {
    const { outputFormat } = getFormat(c)

    // For HTML, use full page rendering
    if (outputFormat === 'html') {
      const html = renderPage(doc, config, toc)
      return c.html(html)
    }

    // For other formats, use the format renderer
    const { content, contentType } = renderDocument(doc, outputFormat)
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': contentType },
    })
  }

  // Dynamic CSS: /styles/:type.css?color=indigo&background=gradient
  app.get('/styles/:type.css', (c) => {
    const type = c.req.param('type') || 'website'
    const query = c.req.query()
    const opts = parseStyleOptions(query)
    const css = generateCSS(type, opts)

    return c.text(css, 200, {
      'Content-Type': 'text/css',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // Base CSS variables: /$.css
  // Provides CSS custom properties for theming
  app.get('/$.css', (c) => {
    const css = `/* Base Styles - mdxe */
:root {
  --background: #ffffff;
  --foreground: #1a1a1a;
  --muted: #f5f5f5;
  --muted-foreground: #6b7280;
  --border: #e5e5e5;
  --primary: #0066cc;
  --accent: #e5e5e5;
  --radius: 0.5rem;
}

[data-theme="dark"] {
  --background: #1a1a1a;
  --foreground: #f5f5f5;
  --muted: #2a2a2a;
  --muted-foreground: #9ca3af;
  --border: #3a3a3a;
  --primary: #3b82f6;
  --accent: #3a3a3a;
}
`
    return c.text(css, 200, {
      'Content-Type': 'text/css',
      'Cache-Control': 'public, max-age=86400',
    })
  })

  // Core runtime script: /$.js
  // Analytics + RPC proxy (no widgets - use /scripts/:template.js for widgets)
  app.get('/$.js', (c) => {
    const query = c.req.query()
    const parts: string[] = []

    // Analytics
    const analyticsConfig: AnalyticsConfig = {
      endpoint: query.endpoint || '/_analytics',
      webVitals: query.vitals !== 'false',
      pageViews: query.pageviews !== 'false',
      debug: query.debug === 'true',
      sampleRate: query.sample ? parseFloat(query.sample) : 1,
    }
    parts.push('/* Analytics & Core Web Vitals */')
    parts.push(generateAnalyticsScript(analyticsConfig))

    // RPC Proxy for $ function calls
    parts.push(`
/* $ RPC Proxy */
window.$ = window.$ || function(method) {
  var args = Array.prototype.slice.call(arguments, 1);
  return fetch('/_rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: method, args: args })
  }).then(function(r) { return r.json(); });
};
`)

    const script = parts.join('\n')

    return c.text(script, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=86400',
    })
  })

  // Template-specific scripts: /scripts/:template.js
  // Includes widgets appropriate for each template type
  const templateWidgets: Record<string, WidgetName[]> = {
    docs: ['toc', 'searchbox', 'copy-button', 'theme-toggle'],
    blog: ['toc', 'copy-button', 'theme-toggle'],
    landing: ['chatbox', 'theme-toggle'],
    website: ['searchbox', 'theme-toggle', 'copy-button'],
    api: ['copy-button', 'theme-toggle'],
    default: ['theme-toggle', 'copy-button'],
  }

  app.get('/scripts/:file', (c) => {
    // Extract template name from filename (e.g., "docs.js" -> "docs")
    const file = c.req.param('file') || ''
    const template = file.replace(/\.js$/, '') || 'default'
    const widgets = templateWidgets[template] ?? templateWidgets['default']!

    const parts: string[] = []
    parts.push(`/* Template: ${template} */`)
    parts.push(`/* Widgets: ${widgets.join(', ')} */\n`)
    parts.push(getWidgetJS(widgets))

    return c.text(parts.join('\n'), 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // Analytics endpoint: /_analytics
  app.post('/_analytics', async (c) => {
    try {
      const data = await c.req.json()

      if (verbose) {
        console.log('[Analytics]', data.type, data.name || data.url || '')
      }

      // In production, you would forward this to your analytics backend
      // For now, just acknowledge receipt
      return c.json({ ok: true })
    } catch {
      return c.json({ ok: false, error: 'Invalid payload' }, 400)
    }
  })

  // Widget CSS: /widgets.css or /widgets.css?w=chatbox,toc
  app.get('/widgets.css', (c) => {
    const query = c.req.query()
    const widgetParam = query.w || query.widgets

    let css: string
    if (widgetParam) {
      const widgets = parseWidgetQuery(widgetParam)
      css = getWidgetCSS(widgets)
    } else {
      css = getAllWidgetCSS()
    }

    return c.text(css, 200, {
      'Content-Type': 'text/css',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // Widget JS: /widgets.js or /widgets.js?w=chatbox,toc
  app.get('/widgets.js', (c) => {
    const query = c.req.query()
    const widgetParam = query.w || query.widgets

    let js: string
    if (widgetParam) {
      const widgets = parseWidgetQuery(widgetParam)
      js = getWidgetJS(widgets)
    } else {
      js = getAllWidgetJS()
    }

    return c.text(js, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // Individual widget routes: /widgets/:name.css and /widgets/:name.js
  app.get('/widgets/:name.css', (c) => {
    const name = c.req.param('name') as WidgetName
    const css = getWidgetCSS([name])

    if (!css.trim()) {
      return c.text('/* Widget not found */', 404, { 'Content-Type': 'text/css' })
    }

    return c.text(css, 200, {
      'Content-Type': 'text/css',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  app.get('/widgets/:name.js', (c) => {
    const name = c.req.param('name') as WidgetName
    const js = getWidgetJS([name])

    if (!js.trim()) {
      return c.text('// Widget not found', 404, { 'Content-Type': 'application/javascript' })
    }

    return c.text(js, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  // robots.txt
  app.get('/robots.txt', (c) => {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${config.url}/sitemap.xml
`
    return c.text(robotsTxt, 200, { 'Content-Type': 'text/plain' })
  })

  // sitemap.xml
  app.get('/sitemap.xml', (c) => {
    const urls = mdxFiles
      .filter(f => !f.startsWith('[')) // Exclude dynamic routes
      .map(f => fileToUrl(f))

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${config.url}${url}</loc>
    <changefreq>weekly</changefreq>
  </url>`).join('\n')}
</urlset>`

    return c.text(sitemap, 200, { 'Content-Type': 'application/xml' })
  })

  // llms.txt - LLM-friendly site description
  app.get('/llms.txt', (c) => {
    const llmsTxt = `# ${config.name}

${config.description || 'An MDX-powered site.'}

## Available Pages

${mdxFiles
  .filter(f => !f.startsWith('['))
  .map(f => `- ${fileToUrl(f)}`)
  .join('\n')}

## API

This site serves MDX content. Each page can be accessed as:
- HTML: GET /{path}
- JSON: GET /{path} with Accept: application/json header

## Content Format

All content is authored in MDXLD format (MDX with YAML-LD frontmatter).
Frontmatter may include $type, $id, and $context for linked data.
`

    return c.text(llmsTxt, 200, { 'Content-Type': 'text/plain' })
  })

  // llms-full.txt - Full content for LLMs
  app.get('/llms-full.txt', (c) => {
    const sections: string[] = [`# ${config.name}\n`]

    if (config.description) {
      sections.push(config.description + '\n')
    }

    for (const file of mdxFiles) {
      if (file.startsWith('[')) continue // Skip dynamic routes
      const filePath = join(projectDir, file)
      const doc = loadDocument(filePath)
      if (doc) {
        const url = fileToUrl(file)
        const title = (doc.data.title as string) || basename(file, extname(file))
        sections.push(`\n## ${title}\nURL: ${url}\n\n${doc.content}`)
      }
    }

    return c.text(sections.join('\n'), 200, { 'Content-Type': 'text/plain' })
  })

  // Find all directories with README or index files
  const directories = new Set<string>()
  for (const file of mdxFiles) {
    const dir = file.includes('/') ? file.substring(0, file.lastIndexOf('/')) : ''
    const fileName = basename(file).toLowerCase()
    if (fileName === 'readme.mdx' || fileName === 'readme.md' ||
        fileName === 'index.mdx' || fileName === 'index.md') {
      directories.add(dir)
    }
  }

  // Register directory routes (serve README/index with TOC)
  for (const dir of directories) {
    const dirUrl = dir ? '/' + dir : '/'
    const readmePath = existsSync(join(projectDir, dir, 'README.mdx'))
      ? join(projectDir, dir, 'README.mdx')
      : existsSync(join(projectDir, dir, 'README.md'))
      ? join(projectDir, dir, 'README.md')
      : existsSync(join(projectDir, dir, 'index.mdx'))
      ? join(projectDir, dir, 'index.mdx')
      : join(projectDir, dir, 'index.md')

    // Register in document registry for format extension handling
    documentRegistry.set(dirUrl, readmePath)

    if (verbose) {
      console.log(`  ${dirUrl} -> ${dir}/README (with TOC)`)
    }

    app.get(dirUrl, (c) => {
      const doc = loadDocument(readmePath)
      if (!doc) {
        return c.notFound()
      }

      // Generate TOC from directory contents
      const entries = getDirectoryContents(projectDir, dir)

      // Use card grid for Collection types, list TOC for others
      const docType = Array.isArray(doc.type) ? doc.type[0] : doc.type
      const toc = docType === 'Collection'
        ? generateCardGridHtml(entries, 'Examples')
        : generateTocHtml(entries, 'In This Section')

      // Use format-aware document serving
      return serveDocument(c, doc, toc)
    })
  }

  // Register individual MDX routes (skip README/index as they're handled above)
  for (const file of mdxFiles) {
    const fileName = basename(file).toLowerCase()
    if (fileName === 'readme.mdx' || fileName === 'readme.md' ||
        fileName === 'index.mdx' || fileName === 'index.md') {
      continue // Already handled as directory routes
    }

    const url = fileToUrl(file)
    const filePath = join(projectDir, file)

    // Register in document registry for format extension handling
    documentRegistry.set(url, filePath)

    if (verbose) {
      console.log(`  ${url} -> ${file}`)
    }

    app.get(url, (c) => {
      const doc = loadDocument(filePath)
      if (!doc) {
        return c.notFound()
      }

      // Use format-aware document serving (no TOC for individual pages)
      return serveDocument(c, doc)
    })
  }

  // Index route if no index.mdx or README.mdx
  const hasIndex = mdxFiles.some(f =>
    f === 'index.mdx' || f === 'index.md' ||
    f === 'README.mdx' || f === 'README.md'
  )
  if (!hasIndex) {
    app.get('/', (c) => {
      const indexHtml = picoTemplate
        .replace(/\{\{title\}\}/g, escapeHtml(config.name))
        .replace(/\{\{description\}\}/g, escapeHtml(config.description || ''))
        .replace(/\{\{siteName\}\}/g, escapeHtml(config.name))
        .replace(/\{\{content\}\}/g, `
          <h1>${escapeHtml(config.name)}</h1>
          <p>${escapeHtml(config.description || 'Welcome to this MDX-powered site.')}</p>
          <h2>Pages</h2>
          <ul>
            ${mdxFiles
              .filter(f => !f.startsWith('['))
              .map(f => {
                const url = fileToUrl(f)
                const name = basename(f, extname(f))
                return `<li><a href="${url}">${name}</a></li>`
              })
              .join('\n            ')}
          </ul>
        `)
        .replace(/\{\{toc\}\}/g, '')
        .replace(/\{\{head\}\}/g, '')
        .replace(/\{\{footer\}\}/g, 'Powered by MDXE')

      return c.html(indexHtml)
    })
  }

  // Format extension handler: /path/to/doc.json, /path/to/doc.md, etc.
  // This catch-all handles requests with format extensions by looking up the base path
  app.get('*', (c) => {
    const path = c.req.path

    // Skip paths that shouldn't be format-handled
    if (!shouldHandleFormat(path)) {
      return c.notFound()
    }

    // Check if path has a format extension
    const { format, basePath } = parseFormat(path)
    if (!format) {
      // No format extension, not found
      return c.notFound()
    }

    // Look up the base path in the document registry
    const filePath = documentRegistry.get(basePath)
    if (!filePath) {
      // Base path not found in registry
      return c.notFound()
    }

    // Load and serve the document
    const doc = loadDocument(filePath)
    if (!doc) {
      return c.notFound()
    }

    // Render in the requested format
    const { content, contentType } = renderDocument(doc, format)
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': contentType },
    })
  })

  // 404 handler
  app.notFound((c) => {
    const html = picoTemplate
      .replace(/\{\{title\}\}/g, '404 - Not Found')
      .replace(/\{\{description\}\}/g, 'Page not found')
      .replace(/\{\{siteName\}\}/g, escapeHtml(config.name))
      .replace(/\{\{toc\}\}/g, '')
      .replace(/\{\{content\}\}/g, '<h1>404 - Not Found</h1><p>The page you requested could not be found.</p>')
      .replace(/\{\{head\}\}/g, '')
      .replace(/\{\{footer\}\}/g, 'Powered by MDXE')

    return c.html(html, 404)
  })

  return app
}

/**
 * Normalize host to avoid dual IPv4/IPv6 binding issues
 * When 'localhost' is used, Node.js tries to bind both IPv4 and IPv6,
 * which can cause race conditions and EADDRINUSE errors
 */
function normalizeHost(host: string): string {
  // Convert 'localhost' to explicit IPv4 to avoid dual-stack binding issues
  return host === 'localhost' ? '127.0.0.1' : host
}

/**
 * Start server with automatic port retry on EADDRINUSE
 */
async function startServerWithRetry(
  app: Hono,
  startPort: number,
  host: string,
  maxAttempts: number,
  onListening: (info: { port: number }) => void
): Promise<void> {
  // Normalize host to avoid dual-stack binding issues
  const normalizedHost = normalizeHost(host)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = startPort + attempt

    // Check if port is available first to avoid race conditions
    const available = await checkPort(port, normalizedHost)
    if (!available) {
      continue
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const server = serve({
          fetch: app.fetch,
          port,
          hostname: normalizedHost,
        }, (info) => {
          onListening(info)
          resolve()
        })
        // Handle server errors
        const nodeServer = (server as { server?: { once?: (event: string, handler: (err: Error) => void) => void } }).server
        if (nodeServer?.once) {
          nodeServer.once('error', (err: Error & { code?: string }) => {
            reject(err)
          })
        }
      })
      return // Success, server is running
    } catch (err) {
      const error = err as Error & { code?: string }
      if (error.code === 'EADDRINUSE' && attempt < maxAttempts - 1) {
        // Port in use, try next port
        continue
      }
      throw err
    }
  }
  throw new Error(`Could not start server after ${maxAttempts} attempts starting from port ${startPort}`)
}

/**
 * Start development server with hot reload
 */
export async function createDevServer(options: ServerOptions): Promise<void> {
  const { port: requestedPort = 3000, host = 'localhost', verbose } = options
  const app = createApp(options)

  console.log('Starting development server...\n')

  let actualPort = requestedPort
  await startServerWithRetry(app, requestedPort, host, 10, (info) => {
    actualPort = info.port
    if (actualPort !== requestedPort) {
      console.log(`Port ${requestedPort} was in use, using port ${actualPort} instead\n`)
    }
    console.log(`Server running at http://${host}:${info.port}`)
    console.log('')
    console.log('Available routes:')
    console.log('  /           - Home page')
    console.log('  /robots.txt - Robots file')
    console.log('  /sitemap.xml - Sitemap')
    console.log('  /llms.txt   - LLM-friendly site info')
    console.log('  /llms-full.txt - Full content for LLMs')
    console.log('')
    console.log('Press Ctrl+C to stop')
  })
}

/**
 * Start production server
 */
export async function createServer(options: ServerOptions): Promise<void> {
  const { port: requestedPort = 3000, host = 'localhost' } = options
  const app = createApp(options)

  await startServerWithRetry(app, requestedPort, host, 10, (info) => {
    if (info.port !== requestedPort) {
      console.log(`Port ${requestedPort} was in use, using port ${info.port} instead`)
    }
    console.log(`Production server running at http://${host}:${info.port}`)
  })
}

/**
 * Build static site
 */
export async function build(options: BuildOptions): Promise<void> {
  const { projectDir, outDir = 'dist', verbose } = options
  const config = getSiteConfig(projectDir)
  const mdxFiles = findMdxFiles(projectDir)

  console.log(`Building ${mdxFiles.length} pages...`)

  // For now, just log what would be built
  // Full static build implementation would generate HTML files
  for (const file of mdxFiles) {
    const url = fileToUrl(file)
    if (verbose) {
      console.log(`  ${url}`)
    }
  }

  console.log(`\nBuild would output to: ${join(projectDir, outDir)}`)
  console.log('(Static build not yet implemented - use dev/start for now)')
}
