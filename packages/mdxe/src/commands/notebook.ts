/**
 * mdxe notebook command
 *
 * Launches an interactive notebook server for MDX files
 */

import { resolve, basename, extname } from 'node:path'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { exec } from 'node:child_process'

export interface NotebookOptions {
  path: string
  port: number
  host: string
  open: boolean
  verbose: boolean
}

interface NotebookCell {
  id: string
  type: 'code' | 'markdown'
  source: string
  language: string
  outputs: unknown[]
}

interface NotebookDocument {
  id: string
  title: string
  cells: NotebookCell[]
  filePath?: string
}

/**
 * Parse MDX file into notebook cells
 */
function parseMdxToNotebook(content: string, filePath: string): NotebookDocument {
  const cells: NotebookCell[] = []
  let cellId = 0

  const generateId = () => `cell-${++cellId}`

  // Split content into sections
  const lines = content.split('\n')
  let currentMarkdown: string[] = []
  let inCodeBlock = false
  let codeBlockLang = ''
  let codeBlockContent: string[] = []

  for (const line of lines) {
    // Check for code block start
    if (!inCodeBlock && line.startsWith('```')) {
      // Flush any accumulated markdown
      if (currentMarkdown.length > 0) {
        const source = currentMarkdown.join('\n').trim()
        if (source) {
          cells.push({
            id: generateId(),
            type: 'markdown',
            source,
            language: 'markdown',
            outputs: [],
          })
        }
        currentMarkdown = []
      }

      inCodeBlock = true
      // Extract language from opening fence
      codeBlockLang = line.slice(3).split(/\s/)[0] || 'javascript'
      codeBlockContent = []
    } else if (inCodeBlock && line.startsWith('```')) {
      // End of code block
      inCodeBlock = false
      const source = codeBlockContent.join('\n')
      if (source.trim()) {
        cells.push({
          id: generateId(),
          type: 'code',
          source,
          language: codeBlockLang,
          outputs: [],
        })
      }
      codeBlockContent = []
      codeBlockLang = ''
    } else if (inCodeBlock) {
      codeBlockContent.push(line)
    } else {
      currentMarkdown.push(line)
    }
  }

  // Flush remaining markdown
  if (currentMarkdown.length > 0) {
    const source = currentMarkdown.join('\n').trim()
    if (source) {
      cells.push({
        id: generateId(),
        type: 'markdown',
        source,
        language: 'markdown',
        outputs: [],
      })
    }
  }

  return {
    id: filePath,
    title: basename(filePath, extname(filePath)),
    cells,
    filePath,
  }
}

/**
 * Convert notebook back to MDX
 */
function notebookToMdx(doc: NotebookDocument): string {
  const parts: string[] = []

  for (const cell of doc.cells) {
    if (cell.type === 'markdown') {
      parts.push(cell.source)
    } else if (cell.type === 'code') {
      parts.push(`\`\`\`${cell.language}\n${cell.source}\n\`\`\``)
    }
  }

  return parts.join('\n\n')
}

/**
 * List MDX files in directory
 */
function listMdxFiles(dir: string): string[] {
  const files: string[] = []

  function scan(currentDir: string) {
    const entries = readdirSync(currentDir)
    for (const entry of entries) {
      const fullPath = resolve(currentDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        scan(fullPath)
      } else if (stat.isFile() && (entry.endsWith('.mdx') || entry.endsWith('.md'))) {
        files.push(fullPath)
      }
    }
  }

  scan(dir)
  return files
}

/**
 * Generate the notebook UI HTML
 */
