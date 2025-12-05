'use client'

import * as React from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

/** Layout preset options */
export type EditorLayout = 'minimal' | 'editor' | 'split' | 'full'

/** Panel visibility configuration */
export interface EditorPanels {
  /** Show file navigation sidebar */
  sidebar?: boolean
  /** Show AI chat panel */
  chat?: boolean
  /** Show live preview pane */
  preview?: boolean
  /** Show AST/data view */
  ast?: boolean
  /** Show toolbar */
  toolbar?: boolean
}

export interface EditorProps {
  /** Initial content value */
  value?: string
  /** Default content if value is not provided */
  defaultValue?: string
  /** Language mode (default: mdx) */
  language?: string
  /** Theme (default: vs-dark) */
  theme?: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light'
  /** Height (default: 400px) */
  height?: string | number
  /** Width (default: 100%) */
  width?: string | number
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Called when content changes */
  onChange?: (value: string | undefined) => void
  /** Called when the editor is mounted */
  onMount?: (editor: editor.IStandaloneCodeEditor) => void
  /** Editor options override */
  options?: editor.IStandaloneEditorConstructionOptions

  // Layout options
  /** Layout preset: 'minimal' (editor only), 'editor' (with toolbar), 'split' (with preview), 'full' (all panels) */
  layout?: EditorLayout
  /** Fine-grained panel visibility (overrides layout preset) */
  panels?: EditorPanels
  /** Sidebar width in pixels (default: 250) */
  sidebarWidth?: number
  /** Chat panel width in pixels (default: 320) */
  chatWidth?: number
  /** Preview/AST panel position */
  secondaryPosition?: 'right' | 'bottom'

  // Sidebar options
  /** File tree items for sidebar */
  files?: FileTreeItem[]
  /** Called when a file is selected */
  onFileSelect?: (path: string) => void
  /** Currently selected file path */
  selectedFile?: string

  // Chat options
  /** Chat messages */
  messages?: ChatMessage[]
  /** Called when user sends a message */
  onSendMessage?: (message: string) => void
  /** Whether chat is loading */
  chatLoading?: boolean

  // Preview options
  /** Custom preview renderer */
  renderPreview?: (content: string) => React.ReactNode
  /** Parsed frontmatter data */
  data?: Record<string, unknown>

  /** CSS class name */
  className?: string
}

