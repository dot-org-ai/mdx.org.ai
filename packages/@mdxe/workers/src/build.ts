/**
 * @mdxe/workers Build
 *
 * Build MDX projects for Cloudflare Workers deployment
 *
 * Integrates with:
 * - @mdxld/compile for JSX/MDX compilation
 * - @mdxld/evaluate for server-side rendering
 * - ai-sandbox patterns for secure execution
 *
 * @packageDocumentation
 */

import { build as esbuild } from 'esbuild'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, relative, extname, basename, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { parse } from 'mdxld'
import type {
  BuildOptions,
  BuildResult,
  NamespaceBundle,
  WorkerBundle,
  ContentBundle,
  ContentDocument,
  AssetBundle,
  AssetFile,
  NamespaceMeta,
} from './types.js'

/**
 * Convert markdown to HTML (standalone function for asset generation)
 */
function markdownToHtml(content: string): string {
  let html = content

  // Preserve code blocks
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : ''
    const escaped = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const placeholder = '\x00CB' + codeBlocks.length + '\x00'
    codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`)
    return placeholder
  })

  // Inline code
  const inlineCodes: string[] = []
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const placeholder = '\x00IC' + inlineCodes.length + '\x00'
    inlineCodes.push(`<code>${escaped}</code>`)
    return placeholder
  })

  // Helper for inline formatting
  const formatInline = (text: string): string => {
    let result = text
    result = result.replace(/`([^`]+)`/g, (_, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<code>${escaped}</code>`
    })
    result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    return result
  }

  // GFM Tables
  const tables: string[] = []
  html = html.replace(/^(\|.+\|\n)(\|[-:|\s]+\|\n)((?:\|.+\|\n?)+)/gm, (match, headerRow, separatorRow, bodyRows) => {
    const parseRow = (row: string) => row.trim().replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/)
    const alignments = separatorRow.trim().replace(/^\|\s*|\s*\|$/g, '').split(/\s*\|\s*/).map((cell: string) => {
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
      if (cell.endsWith(':')) return 'right'
      return 'left'
    })

    const headers = parseRow(headerRow)
    const headerHtml = '<tr>' + headers.map((h: string, i: number) => `<th style="text-align:${alignments[i] || 'left'}">${formatInline(h)}</th>`).join('') + '</tr>'

    const rows = bodyRows.trim().split('\n').filter((r: string) => r.trim())
    const bodyHtml = rows.map((row: string) => {
      const cells = parseRow(row)
      return '<tr>' + cells.map((c: string, i: number) => `<td style="text-align:${alignments[i] || 'left'}">${formatInline(c)}</td>`).join('') + '</tr>'
    }).join('')

    const placeholder = '\x00TBL' + tables.length + '\x00'
    tables.push(`<table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table>`)
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

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

  // Horizontal rules
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>')

  // Unordered lists
  html = html.replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Restore code blocks, inline code, and tables
  codeBlocks.forEach((block, i) => {
    html = html.replace('\x00CB' + i + '\x00', block)
  })
  inlineCodes.forEach((code, i) => {
    html = html.replace('\x00IC' + i + '\x00', code)
  })
  tables.forEach((table, i) => {
    html = html.replace('\x00TBL' + i + '\x00', table)
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
      trimmed.startsWith('<table') ||
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
 * Extract TOC items from content headings
 */
function extractTOC(content: string): Array<{ title: string; url: string; depth: number }> {
  const items: Array<{ title: string; url: string; depth: number }> = []
  const regex = /^(#{2,4})\s+(.+)$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    const depth = match[1]!.length
    const title = match[2]!.trim()
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    items.push({ title, url: `#${slug}`, depth })
  }

  return items
}

/**
 * Generate TOC HTML
 */
function generateTOCHtml(toc: Array<{ title: string; url: string; depth: number }>): string {
  if (toc.length === 0) return ''
  return `
    <aside class="fd-toc">
      <nav class="fd-toc-nav" aria-label="On this page">
        <strong class="fd-toc-title">On this page</strong>
        <ul class="fd-toc-list">
          ${toc.map(item => `
          <li class="fd-toc-item fd-toc-depth-${item.depth}">
            <a href="${item.url}" class="fd-toc-link">${escapeHtml(item.title)}</a>
          </li>`).join('')}
        </ul>
      </nav>
    </aside>`
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Generate fumadocs CSS (inline for static assets)
 */
function getFumadocsCSS(): string {
  return `
:root {
  --fd-background: #ffffff;
  --fd-foreground: #0f172a;
  --fd-muted: #f1f5f9;
  --fd-muted-fg: #64748b;
  --fd-border: #e2e8f0;
  --fd-primary: #6366f1;
  --fd-primary-fg: #ffffff;
  --fd-accent: #f1f5f9;
  --fd-accent-fg: #0f172a;
  --fd-sidebar-width: 280px;
  --fd-toc-width: 220px;
  --fd-header-height: 60px;
  --fd-content-max: 860px;
  --fd-font-sans: system-ui, -apple-system, sans-serif;
  --fd-font-mono: ui-monospace, SFMono-Regular, monospace;
  --fd-radius: 0.5rem;
  --fd-radius-sm: 0.25rem;
}
@media (prefers-color-scheme: dark) {
  :root {
    --fd-background: #0f172a;
    --fd-foreground: #f1f5f9;
    --fd-muted: #1e293b;
    --fd-muted-fg: #94a3b8;
    --fd-border: #334155;
    --fd-primary: #818cf8;
    --fd-accent: #1e293b;
    --fd-accent-fg: #f1f5f9;
  }
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-family: var(--fd-font-sans); font-size: 16px; line-height: 1.6; background: var(--fd-background); color: var(--fd-foreground); scroll-behavior: smooth; scroll-padding-top: calc(var(--fd-header-height) + 1rem); }
body { min-height: 100vh; }
a { color: var(--fd-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
.fd-header { position: sticky; top: 0; z-index: 50; height: var(--fd-header-height); background: var(--fd-background); border-bottom: 1px solid var(--fd-border); backdrop-filter: blur(8px); }
.fd-nav { display: flex; align-items: center; justify-content: space-between; height: 100%; max-width: 1400px; margin: 0 auto; padding: 0 1.5rem; }
.fd-logo { display: flex; align-items: center; gap: 0.5rem; color: var(--fd-foreground); font-weight: 600; font-size: 1.125rem; }
.fd-logo:hover { text-decoration: none; }
.fd-nav-links { display: flex; align-items: center; gap: 1.5rem; }
.fd-nav-links a { color: var(--fd-muted-fg); font-size: 0.875rem; font-weight: 500; }
.fd-nav-links a:hover { color: var(--fd-foreground); text-decoration: none; }
.fd-container { display: grid; grid-template-columns: var(--fd-sidebar-width) 1fr var(--fd-toc-width); grid-template-areas: "sidebar main toc"; max-width: 1400px; margin: 0 auto; min-height: calc(100vh - var(--fd-header-height)); }
.fd-sidebar { grid-area: sidebar; position: sticky; top: var(--fd-header-height); height: calc(100vh - var(--fd-header-height)); overflow-y: auto; padding: 1.5rem 1rem; border-right: 1px solid var(--fd-border); background: var(--fd-background); font-size: 0.875rem; }
.fd-sidebar-list { list-style: none; }
.fd-sidebar-item { margin: 0.125rem 0; }
.fd-sidebar-link { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; color: var(--fd-muted-fg); border-radius: var(--fd-radius); transition: background 0.15s, color 0.15s; }
.fd-sidebar-link:hover { background: var(--fd-accent); color: var(--fd-accent-fg); text-decoration: none; }
.fd-sidebar-link.active { background: var(--fd-primary); color: var(--fd-primary-fg); font-weight: 500; }
.fd-sidebar-group { margin-top: 1rem; }
.fd-sidebar-group:first-child { margin-top: 0; }
.fd-sidebar-group-title { display: block; padding: 0.5rem 0.75rem; color: var(--fd-foreground); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.fd-main { grid-area: main; min-width: 0; padding: 2rem; }
.fd-breadcrumbs { margin-bottom: 1.5rem; display: flex; align-items: center; flex-wrap: wrap; list-style: none; font-size: 0.875rem; }
.fd-breadcrumbs a { color: var(--fd-muted-fg); }
.fd-breadcrumbs a:hover { color: var(--fd-foreground); }
.fd-breadcrumbs-sep { margin: 0 0.5rem; color: var(--fd-border); }
.fd-article { max-width: var(--fd-content-max); }
.fd-article-header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--fd-border); }
.fd-article-title { font-size: 2.25rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.75rem; }
.fd-article-description { font-size: 1.125rem; color: var(--fd-muted-fg); margin: 0; }
.fd-article-content { line-height: 1.75; }
.fd-article-content h2 { font-size: 1.5rem; font-weight: 600; margin: 2rem 0 1rem; padding-top: 1.5rem; border-top: 1px solid var(--fd-border); }
.fd-article-content h3 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
.fd-article-content h4 { font-size: 1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
.fd-article-content p { margin: 1rem 0; }
.fd-article-content ul, .fd-article-content ol { margin: 1rem 0; padding-left: 1.5rem; }
.fd-article-content li { margin: 0.5rem 0; }
.fd-article-content pre { margin: 1.5rem 0; padding: 1rem; background: var(--fd-muted); border: 1px solid var(--fd-border); border-radius: var(--fd-radius); overflow-x: auto; }
.fd-article-content code { font-family: var(--fd-font-mono); font-size: 0.875em; }
.fd-article-content :not(pre) > code { padding: 0.125rem 0.375rem; background: var(--fd-muted); border-radius: var(--fd-radius-sm); }
.fd-article-content blockquote { margin: 1.5rem 0; padding: 0.5rem 0 0.5rem 1.5rem; border-left: 4px solid var(--fd-primary); color: var(--fd-muted-fg); background: var(--fd-muted); border-radius: 0 var(--fd-radius) var(--fd-radius) 0; }
.fd-article-content table { width: 100%; margin: 1.5rem 0; border-collapse: collapse; }
.fd-article-content th, .fd-article-content td { padding: 0.75rem; border: 1px solid var(--fd-border); text-align: left; }
.fd-article-content th { background: var(--fd-muted); font-weight: 600; }
.fd-article-content img { max-width: 100%; height: auto; border-radius: var(--fd-radius); }
.fd-article-content hr { margin: 2rem 0; border: none; border-top: 1px solid var(--fd-border); }
.fd-page-nav { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--fd-border); }
.fd-page-nav-link { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem 1rem; background: var(--fd-background); border: 1px solid var(--fd-border); border-radius: var(--fd-radius); text-decoration: none; transition: border-color 0.15s, background 0.15s; max-width: 45%; }
.fd-page-nav-link:hover { background: var(--fd-muted); border-color: var(--fd-primary); text-decoration: none; }
.fd-page-nav-next { text-align: right; margin-left: auto; }
.fd-page-nav-link small { font-size: 0.75rem; color: var(--fd-muted-fg); text-transform: uppercase; letter-spacing: 0.05em; }
.fd-page-nav-link span { font-size: 0.875rem; font-weight: 500; color: var(--fd-foreground); }
.fd-toc { grid-area: toc; position: sticky; top: var(--fd-header-height); height: calc(100vh - var(--fd-header-height)); overflow-y: auto; padding: 1.5rem 1rem; border-left: 1px solid var(--fd-border); font-size: 0.8125rem; }
.fd-toc-title { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fd-muted-fg); margin-bottom: 1rem; }
.fd-toc-list { list-style: none; border-left: 1px solid var(--fd-border); }
.fd-toc-item { margin: 0; }
.fd-toc-link { display: block; padding: 0.375rem 0 0.375rem 1rem; color: var(--fd-muted-fg); border-left: 2px solid transparent; margin-left: -1px; transition: color 0.15s, border-color 0.15s; }
.fd-toc-link:hover { color: var(--fd-foreground); text-decoration: none; }
.fd-toc-link.active { color: var(--fd-primary); border-left-color: var(--fd-primary); }
.fd-toc-depth-3 .fd-toc-link { padding-left: 1.5rem; }
.fd-toc-depth-4 .fd-toc-link { padding-left: 2rem; }
.fd-footer { border-top: 1px solid var(--fd-border); padding: 2rem 1.5rem; text-align: center; color: var(--fd-muted-fg); font-size: 0.875rem; }
@media (max-width: 1280px) { .fd-container { grid-template-columns: var(--fd-sidebar-width) 1fr; grid-template-areas: "sidebar main"; } .fd-toc { display: none; } }
@media (max-width: 768px) { .fd-container { grid-template-columns: 1fr; grid-template-areas: "main"; } .fd-sidebar { display: none; } .fd-main { padding: 1.5rem; } .fd-article-title { font-size: 1.75rem; } .fd-nav-links { display: none; } }
`
}

/**
 * Generate sidebar HTML from documents
 */
function generateSidebarHtml(documents: Record<string, ContentDocument>, currentPath: string): string {
  // Group documents by directory
  const groups = new Map<string, Array<{ path: string; title: string }>>()

  for (const [path, doc] of Object.entries(documents)) {
    const parts = path.split('/').filter(Boolean)
    const group = parts.length > 1 ? parts[0] || 'root' : 'root'
    const title = (doc.data.title as string) || parts[parts.length - 1] || 'Untitled'

    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)!.push({ path, title })
  }

  // Sort groups and items
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  let html = '<nav class="fd-sidebar-nav" aria-label="Documentation"><ul class="fd-sidebar-list">'

  for (const [group, items] of sortedGroups) {
    const sortedItems = items.sort((a, b) => a.title.localeCompare(b.title))

    if (group !== 'root') {
      const groupTitle = group.charAt(0).toUpperCase() + group.slice(1)
      html += `<li class="fd-sidebar-group"><span class="fd-sidebar-group-title">${escapeHtml(groupTitle)}</span><ul class="fd-sidebar-list">`
    }

    for (const item of sortedItems) {
      const isActive = item.path === currentPath
      const activeClass = isActive ? ' active' : ''
      const ariaCurrent = isActive ? ' aria-current="page"' : ''
      html += `<li class="fd-sidebar-item"><a href="${item.path}" class="fd-sidebar-link${activeClass}"${ariaCurrent}>${escapeHtml(item.title)}</a></li>`
    }

    if (group !== 'root') {
      html += '</ul></li>'
    }
  }

  html += '</ul></nav>'
  return html
}

/**
 * Generate full HTML page with fumadocs layout
 */
function generateHtmlPage(
  doc: ContentDocument,
  siteConfig: { name: string; description?: string },
  allDocuments?: Record<string, ContentDocument>
): string {
  const title = (doc.data.title as string) || siteConfig.name
  const description = (doc.data.description as string) || siteConfig.description || ''
  const htmlContent = markdownToHtml(doc.content)
  const toc = extractTOC(doc.content)

  // Generate sidebar if we have all documents
  const sidebarHtml = allDocuments ? generateSidebarHtml(allDocuments, doc.path) : ''
  const tocHtml = generateTOCHtml(toc)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <style>${getFumadocsCSS()}</style>
</head>
<body>
  <header class="fd-header">
    <nav class="fd-nav">
      <a href="/" class="fd-logo"><strong>${escapeHtml(siteConfig.name)}</strong></a>
      <div class="fd-nav-links">
        <a href="/docs">Docs</a>
        <a href="/api">API</a>
        <a href="/llms.txt">LLMs</a>
      </div>
    </nav>
  </header>
  <div class="fd-container">
    <aside class="fd-sidebar">${sidebarHtml}</aside>
    <main class="fd-main">
      <article class="fd-article">
        <header class="fd-article-header">
          <h1 class="fd-article-title">${escapeHtml(title)}</h1>
          ${description ? `<p class="fd-article-description">${escapeHtml(description)}</p>` : ''}
        </header>
        <section class="fd-article-content">
          ${htmlContent}
        </section>
      </article>
    </main>
    ${tocHtml}
  </div>
  <footer class="fd-footer">
    <p>Powered by <a href="https://mdx.org.ai">MDX.org.ai</a></p>
  </footer>
</body>
</html>`
}

/**
 * Compute Cloudflare asset hash (SHA-256, first 32 hex chars)
 * Format: sha256(base64(content) + extension).slice(0, 32)
 */
function computeAssetHash(content: string, extension: string): string {
  const base64Content = Buffer.from(content).toString('base64')
  return createHash('sha256')
    .update(base64Content + extension)
    .digest('hex')
    .slice(0, 32)
}

/**
 * Build asset bundle from content documents
 */
function buildAssetBundle(
  content: ContentBundle,
  siteConfig: { name: string; description?: string }
): AssetBundle {
  const files: Record<string, AssetFile> = {}
  let totalSize = 0

  for (const [path, doc] of Object.entries(content.documents)) {
    // Normalize path for file names (remove leading slash, handle index)
    const basePath = path === '/index' ? '/index' : path

    // JSON version
    const jsonContent = JSON.stringify(doc, null, 2)
    const jsonPath = `${basePath}.json`
    files[jsonPath] = {
      content: jsonContent,
      contentType: 'application/json',
      size: jsonContent.length,
      hash: computeAssetHash(jsonContent, '.json'),
      binary: false,
    }
    totalSize += jsonContent.length

    // Markdown version (just the content)
    const mdPath = `${basePath}.md`
    files[mdPath] = {
      content: doc.content,
      contentType: 'text/markdown',
      size: doc.content.length,
      hash: computeAssetHash(doc.content, '.md'),
      binary: false,
    }
    totalSize += doc.content.length

    // HTML version with fumadocs layout (pass all documents for sidebar)
    const htmlContent = generateHtmlPage(doc, siteConfig, content.documents)
    const htmlPath = `${basePath}.html`
    files[htmlPath] = {
      content: htmlContent,
      contentType: 'text/html',
      size: htmlContent.length,
      hash: computeAssetHash(htmlContent, '.html'),
      binary: false,
    }
    totalSize += htmlContent.length

    // JS version (if there's compiled code)
    if (doc.compiled) {
      const jsPath = `${basePath}.js`
      files[jsPath] = {
        content: doc.compiled,
        contentType: 'application/javascript',
        size: doc.compiled.length,
        hash: computeAssetHash(doc.compiled, '.js'),
        binary: false,
      }
      totalSize += doc.compiled.length
    }

    // MDX version (original with frontmatter)
    const frontmatter = Object.keys(doc.data).length > 0
      ? `---\n${Object.entries(doc.data).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n`
      : ''
    const mdxContent = frontmatter + doc.content
    const mdxPath = `${basePath}.mdx`
    files[mdxPath] = {
      content: mdxContent,
      contentType: 'text/mdx',
      size: mdxContent.length,
      hash: computeAssetHash(mdxContent, '.mdx'),
      binary: false,
    }
    totalSize += mdxContent.length
  }

  // Generate llms.txt
  const pages = Object.keys(content.documents).sort()
  const llmsTxt = `# ${siteConfig.name}\n\n${siteConfig.description || ''}\n\n## Pages\n\n${pages.map(p => '- ' + p).join('\n')}\n`
  files['/llms.txt'] = {
    content: llmsTxt,
    contentType: 'text/plain',
    size: llmsTxt.length,
    hash: computeAssetHash(llmsTxt, '.txt'),
    binary: false,
  }
  totalSize += llmsTxt.length

  // Generate robots.txt
  const robotsTxt = 'User-agent: *\nAllow: /\n'
  files['/robots.txt'] = {
    content: robotsTxt,
    contentType: 'text/plain',
    size: robotsTxt.length,
    hash: computeAssetHash(robotsTxt, '.txt'),
    binary: false,
  }
  totalSize += robotsTxt.length

  // Calculate bundle hash
  const allHashes = Object.values(files).map(f => f.hash).sort().join('')
  const hash = hashContent(allHashes)

  return { files, hash, totalSize }
}

const VERSION = '0.0.1'

/** Marker for code blocks that should be compiled */
const CODE_BLOCK_REGEX = /```(?:ts|typescript|js|javascript|tsx|jsx)(?:\s+\w+)?\n([\s\S]*?)```/g

/**
 * Simple hash function for content
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
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
    if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
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
    .replace(/\/README$/i, '')

  // Handle dynamic segments
  url = url.replace(/\/\[([^\]]+)\]/g, '/:$1')

  return url || '/'
}

/**
 * Extract exported functions from code blocks
 */
function extractExports(code: string): string[] {
  const exports: string[] = []
  const exportMatches = code.matchAll(/export\s+(?:const|let|var|function|async\s+function)\s+(\w+)/g)
  for (const match of exportMatches) {
    if (match[1]) exports.push(match[1])
  }
  return exports
}

/**
 * Extract code blocks from MDX content
 */
function extractCodeBlocks(content: string): { code: string; exports: string[] }[] {
  const blocks: { code: string; exports: string[] }[] = []
  let match
  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    const code = match[1]!
    const exports = extractExports(code)
    if (exports.length > 0) {
      blocks.push({ code, exports })
    }
  }
  return blocks
}

/**
 * Build content bundle from MDX files
 */
async function buildContentBundle(
  projectDir: string,
  options: { verbose?: boolean; compileCode?: boolean }
): Promise<ContentBundle> {
  const { verbose, compileCode = false } = options
  const mdxFiles = findMdxFiles(projectDir)
  const documents: Record<string, ContentDocument> = {}
  const functions: Record<string, { name: string; source: string; compiled: string }> = {}

  for (const file of mdxFiles) {
    const filePath = join(projectDir, file)
    const raw = readFileSync(filePath, 'utf-8')
    const doc = parse(raw)
    const url = fileToUrl(file)

    if (verbose) {
      console.log(`  ${url} <- ${file}`)
    }

    // Extract and optionally compile code blocks
    let compiled: string | undefined
    if (compileCode) {
      const codeBlocks = extractCodeBlocks(doc.content)
      if (codeBlocks.length > 0) {
        // Combine all code blocks
        const allCode = codeBlocks.map(b => b.code).join('\n\n')
        compiled = allCode

        // Register exported functions
        for (const block of codeBlocks) {
          for (const exportName of block.exports) {
            functions[`${url}#${exportName}`] = {
              name: exportName,
              source: url,
              compiled: block.code,
            }
            if (verbose) {
              console.log(`    -> export ${exportName}`)
            }
          }
        }
      }
    }

    documents[url] = {
      path: url,
      data: doc.data,
      content: doc.content,
      compiled,
      hash: hashContent(raw),
    }
  }

  // Calculate overall content hash
  const allHashes = Object.values(documents).map(d => d.hash).sort().join('')
  const hash = hashContent(allHashes)

  return {
    documents,
    functions: Object.keys(functions).length > 0 ? functions : undefined,
    hash,
    count: Object.keys(documents).length,
  }
}

/**
 * Read site config from package.json
 */
function getSiteConfig(projectDir: string): { name: string; description?: string; url?: string } {
  const pkgPath = join(projectDir, 'package.json')
  let config = { name: 'MDX Site' }

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      config = {
        name: pkg.name || config.name,
        description: pkg.description,
        url: pkg.homepage,
        ...(pkg.mdxe || {}),
      }
    } catch {
      // ignore
    }
  }

  return config
}

