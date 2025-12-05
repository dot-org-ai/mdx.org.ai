/**
 * @mdxdb/studio/server - HTTP server for the studio
 *
 * Provides a standalone HTTP server that serves the studio UI
 * and handles API requests for file operations.
 *
 * @packageDocumentation
 */

import * as http from 'node:http'
import * as path from 'node:path'
import * as fs from 'node:fs'
import { createStudio, type StudioConfig, type Studio, type FileEntry } from './index'

/**
 * Server configuration
 */
export interface ServerConfig extends StudioConfig {
  /** Host to bind to (default: localhost) */
  host?: string
  /** Enable CORS (default: true) */
  cors?: boolean
}

/**
 * Studio server instance
 */
export interface StudioServer {
  /** Start the server */
  start(): Promise<void>
  /** Stop the server */
  stop(): Promise<void>
  /** Get the server URL */
  getUrl(): string
  /** Get the studio instance */
  getStudio(): Studio
}

/**
 * Create the studio server
 */
export function createServer(config: ServerConfig): StudioServer {
  const {
    port = 4321,
    host = 'localhost',
    cors = true,
    ...studioConfig
  } = config

  const studio = createStudio(studioConfig)
  let server: http.Server | null = null

  const setCorsHeaders = (res: http.ServerResponse) => {
    if (cors) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
  }

  const sendJson = (res: http.ServerResponse, data: unknown, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  const sendError = (res: http.ServerResponse, message: string, status = 500) => {
    sendJson(res, { error: message }, status)
  }

  const readBody = (req: http.IncomingMessage): Promise<string> => {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => body += chunk)
      req.on('end', () => resolve(body))
      req.on('error', reject)
    })
  }

  const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse) => {
    setCorsHeaders(res)

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://${host}:${port}`)
    const pathname = url.pathname

    try {
      // API routes
      if (pathname.startsWith('/api/')) {
        await handleApiRequest(req, res, pathname.slice(5), url)
        return
      }

      // Serve static UI
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(getStudioHtml(port))
        return
      }

      // 404 for other paths
      sendError(res, 'Not found', 404)
    } catch (error) {
      console.error('Request error:', error)
      sendError(res, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleApiRequest = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string,
    url: URL
  ) => {
    // GET /api/files - List files
    if (pathname === 'files' && req.method === 'GET') {
      const files = await studio.getFiles()
      sendJson(res, { files })
      return
    }

    // GET /api/document?path=... - Read document
    if (pathname === 'document' && req.method === 'GET') {
      const docPath = url.searchParams.get('path')
      if (!docPath) {
        sendError(res, 'Missing path parameter', 400)
        return
      }
      const doc = await studio.readDocument(docPath)
      sendJson(res, doc)
      return
    }

    // PUT /api/document - Save document
    if (pathname === 'document' && req.method === 'PUT') {
      const body = await readBody(req)
      const { path: docPath, content } = JSON.parse(body) as { path: string; content: string }
      if (!docPath || content === undefined) {
        sendError(res, 'Missing path or content', 400)
        return
      }
      await studio.saveDocument(docPath, content)
      sendJson(res, { success: true })
      return
    }

    // POST /api/document - Create document
    if (pathname === 'document' && req.method === 'POST') {
      const body = await readBody(req)
      const { path: docPath, template } = JSON.parse(body) as { path: string; template?: string }
      if (!docPath) {
        sendError(res, 'Missing path', 400)
        return
      }
      const doc = await studio.createDocument(docPath, template)
      sendJson(res, doc)
      return
    }

    // DELETE /api/document?path=... - Delete document
    if (pathname === 'document' && req.method === 'DELETE') {
      const docPath = url.searchParams.get('path')
      if (!docPath) {
        sendError(res, 'Missing path parameter', 400)
        return
      }
      await studio.deleteDocument(docPath)
      sendJson(res, { success: true })
      return
    }

    // POST /api/parse - Parse MDX content
    if (pathname === 'parse' && req.method === 'POST') {
      const body = await readBody(req)
      const { content } = JSON.parse(body) as { content: string }
      const doc = studio.parse(content)
      sendJson(res, { doc })
      return
    }

    sendError(res, 'Not found', 404)
  }

  return {
    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server = http.createServer(handleRequest)
        server.on('error', reject)
        server.listen(port, host, () => {
          console.log(`🎨 MDXDB Studio running at http://${host}:${port}`)
          console.log(`📁 Content directory: ${studioConfig.contentDir}`)
          resolve()
        })
      })
    },

    async stop(): Promise<void> {
      return new Promise((resolve) => {
        if (server) {
          server.close(() => resolve())
        } else {
          resolve()
        }
      })
    },

    getUrl(): string {
      return `http://${host}:${port}`
    },

    getStudio(): Studio {
      return studio
    },
  }
}

/**
 * Generate the studio HTML UI
 */
