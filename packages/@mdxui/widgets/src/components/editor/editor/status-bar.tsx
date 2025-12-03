'use client'

import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { StatusBarProps } from '@/lib/types'

function getFileType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mdx':
      return 'MDX'
    case 'md':
      return 'Markdown'
    default:
      return 'MDX'
  }
}

export function StatusBar({ path = '', line = 1, column = 1, isDirty, error }: StatusBarProps) {
  const fileType = getFileType(path)

  return (
    <div className="flex h-8 items-center gap-4 border-t border-border bg-card px-4 text-xs text-muted-foreground">
      {error ? (
        <div className="flex items-center gap-2 text-destructive">
          <span className="size-2 rounded-full bg-destructive" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          <span>Ln {line}, Col {column}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{fileType}</span>
          <div className="ml-auto flex items-center gap-2">
            {isDirty && (
              <>
                <span className={cn(
                  'size-2 rounded-full',
                  'bg-chart-4'
                )} />
                <span>Unsaved</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
