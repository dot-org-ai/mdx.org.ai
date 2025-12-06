import React from 'react'
import type { TextOutput, OutputRendererProps } from '../types'

export interface TextOutputProps extends OutputRendererProps {
  output: TextOutput
}

export function TextOutputRenderer({ output, className }: TextOutputProps) {
  const data = output.data as string

  return (
    <pre
      className={className}
      style={{
        margin: 0,
        padding: '0.5rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--notebook-text, #1f2937)',
        backgroundColor: 'var(--notebook-output-bg, #f9fafb)',
        borderRadius: '0.25rem',
      }}
    >
      {data}
    </pre>
  )
}
