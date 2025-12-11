import { useMemo } from 'react'
import { cn } from '../lib/utils'

interface DiffViewerProps {
  diff: string
  className?: string
}

export function DiffViewer({ diff, className }: DiffViewerProps) {
  const lines = useMemo(() => diff.split('\n'), [diff])

  return (
    <div className={cn('diff-viewer', className)}>
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
            Diff
          </span>
        </div>
        <div className="font-mono text-xs overflow-auto max-h-96">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'px-4 py-1',
                line.startsWith('+') && !line.startsWith('+++') && 'bg-green-900/30 text-green-300',
                line.startsWith('-') && !line.startsWith('---') && 'bg-red-900/30 text-red-300',
                line.startsWith('@@') && 'bg-blue-900/30 text-blue-300 font-semibold',
                !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('@@') && 'text-gray-400'
              )}
            >
              {line || ' '}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
