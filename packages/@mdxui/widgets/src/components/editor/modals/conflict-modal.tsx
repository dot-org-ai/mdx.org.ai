'use client'

import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ConflictModalProps } from '@/lib/types'

export function ConflictModal({
  conflict,
  onKeepMine,
  onUseServer,
  onOpenDiff,
  onClose,
}: ConflictModalProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-chart-4" />
            Content has changed
          </DialogTitle>
          <DialogDescription>
            Someone else edited this page while you were working.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-lg border border-border p-3 sm:p-4">
            <h4 className="mb-2 text-sm font-medium">Your changes</h4>
            <pre className="max-h-24 overflow-auto text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 sm:max-h-48">
              {conflict.localContent.slice(0, 300)}
              {conflict.localContent.length > 300 && '...'}
            </pre>
          </div>
          <div className="rounded-lg border border-border p-3 sm:p-4">
            <h4 className="mb-2 text-sm font-medium">Server version</h4>
            <pre className="max-h-24 overflow-auto text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 sm:max-h-48">
              {conflict.serverContent.slice(0, 300)}
              {conflict.serverContent.length > 300 && '...'}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onUseServer}>
            Use Server
          </Button>
          {onOpenDiff && (
            <Button variant="outline" onClick={onOpenDiff}>
              Open Diff
            </Button>
          )}
          <Button onClick={onKeepMine}>Keep Mine</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