export interface FileTreeItem {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeItem[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

const defaultMdxContent = `---
title: Hello World
description: A sample MDX document
---

# Welcome to MDX

This is a sample **MDX** document with:

- Frontmatter metadata
- Markdown content
- JSX components

<Card title="Example">
  This is a card component rendered in MDX.
</Card>

\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\`
`

/** Get panel visibility based on layout preset */
function getPanelsFromLayout(layout: EditorLayout): EditorPanels {
  switch (layout) {
    case 'minimal':
      return { sidebar: false, chat: false, preview: false, ast: false, toolbar: false }
    case 'editor':
      return { sidebar: false, chat: false, preview: false, ast: false, toolbar: true }
    case 'split':
      return { sidebar: false, chat: false, preview: true, ast: false, toolbar: true }
    case 'full':
      return { sidebar: true, chat: true, preview: true, ast: false, toolbar: true }
    default:
      return { sidebar: false, chat: false, preview: false, ast: false, toolbar: true }
  }
}

/** Simple sidebar component */
function Sidebar({
  files,
  selectedFile,
  onFileSelect,
  width,
}: {
  files?: FileTreeItem[]
  selectedFile?: string
  onFileSelect?: (path: string) => void
  width: number
}) {
  const renderItem = (item: FileTreeItem, depth = 0) => (
    <div key={item.id}>
      <button
        onClick={() => item.type === 'file' && onFileSelect?.(item.path)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '6px 12px',
          paddingLeft: 12 + depth * 16,
          background: selectedFile === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: item.type === 'file' ? 'pointer' : 'default',
          fontSize: 13,
        }}
      >
        {item.type === 'folder' ? '📁 ' : '📄 '}{item.name}
      </button>
      {item.children?.map(child => renderItem(child, depth + 1))}
    </div>
  )

  return (
    <div
      style={{
        width,
        minWidth: width,
        height: '100%',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        overflow: 'auto',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Files
      </div>
      {files?.map(item => renderItem(item))}
      {(!files || files.length === 0) && (
        <div style={{ padding: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          No files
        </div>
      )}
    </div>
  )
}

/** Simple chat component */
function ChatPanel({
  messages,
  onSendMessage,
  loading,
  width,
}: {
  messages?: ChatMessage[]
  onSendMessage?: (message: string) => void
  loading?: boolean
  width: number
}) {
  const [input, setInput] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <div
      style={{
        width,
        minWidth: width,
        height: '100%',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        AI Chat
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {messages?.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: 12,
              padding: 8,
              borderRadius: 6,
              background: msg.role === 'user' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11, textTransform: 'uppercase' }}>
              {msg.role}
            </div>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            Thinking...
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask AI..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.3)',
            color: 'inherit',
            fontSize: 13,
          }}
        />
      </form>
    </div>
  )
}

/** Simple toolbar component */
function Toolbar({ language }: { language: string }) {
  return (
    <div
      style={{
        height: 40,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 12,
        background: 'rgba(0,0,0,0.2)',
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 600 }}>MDX Editor</span>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{language.toUpperCase()}</span>
    </div>
  )
}

/** Preview panel component */
function PreviewPanel({
  content,
  data,
  renderPreview,
  position,
}: {
  content: string
  data?: Record<string, unknown>
  renderPreview?: (content: string) => React.ReactNode
  position: 'right' | 'bottom'
}) {
  const isHorizontal = position === 'right'

  return (
    <div
      style={{
        [isHorizontal ? 'width' : 'height']: '50%',
        [isHorizontal ? 'borderLeft' : 'borderTop']: '1px solid rgba(255,255,255,0.1)',
        overflow: 'auto',
        background: 'rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Preview
      </div>
      <div style={{ padding: 16 }}>
        {renderPreview ? (
          renderPreview(content)
        ) : (
          <div style={{ fontFamily: 'system-ui', fontSize: 14, lineHeight: 1.6 }}>
            {data && Object.keys(data).length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Frontmatter</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
            <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.8)' }}>
              {content.replace(/^---[\s\S]*?---\n?/, '')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** AST panel component */
function ASTPanel({
  content,
  position,
}: {
  content: string
  position: 'right' | 'bottom'
}) {
  const isHorizontal = position === 'right'

  // Simple frontmatter extraction
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const frontmatter = frontmatterMatch ? frontmatterMatch[1] : null

  return (
    <div
      style={{
        [isHorizontal ? 'width' : 'height']: '50%',
        [isHorizontal ? 'borderLeft' : 'borderTop']: '1px solid rgba(255,255,255,0.1)',
        overflow: 'auto',
        background: 'rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Data / AST
      </div>
      <div style={{ padding: 16 }}>
        <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.7)' }}>
          {frontmatter ? `Frontmatter:\n${frontmatter}\n\nContent length: ${content.length} chars` : `Content length: ${content.length} chars`}
        </pre>
      </div>
    </div>
  )
}

/**
 * Configurable MDX Editor component with optional sidebar, chat, preview, and AST panels
 */
export function Editor({
  value,
  defaultValue = defaultMdxContent,
  language = 'mdx',
  theme = 'vs-dark',
  height = 400,
  width = '100%',
  readOnly = false,
  onChange,
  onMount,
  options,
  layout = 'editor',
  panels: panelOverrides,
  sidebarWidth = 250,
  chatWidth = 320,
  secondaryPosition = 'right',
  files,
  onFileSelect,
  selectedFile,
  messages,
  onSendMessage,
  chatLoading,
  renderPreview,
  data,
  className,
}: EditorProps) {
  const [content, setContent] = React.useState(value ?? defaultValue)

  // Merge layout preset with panel overrides
  const layoutPanels = getPanelsFromLayout(layout)
  const panels: EditorPanels = { ...layoutPanels, ...panelOverrides }

  const handleChange = React.useCallback((newValue: string | undefined) => {
    setContent(newValue ?? '')
    onChange?.(newValue)
  }, [onChange])

  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    readOnly,
    ...options,
  }

  const showSecondaryPanel = panels.preview || panels.ast
  const isHorizontalSecondary = secondaryPosition === 'right'

  return (
    <div
      className={className}
      style={{
        height,
        width,
        display: 'flex',
        flexDirection: 'column',
        background: theme === 'vs' || theme === 'hc-light' ? '#fff' : '#1e1e1e',
        color: theme === 'vs' || theme === 'hc-light' ? '#000' : '#fff',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {panels.toolbar && <Toolbar language={language} />}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {panels.sidebar && (
          <Sidebar
            files={files}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            width={sidebarWidth}
          />
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isHorizontalSecondary ? 'row' : 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <MonacoEditor
              height="100%"
              width="100%"
              language={language}
              theme={theme}
              value={value}
              defaultValue={defaultValue}
              options={editorOptions}
              onChange={handleChange}
              onMount={onMount}
            />
          </div>

          {panels.preview && (
            <PreviewPanel
              content={content}
              data={data}
              renderPreview={renderPreview}
              position={secondaryPosition}
            />
          )}

          {panels.ast && !panels.preview && (
            <ASTPanel content={content} position={secondaryPosition} />
          )}
        </div>

        {panels.chat && (
          <ChatPanel
            messages={messages}
            onSendMessage={onSendMessage}
            loading={chatLoading}
            width={chatWidth}
          />
        )}
      </div>
    </div>
  )
}

export default Editor
