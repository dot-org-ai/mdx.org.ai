'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CompileError } from '@/lib/types'

interface PreviewErrorProps {
  error: CompileError
  onJumpToLine?: (line: number) => void
}

export function PreviewError({ error, onJumpToLine }: PreviewErrorProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <h3 className="font-semibold">MDX Compilation Error</h3>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>

        {error.codeFrame && (
          <pre className="mt-4 overflow-auto rounded bg-card p-3 text-xs font-mono">
            <code>{error.codeFrame}</code>
          </pre>
        )}

        {error.line && onJumpToLine && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onJumpToLine(error.line!)}
          >
            Jump to Line {error.line}
          </Button>
        )}
      </div>
    </div>
  )
}
