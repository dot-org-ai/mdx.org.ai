import React from 'react'
import type { ErrorOutput, OutputRendererProps } from '../types'

export interface ErrorOutputProps extends OutputRendererProps {
  output: ErrorOutput
}

export function ErrorOutputRenderer({ output, className }: ErrorOutputProps) {
  const { name, message, stack } = output.data

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        backgroundColor: 'var(--notebook-error-bg, #fef2f2)',
        borderRadius: '0.25rem',
        border: '1px solid var(--notebook-error-border, #fecaca)',
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: 'var(--notebook-error-name, #dc2626)',
          marginBottom: '0.25rem',
        }}
      >
        {name}: {message}
      </div>
      {stack && (
        <pre
          style={{
            margin: 0,
            marginTop: '0.5rem',
            padding: '0.5rem',
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: 'var(--notebook-error-stack, #9b1c1c)',
            backgroundColor: 'var(--notebook-error-stack-bg, #fee2e2)',
            borderRadius: '0.25rem',
            opacity: 0.9,
          }}
        >
          {stack}
        </pre>
      )}
    </div>
  )
}