function generateNotebookHtml(doc: NotebookDocument): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.title} - MDX Notebook</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
    }
    .header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header h1 { font-size: 1.25rem; font-weight: 600; }
    .toolbar {
      display: flex;
      gap: 0.5rem;
      margin-left: auto;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      background: white;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .btn:hover { background: #f9fafb; }
    .btn-primary {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    .btn-primary:hover { background: #2563eb; }
    .btn-success {
      background: #10b981;
      color: white;
      border-color: #10b981;
    }
    .btn-success:hover { background: #059669; }
    .notebook {
      max-width: 900px;
      margin: 0 auto;
      padding: 1rem;
    }
    .cell {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
      overflow: hidden;
    }
    .cell.active { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
    .cell-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.75rem;
    }
    .cell-type {
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-weight: 500;
    }
    .cell-type.code { background: #dbeafe; color: #1d4ed8; }
    .cell-type.markdown { background: #fef3c7; color: #92400e; }
    .cell-actions { margin-left: auto; display: flex; gap: 0.25rem; }
    .cell-actions button {
      padding: 0.25rem 0.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }
    .cell-actions button:hover { background: #e5e7eb; }
    .cell-content {
      padding: 0.75rem;
    }
    .cell-editor {
      width: 100%;
      min-height: 100px;
      padding: 0.75rem;
      border: none;
      font-family: ui-monospace, monospace;
      font-size: 0.875rem;
      resize: vertical;
      background: #fafafa;
    }
    .cell-editor:focus { outline: none; background: white; }
    .cell-output {
      border-top: 1px solid #e5e7eb;
      padding: 0.75rem;
      background: #f9fafb;
      font-family: ui-monospace, monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
    }
    .cell-output.error { color: #dc2626; background: #fef2f2; }
    .markdown-preview {
      padding: 0.75rem;
      line-height: 1.6;
    }
    .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 {
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    .markdown-preview p { margin-bottom: 0.5rem; }
    .markdown-preview code {
      background: #f3f4f6;
      padding: 0.125rem 0.25rem;
      border-radius: 0.25rem;
      font-family: ui-monospace, monospace;
    }
    .add-cell {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .cell:hover + .add-cell, .add-cell:hover { opacity: 1; }
    .execution-count {
      color: #6b7280;
      font-family: ui-monospace, monospace;
    }
    .status { margin-left: 0.5rem; color: #6b7280; }
    .status.running { color: #f59e0b; }
    .status.success { color: #10b981; }
    .status.error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${doc.title}</h1>
    <span class="status" id="status"></span>
    <div class="toolbar">
      <button class="btn" onclick="addCell('code')">+ Code</button>
      <button class="btn" onclick="addCell('markdown')">+ Markdown</button>
      <button class="btn btn-success" onclick="runAll()">Run All</button>
      <button class="btn btn-primary" onclick="save()">Save</button>
    </div>
  </div>

  <div class="notebook" id="notebook"></div>

  <script>
    let notebook = ${JSON.stringify(doc)};
    let activeCell = null;
    let executionCount = 0;

    function render() {
      const container = document.getElementById('notebook');
      container.innerHTML = notebook.cells.map((cell, index) => \`
        <div class="cell \${activeCell === cell.id ? 'active' : ''}"
             onclick="setActive('\${cell.id}')"
             data-id="\${cell.id}">
          <div class="cell-header">
            <span class="cell-type \${cell.type}">\${cell.type === 'code' ? cell.language : 'markdown'}</span>
            \${cell.executionCount ? \`<span class="execution-count">[\${cell.executionCount}]</span>\` : ''}
            <div class="cell-actions">
              \${cell.type === 'code' ? \`<button onclick="event.stopPropagation(); runCell('\${cell.id}')">▶ Run</button>\` : ''}
              <button onclick="event.stopPropagation(); moveCell('\${cell.id}', -1)">↑</button>
              <button onclick="event.stopPropagation(); moveCell('\${cell.id}', 1)">↓</button>
              <button onclick="event.stopPropagation(); deleteCell('\${cell.id}')">×</button>
            </div>
          </div>
          <div class="cell-content">
            \${cell.type === 'code'
              ? \`<textarea class="cell-editor"
                   onchange="updateCell('\${cell.id}', this.value)"
                   onkeydown="handleKeyDown(event, '\${cell.id}')">\${escapeHtml(cell.source)}</textarea>\`
              : \`<div class="markdown-preview" ondblclick="editMarkdown('\${cell.id}')">\${renderMarkdown(cell.source)}</div>\`
            }
          </div>
          \${cell.outputs && cell.outputs.length > 0 ? \`
            <div class="cell-output \${cell.outputs.some(o => o.type === 'error') ? 'error' : ''}">
              \${cell.outputs.map(o => formatOutput(o)).join('\\n')}
            </div>
          \` : ''}
        </div>
        <div class="add-cell">
          <button class="btn" onclick="addCellAfter('\${cell.id}', 'code')">+ Code</button>
          <button class="btn" onclick="addCellAfter('\${cell.id}', 'markdown')">+ Markdown</button>
        </div>
      \`).join('');
    }

    function escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderMarkdown(text) {
      return text
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/\`(.+?)\`/g, '<code>$1</code>')
        .replace(/\\n/g, '<br>');
    }

    function formatOutput(output) {
      if (output.type === 'error') {
        return output.data.message || output.data;
      }
      if (output.type === 'table' && output.data.rows) {
        const cols = output.data.columns;
        const header = '| ' + cols.join(' | ') + ' |';
        const sep = '|' + cols.map(() => '---').join('|') + '|';
        const rows = output.data.rows.map(r => '| ' + cols.map(c => r[c] ?? '').join(' | ') + ' |');
        return [header, sep, ...rows].join('\\n');
      }
      if (typeof output.data === 'object') {
        return JSON.stringify(output.data, null, 2);
      }
      return String(output.data);
    }

    function setActive(id) {
      activeCell = id;
      render();
    }

    function generateId() {
      return 'cell-' + Math.random().toString(36).substr(2, 9);
    }

    function addCell(type) {
      notebook.cells.push({
        id: generateId(),
        type,
        source: '',
        language: type === 'code' ? 'typescript' : 'markdown',
        outputs: []
      });
      render();
    }

    function addCellAfter(afterId, type) {
      const index = notebook.cells.findIndex(c => c.id === afterId);
      const newCell = {
        id: generateId(),
        type,
        source: '',
        language: type === 'code' ? 'typescript' : 'markdown',
        outputs: []
      };
      notebook.cells.splice(index + 1, 0, newCell);
      render();
    }

    function updateCell(id, source) {
      const cell = notebook.cells.find(c => c.id === id);
      if (cell) cell.source = source;
    }

    function deleteCell(id) {
      notebook.cells = notebook.cells.filter(c => c.id !== id);
      render();
    }

    function moveCell(id, direction) {
      const index = notebook.cells.findIndex(c => c.id === id);
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < notebook.cells.length) {
        const [cell] = notebook.cells.splice(index, 1);
        notebook.cells.splice(newIndex, 0, cell);
        render();
      }
    }

    function handleKeyDown(event, cellId) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        runCell(cellId);
      }
    }

    async function runCell(id) {
      const cell = notebook.cells.find(c => c.id === id);
      if (!cell || cell.type !== 'code') return;

      setStatus('running');
      cell.outputs = [];
      render();

      try {
        const response = await fetch('/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cell.source, language: cell.language })
        });
        const result = await response.json();

        executionCount++;
        cell.executionCount = executionCount;
        cell.outputs = result.outputs || [];
        setStatus(result.outputs?.some(o => o.type === 'error') ? 'error' : 'success');
      } catch (err) {
        cell.outputs = [{ type: 'error', data: { message: err.message } }];
        setStatus('error');
      }
      render();
    }

    async function runAll() {
      for (const cell of notebook.cells) {
        if (cell.type === 'code') {
          await runCell(cell.id);
        }
      }
    }

    async function save() {
      setStatus('running');
      try {
        const response = await fetch('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notebook)
        });
        if (response.ok) {
          setStatus('success');
          setTimeout(() => setStatus(''), 2000);
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    }

    function setStatus(status) {
      const el = document.getElementById('status');
      el.className = 'status ' + status;
      el.textContent = status === 'running' ? 'Running...'
        : status === 'success' ? 'Saved'
        : status === 'error' ? 'Error'
        : '';
    }

    function editMarkdown(id) {
      const cell = notebook.cells.find(c => c.id === id);
      if (!cell) return;
      const newSource = prompt('Edit markdown:', cell.source);
      if (newSource !== null) {
        cell.source = newSource;
        render();
      }
    }

    render();
  </script>
</body>
</html>`
}

/**
 * Run the notebook server
 */
export async function runNotebook(options: NotebookOptions): Promise<void> {
  console.log('📓 mdxe notebook\n')

  const targetPath = resolve(options.path)

  if (!existsSync(targetPath)) {
    console.error(`❌ Path not found: ${targetPath}`)
    process.exit(1)
  }

  const stat = statSync(targetPath)
  let documents: NotebookDocument[] = []

  if (stat.isFile()) {
    // Single file mode
    const content = readFileSync(targetPath, 'utf-8')
    documents = [parseMdxToNotebook(content, targetPath)]
    console.log(`📄 File: ${targetPath}`)
  } else {
    // Directory mode - list all MDX files
    const files = listMdxFiles(targetPath)
    documents = files.map(f => {
      const content = readFileSync(f, 'utf-8')
      return parseMdxToNotebook(content, f)
    })
    console.log(`📁 Directory: ${targetPath}`)
    console.log(`📋 Found ${files.length} MDX file(s)`)
  }

  // Execution context for running code
  const context: Record<string, unknown> = {}

  // Create HTTP server
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${options.host}:${options.port}`)

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Serve notebook UI
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      const doc = documents[0] // For now, serve first document
      res.setHeader('Content-Type', 'text/html')
      res.end(generateNotebookHtml(doc))
      return
    }

    // Execute code
    if (url.pathname === '/execute' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const { code, language } = JSON.parse(body)
          const outputs = await executeCode(code, language, context)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ outputs }))
        } catch (err: unknown) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            outputs: [{
              type: 'error',
              data: { message: (err as Error).message },
              timestamp: Date.now()
            }]
          }))
        }
      })
      return
    }

    // Save notebook
    if (url.pathname === '/save' && req.method === 'POST') {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', async () => {
        try {
          const doc = JSON.parse(body) as NotebookDocument
          if (doc.filePath) {
            const mdxContent = notebookToMdx(doc)
            writeFileSync(doc.filePath, mdxContent, 'utf-8')
            // Update in-memory document
            const existing = documents.find(d => d.id === doc.id)
            if (existing) {
              Object.assign(existing, doc)
            }
          }
          res.writeHead(200)
          res.end()
        } catch (err: unknown) {
          res.writeHead(500)
          res.end((err as Error).message)
        }
      })
      return
    }

    // 404
    res.writeHead(404)
    res.end('Not found')
  })

  server.listen(options.port, options.host, () => {
    const url = `http://${options.host}:${options.port}`
    console.log(`🌐 Server: ${url}`)
    console.log('')
    console.log('Press Ctrl+C to stop')

    // Open browser if requested
    if (options.open) {
      const cmd = process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open'
      exec(`${cmd} ${url}`)
    }
  })
}

/**
 * Execute code in a sandboxed context
 */
async function executeCode(
  code: string,
  language: string,
  context: Record<string, unknown>
): Promise<Array<{ type: string; data: unknown; timestamp: number }>> {
  const outputs: Array<{ type: string; data: unknown; timestamp: number }> = []
  const startTime = Date.now()

  // Capture console output
  const logs: string[] = []
  const originalLog = console.log
  console.log = (...args) => {
    logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
  }

  try {
    // Create sandboxed function
    const fn = new Function(
      'context',
      'sql',
      `
      with (context) {
        ${code}
      }
      `
    )

    // Simple sql tagged template (returns the query for now)
    const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
      let query = strings[0]
      for (let i = 0; i < values.length; i++) {
        query += String(values[i]) + strings[i + 1]
      }
      return { query, execute: async () => ({ columns: [], rows: [] }) }
    }

    const result = await fn(context, sql)

    // Add console logs as outputs
    for (const log of logs) {
      outputs.push({
        type: 'text',
        data: log,
        timestamp: Date.now(),
      })
    }

    // Add result if not undefined
    if (result !== undefined) {
      // Detect output type
      let type = 'text'
      if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
        type = 'table'
        outputs.push({
          type: 'table',
          data: {
            columns: Object.keys(result[0]),
            rows: result,
          },
          timestamp: Date.now(),
        })
      } else if (typeof result === 'object' && result !== null) {
        outputs.push({
          type: 'json',
          data: result,
          timestamp: Date.now(),
        })
      } else {
        outputs.push({
          type: 'text',
          data: String(result),
          timestamp: Date.now(),
        })
      }
    }
  } catch (error: unknown) {
    outputs.push({
      type: 'error',
      data: {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
      timestamp: Date.now(),
    })
  } finally {
    console.log = originalLog
  }

  return outputs
}
