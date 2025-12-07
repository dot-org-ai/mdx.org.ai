export { TextOutputRenderer } from './Text'
export { ErrorOutputRenderer } from './Error'
export { TableOutputRenderer } from './Table'
export { JsonOutputRenderer } from './Json'

import React from 'react'
import type { CellOutput, OutputRendererProps } from '../types'
import { TextOutputRenderer } from './Text'
import { ErrorOutputRenderer } from './Error'
import { TableOutputRenderer } from './Table'
import { JsonOutputRenderer } from './Json'

export interface OutputProps {
  output: CellOutput
  className?: string
}

/**
 * Renders a cell output based on its type
 */
export function Output({ output, className }: OutputProps) {
  switch (output.type) {
    case 'text':
    case 'stream':
      return <TextOutputRenderer output={output as any} className={className} />

    case 'error':
      return <ErrorOutputRenderer output={output as any} className={className} />

    case 'table':
      return <TableOutputRenderer output={output as any} className={className} />

    case 'json':
      return <JsonOutputRenderer output={output as any} className={className} />

    case 'html':
      return (
        <div
          className={className}
          dangerouslySetInnerHTML={{ __html: output.data as string }}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--notebook-output-bg, #f9fafb)',
            borderRadius: '0.25rem',
          }}
        />
      )

    case 'image':
      return (
        <div className={className} style={{ padding: '0.5rem' }}>
          <img
            src={output.data as string}
            alt="Output"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      )

    case 'chart':
      // TODO: Implement chart rendering with a charting library
      return (
        <div className={className} style={{ padding: '0.5rem' }}>
          <pre>{JSON.stringify(output.data, null, 2)}</pre>
        </div>
      )

    default:
      return (
        <div className={className} style={{ padding: '0.5rem' }}>
          <pre>{JSON.stringify(output.data, null, 2)}</pre>
        </div>
      )
  }
}
