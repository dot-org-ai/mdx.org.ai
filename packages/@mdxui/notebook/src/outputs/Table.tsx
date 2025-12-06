import React from 'react'
import type { TableOutput, OutputRendererProps } from '../types'

export interface TableOutputProps extends OutputRendererProps {
  output: TableOutput
}

export function TableOutputRenderer({ output, className }: TableOutputProps) {
  const { columns, rows } = output.data

  if (rows.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: '1rem',
          textAlign: 'center',
          color: 'var(--notebook-muted, #6b7280)',
          fontStyle: 'italic',
        }}
      >
        Empty result set
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        overflowX: 'auto',
        borderRadius: '0.25rem',
        border: '1px solid var(--notebook-border, #e5e7eb)',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: 'var(--notebook-table-header-bg, #f3f4f6)',
            }}
          >
            {columns.map((column, i) => (
              <th
                key={i}
                style={{
                  padding: '0.5rem 0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: 'var(--notebook-text, #1f2937)',
                  borderBottom: '1px solid var(--notebook-border, #e5e7eb)',
                  whiteSpace: 'nowrap',
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              style={{
                backgroundColor:
                  rowIndex % 2 === 0
                    ? 'var(--notebook-table-row-even, #ffffff)'
                    : 'var(--notebook-table-row-odd, #f9fafb)',
              }}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--notebook-border, #e5e7eb)',
                    color: 'var(--notebook-text, #374151)',
                  }}
                >
                  {formatCellValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--notebook-muted, #6b7280)',
          backgroundColor: 'var(--notebook-table-footer-bg, #f9fafb)',
          borderTop: '1px solid var(--notebook-border, #e5e7eb)',
        }}
      >
        {rows.length} row{rows.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