/**
 * Generate the worker entry code
 */
function generateWorkerEntry(contentBundle: ContentBundle, siteConfig: { name: string; description?: string }): string {
  // Serialize content as JSON
  const contentJson = JSON.stringify(contentBundle.documents, null, 2)

  return `/**
 * Generated by @mdxe/workers build
 * Do not edit directly
 */

// Embedded content
const CONTENT = ${contentJson};

const SITE_CONFIG = {
  name: ${JSON.stringify(siteConfig.name)},
  description: ${JSON.stringify(siteConfig.description || '')},
};

// Simple markdown to HTML conversion
function contentToHtml(content) {
  let html = content;

  // Preserve code blocks
  const codeBlocks = [];
  html = html.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, (_, lang, code) => {
    const langAttr = lang ? \` class="language-\${lang}"\` : '';
    const escaped = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const placeholder = '\\x00CB' + codeBlocks.length + '\\x00';
    codeBlocks.push(\`<pre><code\${langAttr}>\${escaped}</code></pre>\`);
    return placeholder;
  });

  // Inline code
  const inlineCodes = [];
  html = html.replace(/\`([^\`]+)\`/g, (_, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const placeholder = '\\x00IC' + inlineCodes.length + '\\x00';
    inlineCodes.push(\`<code>\${escaped}</code>\`);
    return placeholder;
  });

  // Helper for inline formatting (bold, italic, links, code)
  const formatInline = (text) => {
    let result = text;
    // Inline code first (to protect from other formatting)
    result = result.replace(/\`([^\`]+)\`/g, (_, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return \`<code>\${escaped}</code>\`;
    });
    // Bold and italic
    result = result.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
    result = result.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    result = result.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
    // Links
    result = result.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');
    return result;
  };

  // GFM Tables - must be done before other block-level processing
  const tables = [];
  html = html.replace(/^(\\|.+\\|\\n)(\\|[-:|\\s]+\\|\\n)((?:\\|.+\\|\\n?)+)/gm, (match, headerRow, separatorRow, bodyRows) => {
    const parseRow = (row) => row.trim().replace(/^\\|\\s*|\\s*\\|$/g, '').split(/\\s*\\|\\s*/);
    const alignments = separatorRow.trim().replace(/^\\|\\s*|\\s*\\|$/g, '').split(/\\s*\\|\\s*/).map(cell => {
      if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
      if (cell.endsWith(':')) return 'right';
      return 'left';
    });

    const headers = parseRow(headerRow);
    const headerHtml = '<tr>' + headers.map((h, i) => \`<th style="text-align:\${alignments[i] || 'left'}">\${formatInline(h)}</th>\`).join('') + '</tr>';

    const rows = bodyRows.trim().split('\\n').filter(r => r.trim());
    const bodyHtml = rows.map(row => {
      const cells = parseRow(row);
      return '<tr>' + cells.map((c, i) => \`<td style="text-align:\${alignments[i] || 'left'}">\${formatInline(c)}</td>\`).join('') + '</tr>';
    }).join('');

    const placeholder = '\\x00TBL' + tables.length + '\\x00';
    tables.push(\`<table><thead>\${headerHtml}</thead><tbody>\${bodyHtml}</tbody></table>\`);
    return placeholder;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/<\\/blockquote>\\n<blockquote>/g, '\\n');

  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">');

  // Horizontal rules
  html = html.replace(/^(-{3,}|\\*{3,}|_{3,})$/gm, '<hr>');

  // Unordered lists
  html = html.replace(/^[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\\/li>\\n?)+/g, '<ul>$&</ul>');

  // Restore code blocks, inline code, and tables
  codeBlocks.forEach((block, i) => {
    html = html.replace('\\x00CB' + i + '\\x00', block);
  });
  inlineCodes.forEach((code, i) => {
    html = html.replace('\\x00IC' + i + '\\x00', code);
  });
  tables.forEach((table, i) => {
    html = html.replace('\\x00TBL' + i + '\\x00', table);
  });

  // Paragraphs
  const lines = html.split('\\n');
  const result = [];
  let inParagraph = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      continue;
    }

    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('<table') ||
      trimmed.startsWith('</ul') ||
      trimmed.startsWith('</ol') ||
      trimmed.startsWith('</blockquote')
    ) {
      if (inParagraph) {
        result.push('</p>');
        inParagraph = false;
      }
      result.push(line);
      continue;
    }

    if (!inParagraph) {
      result.push('<p>' + line);
      inParagraph = true;
    } else {
      result.push(' ' + trimmed);
    }
  }

  if (inParagraph) {
    result.push('</p>');
  }

  return result.join('\\n');
}

// Escape HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML template
function renderPage(doc, content) {
  const title = doc.data.title || SITE_CONFIG.name;
  const description = doc.data.description || SITE_CONFIG.description || '';
  const htmlContent = contentToHtml(content);

  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="\${escapeHtml(description)}">
  <title>\${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    main { padding-top: 2rem; padding-bottom: 4rem; }
    pre { background: var(--pico-code-background-color); padding: 1rem; border-radius: var(--pico-border-radius); overflow-x: auto; }
    code { font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid var(--pico-muted-border-color); padding: 0.5rem 1rem; }
    th { background: var(--pico-card-background-color); font-weight: 600; }
  </style>
</head>
<body>
  <header class="container">
    <nav>
      <ul><li><strong><a href="/">\${escapeHtml(SITE_CONFIG.name)}</a></strong></li></ul>
      <ul><li><a href="/llms.txt">LLMs</a></li></ul>
    </nav>
  </header>
  <main class="container">
    <article>
      \${htmlContent}
    </article>
  </main>
  <footer class="container">
    <p><small>Powered by MDXE</small></p>
  </footer>
</body>
</html>\`;
}

// Main worker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // Normalize path
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // Check for static assets (if ASSETS binding exists from Static Assets)
    if (env?.ASSETS?.fetch) {
      // Check if path has an extension - serve directly from static assets
      const ext = path.match(/\\.(json|md|mdx|html|js|txt)$/)?.[0];
      if (ext) {
        const assetResponse = await env.ASSETS.fetch(new Request(url.origin + path));
        if (assetResponse.ok) {
          return assetResponse;
        }
      }

      // For paths without extension, do content negotiation
      const accept = request.headers.get('Accept') || '';
      const basePath = path === '/' ? '/index' : path;

      // JSON
      if (accept.includes('application/json')) {
        const assetResponse = await env.ASSETS.fetch(new Request(url.origin + basePath + '.json'));
        if (assetResponse.ok) return assetResponse;
      }

      // Markdown
      if (accept.includes('text/markdown')) {
        const assetResponse = await env.ASSETS.fetch(new Request(url.origin + basePath + '.md'));
        if (assetResponse.ok) return assetResponse;
      }

      // HTML (default)
      if (accept.includes('text/html') || !accept || accept.includes('*/*')) {
        const assetResponse = await env.ASSETS.fetch(new Request(url.origin + basePath + '.html'));
        if (assetResponse.ok) return assetResponse;
      }

      // Try special files
      if (path === '/robots.txt' || path === '/llms.txt') {
        const assetResponse = await env.ASSETS.fetch(new Request(url.origin + path));
        if (assetResponse.ok) return assetResponse;
      }
    }

    // Fallback to embedded content for robots.txt and llms.txt
    if (path === '/robots.txt') {
      return new Response('User-agent: *\\nAllow: /\\n', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (path === '/llms.txt') {
      const pages = Object.keys(CONTENT).sort();
      const text = \`# \${SITE_CONFIG.name}\\n\\n\${SITE_CONFIG.description || ''}\\n\\n## Pages\\n\\n\${pages.map(p => '- ' + p).join('\\n')}\\n\`;
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Fallback to embedded CONTENT (for embedded mode without static assets)
    let doc = CONTENT[path];

    // Try index if not found
    if (!doc && path !== '/') {
      doc = CONTENT[path + '/index'] || CONTENT[path + '/README'];
    }
    if (!doc && path === '/') {
      doc = CONTENT['/index'] || CONTENT['/README'] || Object.values(CONTENT)[0];
    }

    if (!doc) {
      return new Response('Not Found', { status: 404 });
    }

    // Content negotiation for embedded content
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify(doc), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Render HTML
    const html = renderPage(doc, doc.content);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
`
}

