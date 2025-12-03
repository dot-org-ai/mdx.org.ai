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

    // robots.txt
    if (path === '/robots.txt') {
      return new Response('User-agent: *\\nAllow: /\\n', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // llms.txt
    if (path === '/llms.txt') {
      const pages = Object.keys(CONTENT).sort();
      const text = \`# \${SITE_CONFIG.name}\\n\\n\${SITE_CONFIG.description || ''}\\n\\n## Pages\\n\\n\${pages.map(p => '- ' + p).join('\\n')}\\n\`;
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Look up content
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

    // Content negotiation
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

    // Create bundle
    const bundle: NamespaceBundle = {
      worker,
      content,
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
