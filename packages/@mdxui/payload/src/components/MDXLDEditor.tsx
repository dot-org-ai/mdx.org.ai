'use client'
/**
 * MDX-LD Editor Component
 *
 * A rich editor for editing MDX-LD documents with:
 * - YAML frontmatter editing with JSON-LD support
 * - Markdown/MDX content editing
 * - Live preview and validation
 * - Split view mode
 *
 * @example
 * ```tsx
 * import { MDXLDEditor } from '@mdxui/payload'
 *
 * function MyEditor() {
 *   const [value, setValue] = useState('')
 *
 *   return (
 *     <MDXLDEditor
 *       value={value}
 *       onChange={setValue}
 *       mode="split"
 *     />
 *   )
 * }
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { markdown } from '@codemirror/lang-markdown'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { parse, stringify } from 'mdxld'
import type {
  MDXLDEditorProps,
  EditorMode,
  ValidationResult,
  ValidationError,
  MDXLDDocument,
} from '../types.js'

/**
 * Validate MDXLD content
 */
function validateMDXLD(content: string): ValidationResult {
  const errors: ValidationError[] = []

  if (!content.trim()) {
    return {
      valid: true,
      errors: [],
      document: { data: {}, content: '' },
    }
  }

  try {
    const doc = parse(content)
    return {
      valid: true,
      errors: [],
      document: doc as MDXLDDocument,
    }
  } catch (err: unknown) {
    const error = err as Error & { mark?: { line?: number; column?: number } }
    const message = error.message || 'Invalid MDXLD content'

    // Try to extract line/column from YAML errors
    const lineMatch = message.match(/line (\d+)/)
    const line = lineMatch?.[1] ? parseInt(lineMatch[1], 10) : error.mark?.line

    errors.push({
      message,
      line,
      column: error.mark?.column,
      type: 'yaml',
    })

    return {
      valid: false,
      errors,
    }
  }
}

/**
 * Extract frontmatter and content from raw MDXLD
 */
function splitContent(raw: string): { frontmatter: string; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (match) {
    return {
      frontmatter: match[1] || '',
      body: match[2] || '',
    }
  }
  // No frontmatter
  return {
    frontmatter: '',
    body: raw,
  }
}

/**
 * Combine frontmatter and body into raw MDXLD
 */
function joinContent(frontmatter: string, body: string): string {
  if (!frontmatter.trim()) {
    return body
  }
  return `---\n${frontmatter}\n---\n${body}`
}

/**
 * MDX-LD Editor Component
 */