/**
 * Build a namespace bundle from a project directory
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
  const startTime = Date.now()
  const logs: string[] = []
  const {
    projectDir,
    outDir,
    target = 'workers',
    minify = true,
    sourceMaps = false,
    verbose,
    contentStorage = 'embedded',
  } = options

  try {
    logs.push(`Building from ${projectDir}`)

    // Build content bundle (with code compilation)
    logs.push('Scanning for MDX files...')
    const content = await buildContentBundle(projectDir, {
      verbose,
      compileCode: true,
    })
    logs.push(`Found ${content.count} documents`)
    if (content.functions) {
      logs.push(`Found ${Object.keys(content.functions).length} exported functions`)
    }

    // Get site config
    const siteConfig = getSiteConfig(projectDir)
    logs.push(`Site: ${siteConfig.name}`)

    // Generate worker entry
    logs.push('Generating worker entry...')
    const workerCode = generateWorkerEntry(content, siteConfig)

    // Create temp file for bundling
    const tempDir = join(projectDir, '.mdxe-build')
    mkdirSync(tempDir, { recursive: true })
    const entryPath = join(tempDir, 'worker.js')
    writeFileSync(entryPath, workerCode)

    // Bundle with esbuild
    logs.push('Bundling with esbuild...')
    const result = await esbuild({
      entryPoints: [entryPath],
      bundle: true,
      minify,
      sourcemap: sourceMaps ? 'inline' : false,
      format: 'esm',
      target: 'es2022',
      platform: 'browser', // Workers are browser-like
      write: false,
      outfile: 'worker.js',
    })

    const bundledCode = result.outputFiles?.[0]?.text || workerCode

    // Create worker bundle
    const worker: WorkerBundle = {
      main: bundledCode,
      entrypoint: 'worker.js',
      sourceMap: sourceMaps ? result.outputFiles?.[1]?.text : undefined,
    }

    // Create namespace metadata
    const compatDate = options.compatibilityDate || new Date().toISOString().split('T')[0]!
    const meta: NamespaceMeta = {
      name: siteConfig.name,
      built: new Date().toISOString(),
      config: {
        compatibilityDate: compatDate,
        compatibilityFlags: options.compatibilityFlags,
      },
      build: {
        version: VERSION,
        timestamp: new Date().toISOString(),
        target,
        minified: minify,
        sourceMaps,
      },
    }

    // Build static assets
    logs.push('Generating static assets...')
    const assets = buildAssetBundle(content, siteConfig)
    logs.push(`Generated ${Object.keys(assets.files).length} asset files (${(assets.totalSize / 1024).toFixed(1)} KB)`)

    // Create bundle
    const bundle: NamespaceBundle = {
      worker,
      content,
      assets,
      meta,
    }

    // Write output if outDir specified
    if (outDir) {
      const outputPath = join(projectDir, outDir)
      mkdirSync(outputPath, { recursive: true })

      writeFileSync(join(outputPath, 'worker.js'), worker.main)
      writeFileSync(join(outputPath, 'content.json'), JSON.stringify(content, null, 2))
      writeFileSync(join(outputPath, 'meta.json'), JSON.stringify(meta, null, 2))

      logs.push(`Output written to ${outputPath}`)
    }

    // Cleanup temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }

    const duration = Date.now() - startTime
    logs.push(`Build completed in ${duration}ms`)

    return {
      success: true,
      bundle,
      logs,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime

    // Attempt cleanup on error
    try {
      rmSync(join(projectDir, '.mdxe-build'), { recursive: true, force: true })
    } catch {
      // Ignore
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      duration,
    }
  }
}

/**
 * Build and return just the worker code (convenience function)
 */
export async function buildWorker(projectDir: string, options?: Partial<BuildOptions>): Promise<string> {
  const result = await build({ projectDir, ...options })
  if (!result.success || !result.bundle) {
    throw new Error(result.error || 'Build failed')
  }
  return result.bundle.worker.main
}
