import React, { createContext, useContext, useCallback, useMemo } from 'react'
import type {
  NotebookProps,
  NotebookDocument,
  NotebookCell,
  NotebookContextValue,
  CellType,
  Language,
  ExecutionMode,
  Executor,
  ExecutionContext,
} from '../types'
import { Cell } from './Cell'
import { useNotebook } from '../hooks/useNotebook'

const NotebookContext = createContext<NotebookContextValue | null>(null)

export function useNotebookContext() {
  const context = useContext(NotebookContext)
  if (!context) {
    throw new Error('useNotebookContext must be used within a Notebook')
  }
  return context
}

export function Notebook({
  document,
  executionMode = 'browser',
  rpcEndpoint,
  isReadOnly = false,
  showToolbar = true,
  showLineNumbers = true,
  theme = 'auto',
  className,
  onDocumentChange,
  onCellExecute,
  renderOutput,
}: NotebookProps) {
  const notebook = useNotebook({
    initialDocument: document,
    executionMode,
    rpcEndpoint,
    onDocumentChange,
    onCellExecute,
  })

  return (
    <NotebookContext.Provider value={notebook}>
      <div
        className={className}
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: 'var(--notebook-bg, #ffffff)',
          color: 'var(--notebook-text, #1f2937)',
          minHeight: '100%',
        }}
        data-theme={theme}
      >
        {/* Toolbar */}
        {showToolbar && !isReadOnly && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--notebook-border, #e5e7eb)',
              backgroundColor: 'var(--notebook-toolbar-bg, #f9fafb)',
            }}
          >
            <button
              onClick={() => notebook.addCell('code')}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid var(--notebook-border, #e5e7eb)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'var(--notebook-bg, #ffffff)',
                color: 'var(--notebook-text, #374151)',
                cursor: 'pointer',
              }}
            >
              + Code
            </button>
            <button
              onClick={() => notebook.addCell('markdown')}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid var(--notebook-border, #e5e7eb)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'var(--notebook-bg, #ffffff)',
                color: 'var(--notebook-text, #374151)',
                cursor: 'pointer',
              }}
            >
              + Markdown
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={notebook.executeAll}
              disabled={notebook.isRunning}
              style={{
                padding: '0.375rem 0.75rem',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'var(--notebook-run-bg, #10b981)',
                color: 'white',
                cursor: notebook.isRunning ? 'not-allowed' : 'pointer',
                opacity: notebook.isRunning ? 0.5 : 1,
              }}
            >
              ▶▶ Run All
            </button>

            {notebook.isRunning && (
              <button
                onClick={notebook.interrupt}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--notebook-interrupt-bg, #ef4444)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ⬛ Interrupt
              </button>
            )}

            <button
              onClick={notebook.clearOutputs}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid var(--notebook-border, #e5e7eb)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'var(--notebook-bg, #ffffff)',
                color: 'var(--notebook-text, #374151)',
                cursor: 'pointer',
              }}
            >
              Clear Outputs
            </button>

            <select
              value={notebook.executionMode}
              onChange={(e) => {
                // This would require updating the execution mode in the hook
              }}
              style={{
                padding: '0.375rem 0.5rem',
                border: '1px solid var(--notebook-border, #e5e7eb)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'var(--notebook-bg, #ffffff)',
                color: 'var(--notebook-text, #374151)',
              }}
            >
              <option value="browser">Browser</option>
              <option value="rpc">RPC</option>
            </select>
          </div>
        )}

        {/* Cells */}
        <div style={{ padding: '0.5rem' }}>
          {notebook.document.cells.map((cell, index) => (
            <Cell
              key={cell.id}
              cell={cell}
              index={index}
              isActive={notebook.activeCell === cell.id}
              isReadOnly={isReadOnly}
              onSourceChange={(source) =>
                notebook.updateCell(cell.id, { source })
              }
              onExecute={() => notebook.executeCell(cell.id)}
              onDelete={() => notebook.deleteCell(cell.id)}
              onMoveUp={() => notebook.moveCell(cell.id, 'up')}
              onMoveDown={() => notebook.moveCell(cell.id, 'down')}
              onTypeChange={(type) => notebook.updateCell(cell.id, { type })}
              onLanguageChange={(language) =>
                notebook.updateCell(cell.id, { language })
              }
            />
          ))}

          {/* Add cell placeholder */}
          {notebook.document.cells.length === 0 && !isReadOnly && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--notebook-muted, #6b7280)',
              }}
            >
              <p>No cells yet. Add a code or markdown cell to get started.</p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem',
                }}
              >
                <button
                  onClick={() => notebook.addCell('code')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--notebook-border, #e5e7eb)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--notebook-bg, #ffffff)',
                    color: 'var(--notebook-text, #374151)',
                    cursor: 'pointer',
                  }}
                >
                  + Code Cell
                </button>
                <button
                  onClick={() => notebook.addCell('markdown')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--notebook-border, #e5e7eb)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--notebook-bg, #ffffff)',
                    color: 'var(--notebook-text, #374151)',
                    cursor: 'pointer',
                  }}
                >
                  + Markdown Cell
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </NotebookContext.Provider>
  )
}

/**
 * Create an empty notebook document
 */
export function createNotebookDocument(options?: {
  id?: string
  title?: string
  language?: Language
  executionMode?: ExecutionMode
}): NotebookDocument {
  return {
    id: options?.id || generateId(),
    title: options?.title,
    cells: [],
    metadata: {
      language: options?.language || 'javascript',
      executionMode: options?.executionMode || 'browser',
    },
  }
}

/**
 * Create a new cell
 */
export function createCell(
  type: CellType,
  options?: {
    id?: string
    source?: string
    language?: Language
  }
): NotebookCell {
  return {
    id: options?.id || generateId(),
    type,
    source: options?.source || '',
    language: options?.language || 'javascript',
    outputs: [],
    status: 'idle',
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}
