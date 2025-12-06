import React, { useState } from 'react'
import type { JsonOutput, OutputRendererProps } from '../types'

export interface JsonOutputProps extends OutputRendererProps {
  output: JsonOutput
}

export function JsonOutputRenderer({ output, className }: JsonOutputProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const data = output.data

  return (
    <div
      className={className}
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        backgroundColor: 'var(--notebook-output-bg, #f9fafb)',
        borderRadius: '0.25rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: 'var(--notebook-json-header-bg, #f3f4f6)',
          borderBottom: '1px solid var(--notebook-border, #e5e7eb)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.25rem',
            cursor: 'pointer',
            color: 'var(--notebook-muted, #6b7280)',
            fontSize: '0.75rem',
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <span style={{ color: 'var(--notebook-muted, #6b7280)', fontSize: '0.75rem' }}>
          {Array.isArray(data) ? `Array(${data.length})` : 'Object'}
        </span>
      </div>
      {isExpanded && (
        <pre
          style={{
            margin: 0,
            padding: '0.5rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: 'var(--notebook-text, #1f2937)',
          }}
        >
          <JsonTree data={data} depth={0} />
        </pre>
      )}
    </div>
  )
}

interface JsonTreeProps {
  data: unknown
  depth: number
  path?: string
}

function JsonTree({ data, depth }: JsonTreeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2)

  if (data === null) {
    return <span style={{ color: 'var(--notebook-json-null, #9333ea)' }}>null</span>
  }

  if (data === undefined) {
    return <span style={{ color: 'var(--notebook-json-undefined, #9333ea)' }}>undefined</span>
  }

  if (typeof data === 'boolean') {
    return (
      <span style={{ color: 'var(--notebook-json-boolean, #9333ea)' }}>
        {String(data)}
      </span>
    )
  }

  if (typeof data === 'number') {
    return (
      <span style={{ color: 'var(--notebook-json-number, #0284c7)' }}>
        {String(data)}
      </span>
    )
  }

  if (typeof data === 'string') {
    return (
      <span style={{ color: 'var(--notebook-json-string, #059669)' }}>
        "{data}"
      </span>
    )
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span>[]</span>
    }

    if (collapsed) {
      return (
        <span>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--notebook-muted, #6b7280)',
            }}
          >
            [...]
          </button>
          <span style={{ color: 'var(--notebook-muted, #6b7280)', marginLeft: '0.25rem' }}>
            ({data.length} items)
          </span>
        </span>
      )
    }

    return (
      <span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          [
        </button>
        {data.map((item, i) => (
          <div key={i} style={{ paddingLeft: '1rem' }}>
            <JsonTree data={item} depth={depth + 1} />
            {i < data.length - 1 && ','}
          </div>
        ))}
        ]
      </span>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)

    if (entries.length === 0) {
      return <span>{'{}'}</span>
    }

    if (collapsed) {
      return (
        <span>
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--notebook-muted, #6b7280)',
            }}
          >
            {'{...}'}
          </button>
          <span style={{ color: 'var(--notebook-muted, #6b7280)', marginLeft: '0.25rem' }}>
            ({entries.length} keys)
          </span>
        </span>
      )
    }

    return (
      <span>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          {'{'}
        </button>
        {entries.map(([key, value], i) => (
          <div key={key} style={{ paddingLeft: '1rem' }}>
            <span style={{ color: 'var(--notebook-json-key, #dc2626)' }}>"{key}"</span>
            : <JsonTree data={value} depth={depth + 1} />
            {i < entries.length - 1 && ','}
          </div>
        ))}
        {'}'}
      </span>
    )
  }

  return <span>{String(data)}</span>
}