export function MDXLDEditor({
  value,
  onChange,
  mode = 'split',
  theme = 'system',
  placeholder = 'Start typing your MDX-LD content...',
  disabled = false,
  minHeight = 300,
  maxHeight,
  lineNumbers = true,
  validate = true,
  className = '',
}: MDXLDEditorProps) {
  const [activeMode, setActiveMode] = useState<EditorMode>(mode)
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [] })

  // Split the content into frontmatter and body
  const { frontmatter, body } = useMemo(() => splitContent(value), [value])

  // Validate on change
  useEffect(() => {
    if (validate) {
      const result = validateMDXLD(value)
      setValidation(result)
    }
  }, [value, validate])

  // Determine CodeMirror theme
  const cmTheme = useMemo(() => {
    if (theme === 'dark') return oneDark
    if (theme === 'light') return undefined
    // System theme - check for dark mode preference
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return oneDark
    }
    return undefined
  }, [theme])

  // Handle frontmatter change
  const handleFrontmatterChange = useCallback(
    (newFrontmatter: string) => {
      onChange(joinContent(newFrontmatter, body))
    },
    [body, onChange]
  )

  // Handle body change
  const handleBodyChange = useCallback(
    (newBody: string) => {
      onChange(joinContent(frontmatter, newBody))
    },
    [frontmatter, onChange]
  )

  // Handle raw change
  const handleRawChange = useCallback(
    (newValue: string) => {
      onChange(newValue)
    },
    [onChange]
  )

  // Get extensions based on mode
  const getExtensions = useCallback(
    (editorType: 'yaml' | 'mdx' | 'raw') => {
      switch (editorType) {
        case 'yaml':
          return [yaml()]
        case 'mdx':
          return [markdown(), javascript({ jsx: true })]
        default:
          return [yaml(), markdown()]
      }
    },
    []
  )

  // Common editor props
  const commonProps = {
    readOnly: disabled,
    basicSetup: {
      lineNumbers,
      foldGutter: true,
      highlightActiveLine: true,
      bracketMatching: true,
      autocompletion: true,
    },
    theme: cmTheme,
  }

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: `${minHeight}px`,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    border: '1px solid var(--theme-elevation-200, #e0e0e0)',
    borderRadius: '4px',
    overflow: 'hidden',
  }

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '8px',
    borderBottom: '1px solid var(--theme-elevation-200, #e0e0e0)',
    backgroundColor: 'var(--theme-elevation-50, #f5f5f5)',
  }

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: isActive ? 'var(--theme-elevation-900, #333)' : 'transparent',
    color: isActive ? '#fff' : 'inherit',
    fontSize: '12px',
    fontWeight: isActive ? 600 : 400,
  })

  const editorContainerStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    overflow: 'auto',
  }

  const splitPaneStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  }

  const paneLabelStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--theme-elevation-500, #666)',
    backgroundColor: 'var(--theme-elevation-100, #f0f0f0)',
    borderBottom: '1px solid var(--theme-elevation-200, #e0e0e0)',
  }

  const errorStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: 'var(--theme-error-50, #fef2f2)',
    color: 'var(--theme-error-700, #b91c1c)',
    fontSize: '12px',
    borderTop: '1px solid var(--theme-error-200, #fecaca)',
  }

  return (
    <div className={`mdxld-editor ${className}`} style={containerStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <button
          type="button"
          style={buttonStyle(activeMode === 'split')}
          onClick={() => setActiveMode('split')}
        >
          Split
        </button>
        <button
          type="button"
          style={buttonStyle(activeMode === 'yaml')}
          onClick={() => setActiveMode('yaml')}
        >
          YAML
        </button>
        <button
          type="button"
          style={buttonStyle(activeMode === 'mdx')}
          onClick={() => setActiveMode('mdx')}
        >
          MDX
        </button>
        <button
          type="button"
          style={buttonStyle(activeMode === 'json')}
          onClick={() => setActiveMode('json')}
        >
          Raw
        </button>

        {/* Validation indicator */}
        {validate && (
          <span
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: validation.valid ? 'var(--theme-success-500, #22c55e)' : 'var(--theme-error-500, #ef4444)',
            }}
          >
            <span style={{ fontSize: '16px' }}>{validation.valid ? '✓' : '✗'}</span>
            {validation.valid ? 'Valid' : 'Invalid'}
          </span>
        )}
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        {activeMode === 'split' && (
          <>
            {/* Frontmatter pane */}
            <div style={{ ...splitPaneStyle, borderRight: '1px solid var(--theme-elevation-200, #e0e0e0)' }}>
              <div style={paneLabelStyle}>Frontmatter (YAML-LD)</div>
              <CodeMirror
                value={frontmatter}
                onChange={handleFrontmatterChange}
                extensions={getExtensions('yaml')}
                placeholder="$type: Article\ntitle: My Article"
                {...commonProps}
              />
            </div>
            {/* Content pane */}
            <div style={splitPaneStyle}>
              <div style={paneLabelStyle}>Content (MDX)</div>
              <CodeMirror
                value={body}
                onChange={handleBodyChange}
                extensions={getExtensions('mdx')}
                placeholder="# Hello World\n\nStart writing your content..."
                {...commonProps}
              />
            </div>
          </>
        )}

        {activeMode === 'yaml' && (
          <div style={splitPaneStyle}>
            <CodeMirror
              value={frontmatter}
              onChange={handleFrontmatterChange}
              extensions={getExtensions('yaml')}
              placeholder="$type: Article\ntitle: My Article"
              {...commonProps}
            />
          </div>
        )}

        {activeMode === 'mdx' && (
          <div style={splitPaneStyle}>
            <CodeMirror
              value={body}
              onChange={handleBodyChange}
              extensions={getExtensions('mdx')}
              placeholder="# Hello World\n\nStart writing your content..."
              {...commonProps}
            />
          </div>
        )}

        {activeMode === 'json' && (
          <div style={splitPaneStyle}>
            <CodeMirror
              value={value}
              onChange={handleRawChange}
              extensions={getExtensions('raw')}
              placeholder={placeholder}
              {...commonProps}
            />
          </div>
        )}
      </div>

      {/* Validation errors */}
      {!validation.valid && validation.errors.length > 0 && (
        <div style={errorStyle}>
          {validation.errors.map((error, i) => (
            <div key={i}>
              {error.line ? `Line ${error.line}: ` : ''}
              {error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MDXLDEditor
