import React, { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { keymap } from '@codemirror/view'
import type { CodeEditorProps, Language } from '../types'

const languageExtensions: Record<Language, () => ReturnType<typeof javascript>> = {
  javascript: () => javascript({ jsx: true, typescript: false }),
  typescript: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  sql: () => sql(),
  markdown: () => javascript(), // Use basic for markdown
  json: () => javascript(), // Use basic for JSON
}

export function CodeEditor({
  value,
  language,
  onChange,
  onExecute,
  isReadOnly = false,
  showLineNumbers = true,
  theme = 'light',
  placeholder = 'Enter code...',
  minHeight = 60,
  maxHeight = 400,
  className,
}: CodeEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange?.(val)
    },
    [onChange]
  )

  // Create execution keymap
  const executeKeymap = keymap.of([
    {
      key: 'Shift-Enter',
      run: () => {
        onExecute?.()
        return true
      },
    },
    {
      key: 'Mod-Enter',
      run: () => {
        onExecute?.()
        return true
      },
    },
  ])

  const extensions = [
    languageExtensions[language]?.() || javascript(),
    executeKeymap,
  ]

  return (
    <div
      className={className}
      style={{
        border: '1px solid var(--notebook-border, #e5e7eb)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
        minHeight,
        maxHeight,
      }}
    >
      <CodeMirror
        value={value}
        height="auto"
        minHeight={`${minHeight}px`}
        maxHeight={`${maxHeight}px`}
        extensions={extensions}
        onChange={handleChange}
        editable={!isReadOnly}
        placeholder={placeholder}
        theme={theme === 'dark' ? 'dark' : 'light'}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
        }}
        style={{
          fontSize: '0.875rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        }}
      />
    </div>
  )
}
