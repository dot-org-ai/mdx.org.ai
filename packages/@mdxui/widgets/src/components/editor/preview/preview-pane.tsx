'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { PreviewHeader } from './preview-header'
import { PreviewError } from './preview-error'
import { cn } from '@/lib/utils'
import type { Viewport, CompileError } from '@/lib/types'

interface PreviewPaneProps {
  content: string
  onJumpToLine?: (line: number) => void
}

const viewportWidths: Record<Viewport, number | string> = {
  mobile: 375,
  tablet: 768,
  desktop: '100%',
}

export function PreviewPane({ content, onJumpToLine }: PreviewPaneProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [zoom, setZoom] = useState(100)
  const [compiledHtml, setCompiledHtml] = useState<string>('')
  const [isCompiling, setIsCompiling] = useState(false)
  const [compileError, setCompileError] = useState<CompileError | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // For now, we'll just render the raw content in a simple HTML wrapper
  // Real MDX compilation would be done server-side or with @mdx-js/mdx
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCompiling(true)
      setCompileError(null)

      try {
        // Simple markdown-like rendering for demo purposes
        // In production, this would use actual MDX compilation
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      padding: 2rem;
      color: #fafafa;
      background: #171717;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }
    p { margin-bottom: 1em; }
    code {
      background: #262626;
      padding: 0.2em 0.4em;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre {
      background: #262626;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 1em;
    }
    pre code { background: none; padding: 0; }
    a { color: #93c5fd; }
    ul, ol { margin-bottom: 1em; padding-left: 1.5em; }
    li { margin-bottom: 0.25em; }
    blockquote {
      border-left: 3px solid #3b82f6;
      padding-left: 1em;
      margin-left: 0;
      margin-bottom: 1em;
      color: #a1a1aa;
    }
    hr { border: none; border-top: 1px solid #3f3f46; margin: 2em 0; }
    [data-source-line] { cursor: pointer; }
    [data-source-line]:hover { outline: 2px solid rgba(59, 130, 246, 0.3); outline-offset: 2px; border-radius: 4px; }
  </style>
</head>
<body>
  <div id="content">${escapeHtml(content)}</div>
  <script>
    // Handle click-to-jump
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-source-line]');
      if (el) {
        const line = parseInt(el.dataset.sourceLine, 10);
        window.parent.postMessage({ type: 'jump-to-line', line }, '*');
      }
    });
  </script>
</body>
</html>`
        setCompiledHtml(html)
      } catch (err) {
        setCompileError({
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      } finally {
        setIsCompiling(false)
      }
    }, 150) // 150ms debounce

    return () => clearTimeout(timer)
  }, [content])

  // Listen for jump-to-line messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === 'jump-to-line' && onJumpToLine) {
        onJumpToLine(e.data.line)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onJumpToLine])

  const width = viewport === 'desktop' ? '100%' : viewportWidths[viewport]

  return (
    <div className="flex h-full flex-col">
      <PreviewHeader
        viewport={viewport}
        onViewportChange={setViewport}
        zoom={zoom}
        onZoomChange={setZoom}
      />

      <div className="relative flex-1 overflow-auto bg-muted/30 p-4">
        {/* Compilation indicator */}
        {isCompiling && (
          <div className="absolute right-4 top-4 z-10">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {compileError ? (
          <PreviewError error={compileError} onJumpToLine={onJumpToLine} />
        ) : (
          /* Preview iframe */
          <div
            className={cn(
              'mx-auto rounded-lg border border-border bg-background shadow-sm transition-all',
              viewport !== 'desktop' && 'max-w-full'
            )}
            style={{
              width: typeof width === 'number' ? `${width}px` : width,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              minHeight: zoom < 100 ? `${100 / (zoom / 100)}%` : undefined,
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={compiledHtml}
              className="h-full min-h-[400px] w-full"
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Simple HTML escape for demo
function escapeHtml(text: string): string {
  // For demo, we'll render the raw MDX content
  // In production, you'd properly compile MDX
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>')
}
