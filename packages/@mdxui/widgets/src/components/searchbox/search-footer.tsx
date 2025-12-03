'use client'

import { Kbd } from '@/components/ui/kbd'

export function SearchFooter() {
  return (
    <div className="hidden sm:flex items-center justify-center gap-4 border-t bg-muted/50 px-4 py-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-flex gap-0.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </span>
        <span>Navigate</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Kbd>↵</Kbd>
        <span>Open</span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Kbd>esc</Kbd>
        <span>Close</span>
      </span>
    </div>
  )
}