function getStudioHtml(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MDXDB Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #252526;
      padding: 8px 16px;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    header h1 { font-size: 14px; font-weight: 600; color: #fff; }
    .container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 250px;
      background: #252526;
      border-right: 1px solid #3c3c3c;
      overflow: auto;
    }
    .sidebar-header {
      padding: 8px 16px;
      font-size: 11px;
      text-transform: uppercase;
      color: #858585;
      border-bottom: 1px solid #3c3c3c;
    }
    .file-tree { padding: 4px 0; }
    .file-item {
      display: flex;
      align-items: center;
      padding: 4px 16px;
      cursor: pointer;
      font-size: 13px;
    }
    .file-item:hover { background: #2a2d2e; }
    .file-item.selected { background: #094771; }
    .file-icon { margin-right: 6px; }
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .editor-header {
      padding: 8px 16px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .editor-header .path { color: #858585; }
    .editor-header .dirty { color: #ffb86c; margin-left: 8px; }
    .editor {
      flex: 1;
      overflow: hidden;
    }
    textarea {
      width: 100%;
      height: 100%;
      background: #1e1e1e;
      color: #d4d4d4;
      border: none;
      padding: 16px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      resize: none;
      outline: none;
    }
    .btn {
      background: #0e639c;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn:hover { background: #1177bb; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .status {
      background: #007acc;
      padding: 4px 16px;
      font-size: 12px;
      color: #fff;
    }
  </style>
</head>
<body>
  <header>
    <h1>🎨 MDXDB Studio</h1>
    <button class="btn" onclick="newDocument()">+ New</button>
    <button class="btn" onclick="saveDocument()" id="saveBtn" disabled>Save</button>
  </header>
  <div class="container">
    <div class="sidebar">
      <div class="sidebar-header">Explorer</div>
      <div class="file-tree" id="fileTree">Loading...</div>
    </div>
    <div class="editor-container">
      <div class="editor-header">
        <span class="path" id="currentPath">Select a file to edit</span>
        <span class="dirty" id="dirtyIndicator" style="display:none">●</span>
      </div>
      <div class="editor">
        <textarea id="editor" placeholder="Select a file to edit..." disabled></textarea>
      </div>
    </div>
  </div>
  <div class="status" id="status">Ready</div>

  <script>
    const API = 'http://localhost:${port}/api';
    let currentFile = null;
    let isDirty = false;
    let savedContent = '';

    async function loadFiles() {
      try {
        const res = await fetch(API + '/files');
        const data = await res.json();
        renderFileTree(data.files);
      } catch (e) {
        setStatus('Error loading files: ' + e.message);
      }
    }

    function renderFileTree(files, depth = 0) {
      const container = document.getElementById('fileTree');
      if (depth === 0) container.innerHTML = '';

      files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.style.paddingLeft = (16 + depth * 16) + 'px';
        div.innerHTML = '<span class="file-icon">' + (file.isDirectory ? '📁' : '📄') + '</span>' + file.name;

        if (!file.isDirectory) {
          div.onclick = () => openFile(file.relativePath);
        }

        container.appendChild(div);

        if (file.isDirectory && file.children) {
          renderFileTree(file.children, depth + 1);
        }
      });
    }

    async function openFile(path) {
      if (isDirty && !confirm('You have unsaved changes. Discard?')) return;

      try {
        setStatus('Loading ' + path + '...');
        const res = await fetch(API + '/document?path=' + encodeURIComponent(path));
        const data = await res.json();

        currentFile = path;
        savedContent = data.content;
        document.getElementById('editor').value = data.content;
        document.getElementById('editor').disabled = false;
        document.getElementById('currentPath').textContent = path;
        setDirty(false);
        setStatus('Loaded ' + path);

        // Update selected state
        document.querySelectorAll('.file-item').forEach(el => {
          el.classList.remove('selected');
          if (el.textContent.includes(path.split('/').pop())) {
            el.classList.add('selected');
          }
        });
      } catch (e) {
        setStatus('Error: ' + e.message);
      }
    }

    async function saveDocument() {
      if (!currentFile || !isDirty) return;

      try {
        setStatus('Saving...');
        const content = document.getElementById('editor').value;
        await fetch(API + '/document', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: currentFile, content })
        });
        savedContent = content;
        setDirty(false);
        setStatus('Saved ' + currentFile);
      } catch (e) {
        setStatus('Error saving: ' + e.message);
      }
    }

    async function newDocument() {
      const name = prompt('Enter file name (e.g., hello.mdx):');
      if (!name) return;

      const path = name.endsWith('.mdx') || name.endsWith('.md') ? name : name + '.mdx';

      try {
        setStatus('Creating ' + path + '...');
        await fetch(API + '/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        });
        await loadFiles();
        await openFile(path);
      } catch (e) {
        setStatus('Error: ' + e.message);
      }
    }

    function setDirty(dirty) {
      isDirty = dirty;
      document.getElementById('dirtyIndicator').style.display = dirty ? 'inline' : 'none';
      document.getElementById('saveBtn').disabled = !dirty;
    }

    function setStatus(msg) {
      document.getElementById('status').textContent = msg;
    }

    // Track changes
    document.getElementById('editor').addEventListener('input', () => {
      const content = document.getElementById('editor').value;
      setDirty(content !== savedContent);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }
    });

    // Initial load
    loadFiles();
  </script>
</body>
</html>`
}

/**
 * Start the studio server with defaults
 */
export async function startStudio(config: Partial<ServerConfig> = {}): Promise<StudioServer> {
  const server = createServer({
    contentDir: config.contentDir || process.cwd(),
    port: config.port || 4321,
    ...config,
  })

  await server.start()
  return server
}
