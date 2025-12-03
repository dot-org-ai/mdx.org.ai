/**
 * @mdxe/bun Server
 *
 * Development and production server for MDX applications using Bun + Hono.
 * Uses Bun's native file APIs and server for maximum performance.
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { join, relative, extname, basename } from 'node:path'
import { parse, type MDXLDDocument } from 'mdxld'

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
 * Site configuration
 */
export interface SiteConfig {
  name: string
  url: string
  description?: string
  author?: string
}

/**
 * Check if running in Bun
 */
function isBun(): boolean {
  return typeof globalThis.Bun !== 'undefined'
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

  try {
    const file = Bun.file(pkgPath)
    if (file.size > 0) {
      const pkg = JSON.parse(file.toString())
      config.name = pkg.name || config.name
      config.description = pkg.description
      config.author = pkg.author
      if (pkg.homepage) {
        config.url = pkg.homepage
      }
      if (pkg.mdxe) {
        config = { ...config, ...pkg.mdxe }
      }
    }
  } catch {
    // Ignore errors
  }

  return config
}

/**
 * Recursively find all MDX files using Bun's glob
 */
async function findMdxFiles(dir: string): Promise<string[]> {
  if (!isBun()) {
    // Fallback for non-Bun environments
    return []
  }

  const glob = new Bun.Glob('**/*.{md,mdx}')
  const files: string[] = []

  for await (const file of glob.scan({ cwd: dir, onlyFiles: true })) {
    // Skip node_modules and hidden directories
    if (!file.includes('node_modules') && !file.startsWith('.')) {
      files.push(file)
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
    .replace(/^\[(.+)\]$/, ':$1')

  url = url.replace(/\/\[([^\]]+)\]/g, '/:$1')

  return url || '/'
}

/**
 * Load MDX document from file using Bun's file API
 */
async function loadDocument(filePath: string): Promise<MDXLDDocument | null> {
  try {
    const file = Bun.file(filePath)
    if (file.size === 0) return null
    const content = await file.text()
    return parse(content)
  } catch {
    return null
  }
}

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

  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`\x00CB${i}\x00`, block)
  })
  inlineCodes.forEach((code, i) => {
    html = html.replace(`\x00IC${i}\x00`, code)
  })

  // Wrap paragraphs
  const lines = html.split('\n\n')
  html = lines
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('<')) return trimmed
      return `<p>${trimmed}</p>`
    })
    .join('\n')

  return html
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
}

/**
 * HTML template
 */
function renderHtml(doc: MDXLDDocument, config: SiteConfig): string {
  const title = (doc.data.title as string) || config.name
  const description = (doc.data.description as string) || config.description || ''
  const content = contentToHtml(doc.content)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    main { padding: 2rem 0; }
    pre { background: var(--pico-code-background-color); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
  </style>
  <script defer src="/$.js"></script>
</head>
<body>
  <header class="container">
    <nav>
      <ul><li><strong><a href="/">${escapeHtml(config.name)}</a></strong></li></ul>
      <ul>
        <li><a href="/llms.txt">LLMs</a></li>
      </ul>
    </nav>
  </header>
  <main class="container">
    <article>
      ${content}
    </article>
  </main>
  <footer class="container">
    <p style="text-align:center;color:var(--pico-muted-color)">Powered by MDXE + Bun</p>
  </footer>
</body>
</html>`
}

/**
 * Create the Hono app with all routes
 */
export async function createApp(options: ServerOptions): Promise<Hono> {
  const { projectDir, verbose } = options
  const app = new Hono()
  const config = getSiteConfig(projectDir)
  const mdxFiles = await findMdxFiles(projectDir)

  if (verbose) {
    console.log(`Found ${mdxFiles.length} MDX files`)
  }

  // Analytics script
  app.get('/$.js', (c) => {
    const script = `(function(){
"use strict";
var endpoint = "/_analytics";
function send(data) {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, JSON.stringify(data));
  }
}
function trackPageView() {
  send({
    type: "pageview",
    url: location.href,
    referrer: document.referrer || "",
    timestamp: Date.now()
  });
}
if (document.readyState === "complete") {
  trackPageView();
} else {
  window.addEventListener("load", trackPageView);
}
})();`
    return c.text(script, 200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=86400',
    })
  })

  // Analytics endpoint
  app.post('/_analytics', async (c) => {
    try {
      const data = await c.req.json()
      if (verbose) {
        console.log('[Analytics]', data.type, data.url || '')
      }
      return c.json({ ok: true })
    } catch {
      return c.json({ ok: false }, 400)
    }
  })

  // robots.txt
  app.get('/robots.txt', (c) => {
    return c.text(`User-agent: *\nAllow: /\n\nSitemap: ${config.url}/sitemap.xml\n`, 200, {
      'Content-Type': 'text/plain',
    })
  })

  // sitemap.xml
  app.get('/sitemap.xml', (c) => {
    const urls = mdxFiles
      .filter(f => !f.startsWith('['))
      .map(f => fileToUrl(f))

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${config.url}${url}</loc></url>`).join('\n')}
</urlset>`

    return c.text(sitemap, 200, { 'Content-Type': 'application/xml' })
  })

  // llms.txt
  app.get('/llms.txt', (c) => {
    const llmsTxt = `# ${config.name}

