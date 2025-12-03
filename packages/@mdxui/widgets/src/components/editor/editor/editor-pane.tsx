'use client'

import { useRef, useCallback, useState } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Loader2 } from 'lucide-react'
import { EditorHeader } from './editor-header'
import { StatusBar } from './status-bar'
import { configureMDX, defineEditorTheme, editorOptions } from '@/lib/monaco-config'
import type { EditorPaneProps, CursorPosition } from '@/lib/types'

interface ExtendedEditorPaneProps extends EditorPaneProps {
  hideHeader?: boolean
}

export function EditorPane({
  content,
  onChange,
  path,
  isSaving,
  isDirty,
  onSave,
  onClose,
  onCursorChange,
  hideHeader,
}: ExtendedEditorPaneProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    lineNumber: 1,
    column: 1,
  })

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Configure MDX language
    configureMDX(monaco)

    // Define and set custom theme
    defineEditorTheme(monaco)
    monaco.editor.setTheme('editor-dark')

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      const position = {
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      }
      setCursorPosition(position)
      onCursorChange?.(position)
    })

    // Focus the editor
    editor.focus()
  }

  const handleChange: OnChange = (value) => {
    onChange(value ?? '')
  }

  const handleFormat = useCallback(() => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run()
  }, [])

  // Method to jump to a specific line (used by preview click-to-jump)
  const jumpToLine = useCallback((line: number) => {
    const editor = editorRef.current
    if (editor) {
      editor.revealLineInCenter(line)
      editor.setPosition({ lineNumber: line, column: 1 })
      editor.focus()
    }
  }, [])

  // Expose jumpToLine via ref if needed
  // This could be done through a more sophisticated pattern like useImperativeHandle

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      {!hideHeader && (
        <EditorHeader
          path={path}
          isSaving={isSaving}
          isDirty={isDirty}
          onFormat={handleFormat}
          onSave={onSave}
          onClose={onClose}
        />
      )}

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language="mdx"
          value={content}
          onChange={handleChange}
          onMount={handleMount}
          options={editorOptions}
          theme="editor-dark"
          loading={
            <div className="flex h-full items-center justify-center bg-background">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        line={cursorPosition.lineNumber}
        column={cursorPosition.column}
        isDirty={isDirty}
      />
    </div>
  )
}
