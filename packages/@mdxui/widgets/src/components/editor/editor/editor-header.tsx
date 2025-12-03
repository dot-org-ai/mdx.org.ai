'use client'

import { AlignLeft, Save, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import type { EditorHeaderProps } from '@/lib/types'

export function EditorHeader({
  path,
  isSaving,
  isDirty,
  onFormat,
  onSave,
  onClose,
}: EditorHeaderProps) {
  return (
    <TooltipProvider>
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <span className="font-mono text-sm text-muted-foreground">
          {path || 'untitled.mdx'}
        </span>

        <div className="flex items-center gap-1">
          {onFormat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onFormat}
                  aria-label="Format document"
                >
                  <AlignLeft className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Format (⌘⇧F)</p>
              </TooltipContent>
            </Tooltip>
          )}

          {onSave && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving || !isDirty}
                  className="gap-2"
                  aria-label={
                    isSaving
                      ? 'Saving...'
                      : isDirty
                        ? 'Save changes'
                        : 'No changes to save'
                  }
                >
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save (⌘S)</p>
              </TooltipContent>
            </Tooltip>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close editor"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