${config.description || 'An MDX-powered site.'}

## Available Pages

${mdxFiles.filter(f => !f.startsWith('[')).map(f => `- ${fileToUrl(f)}`).join('\n')}

## API

- HTML: GET /{path}
- JSON: GET /{path} with Accept: application/json
`
    return c.text(llmsTxt, 200, { 'Content-Type': 'text/plain' })
  })

  // Register MDX routes
  for (const file of mdxFiles) {
    const url = fileToUrl(file)
    const filePath = join(projectDir, file)

    if (verbose) {
      console.log(`  ${url} -> ${file}`)
    }

    app.get(url, async (c) => {
      const doc = await loadDocument(filePath)
      if (!doc) {
        return c.notFound()
      }

      // Check Accept header for JSON
      const accept = c.req.header('Accept') || ''
      if (accept.includes('application/json')) {
        return c.json(doc)
      }

      return c.html(renderHtml(doc, config))
    })
  }

  // Index fallback
  const hasIndex = mdxFiles.some(f =>
    f === 'index.mdx' || f === 'index.md' ||
    f === 'README.mdx' || f === 'README.md'
  )

  if (!hasIndex) {
    app.get('/', (c) => {
      return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.name)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body>
  <main class="container">
    <h1>${escapeHtml(config.name)}</h1>
    <p>${escapeHtml(config.description || 'Welcome')}</p>
    <h2>Pages</h2>
    <ul>
      ${mdxFiles.filter(f => !f.startsWith('[')).map(f => {
        const u = fileToUrl(f)
        return `<li><a href="${u}">${basename(f, extname(f))}</a></li>`
      }).join('\n      ')}
    </ul>
  </main>
</body>
</html>`)
    })
  }

  return app
}

/**
 * Start development server using Bun.serve
 */
export async function createDevServer(options: ServerOptions): Promise<void> {
  const { port = 3000, host = 'localhost', verbose } = options

  if (!isBun()) {
    console.error('This server requires Bun runtime. Please run with: bun run ...')
    process.exit(1)
  }

  const app = await createApp(options)

  console.log('Starting Bun development server...\n')

  Bun.serve({
    port,
    hostname: host,
    fetch: app.fetch,
  })

  console.log(`Server running at http://${host}:${port}`)
  console.log('')
  console.log('Available routes:')
  console.log('  /           - Home page')
  console.log('  /robots.txt - Robots file')
  console.log('  /sitemap.xml - Sitemap')
  console.log('  /llms.txt   - LLM-friendly site info')
  console.log('')
  console.log('Press Ctrl+C to stop')
}

/**
 * Start production server
 */
export async function createServer(options: ServerOptions): Promise<void> {
  const { port = 3000, host = 'localhost' } = options

  if (!isBun()) {
    console.error('This server requires Bun runtime.')
    process.exit(1)
  }

  const app = await createApp(options)

  Bun.serve({
    port,
    hostname: host,
    fetch: app.fetch,
  })

  console.log(`Production server running at http://${host}:${port}`)
}
