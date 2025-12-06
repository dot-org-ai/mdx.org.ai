import React, { useCallback, useState } from 'react'
import type { CellProps, Language, CellType } from '../types'
import { CodeEditor } from './CodeEditor'
import { Output } from '../outputs'

const languageOptions: Language[] = [
  'javascript',
  'typescript',
  'python',
  'sql',
  'markdown',
  'json',
]

export function Cell({
  cell,
  index,
  isActive = false,
  isReadOnly = false,
  onSourceChange,
  onExecute,
  onDelete,
  onMoveUp,
  onMoveDown,
  onTypeChange,
  onLanguageChange,
}: CellProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleExecute = useCallback(async () => {
    if (cell.type === 'code' && onExecute) {
      await onExecute()
    }
  }, [cell.type, onExecute])

  const statusColors = {
    idle: 'var(--notebook-status-idle, #9ca3af)',
    pending: 'var(--notebook-status-pending, #fbbf24)',
    running: 'var(--notebook-status-running, #3b82f6)',
    success: 'var(--notebook-status-success, #10b981)',
    error: 'var(--notebook-status-error, #ef4444)',
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.5rem 0',
        borderLeft: isActive
          ? '3px solid var(--notebook-active-border, #3b82f6)'
          : '3px solid transparent',
        backgroundColor: isActive
          ? 'var(--notebook-active-bg, #f0f9ff)'
          : 'transparent',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gutter */}
      <div
        style={{
          width: '4rem',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          paddingRight: '0.5rem',
          gap: '0.25rem',
        }}
      >
        {/* Execution count / status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: statusColors[cell.status],
            fontSize: '0.75rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
          }}
        >
          {cell.status === 'running' && (
            <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>
          )}
          {cell.type === 'code' && (
            <span>
              [{cell.executionCount ?? ' '}]
            </span>
          )}
        </div>

        {/* Actions */}
        {(isHovered || isActive) && !isReadOnly && (
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              opacity: 0.7,
            }}
          >
            <button
              onClick={onMoveUp}
              title="Move up"
              style={{
                background: 'none',
                border: 'none',
                padding: '0.125rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--notebook-muted, #6b7280)',
              }}
            >
              ↑
            </button>
            <button
              onClick={onMoveDown}
              title="Move down"
              style={{
                background: 'none',
                border: 'none',
                padding: '0.125rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--notebook-muted, #6b7280)',
              }}
            >
              ↓
            </button>
            <button
              onClick={onDelete}
              title="Delete cell"
              style={{
                background: 'none',
                border: 'none',
                padding: '0.125rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: 'var(--notebook-muted, #6b7280)',
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Cell content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Cell toolbar */}
        {(isHovered || isActive) && !isReadOnly && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.25rem',
              fontSize: '0.75rem',
            }}
          >
            <select
              value={cell.type}
              onChange={(e) => onTypeChange?.(e.target.value as CellType)}
              style={{
                padding: '0.125rem 0.25rem',
                border: '1px solid var(--notebook-border, #e5e7eb)',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                backgroundColor: 'var(--notebook-bg, #ffffff)',
                color: 'var(--notebook-text, #374151)',
              }}
            >
              <option value="code">Code</option>
              <option value="markdown">Markdown</option>
            </select>

            {cell.type === 'code' && (
              <select
                value={cell.language}
                onChange={(e) => onLanguageChange?.(e.target.value as Language)}
                style={{
                  padding: '0.125rem 0.25rem',
                  border: '1px solid var(--notebook-border, #e5e7eb)',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--notebook-bg, #ffffff)',
                  color: 'var(--notebook-text, #374151)',
                }}
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            )}

            {cell.type === 'code' && (
              <button
                onClick={handleExecute}
                disabled={cell.status === 'running'}
                style={{
                  padding: '0.125rem 0.5rem',
                  border: '1px solid var(--notebook-border, #e5e7eb)',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--notebook-run-bg, #10b981)',
                  color: 'white',
                  cursor: cell.status === 'running' ? 'not-allowed' : 'pointer',
                  opacity: cell.status === 'running' ? 0.5 : 1,
                }}
              >
                ▶ Run
              </button>
            )}
          </div>
        )}

        {/* Editor */}
        {cell.type === 'code' ? (
          <CodeEditor
            value={cell.source}
            language={cell.language}
            onChange={onSourceChange}
            onExecute={handleExecute}
            isReadOnly={isReadOnly}
            theme="light"
          />
        ) : (
          <textarea
            value={cell.source}
            onChange={(e) => onSourceChange?.(e.target.value)}
            placeholder="Enter markdown..."
            readOnly={isReadOnly}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '0.5rem',
              border: '1px solid var(--notebook-border, #e5e7eb)',
              borderRadius: '0.375rem',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              resize: 'vertical',
              backgroundColor: 'var(--notebook-bg, #ffffff)',
              color: 'var(--notebook-text, #374151)',
            }}
          />
        )}

        {/* Outputs */}
        {cell.outputs.length > 0 && (
          <div
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            {cell.outputs.map((output, i) => (
              <Output key={i} output={output} />
            ))}
          </div>
        )}

        {/* Execution time */}
        {cell.outputs.length > 0 && cell.outputs[0].executionTime && (
          <div
            style={{
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              color: 'var(--notebook-muted, #6b7280)',
            }}
          >
            Executed in {(cell.outputs[0].executionTime / 1000).toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  )
}
