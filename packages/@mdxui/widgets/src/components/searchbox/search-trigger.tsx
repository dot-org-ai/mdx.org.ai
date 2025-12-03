'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SearchTriggerProps } from '@/lib/searchbox-types'

export function SearchTrigger({ onClick, className }: SearchTriggerProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        'relative h-8 w-full justify-start',
        'text-sm text-muted-foreground',
        'sm:w-64 sm:pr-12',
        className
      )}
    >
      <Search className="mr-1 h-4 w-4" />
      <span className="hidden sm:inline-flex">Search...</span>
      <span className="inline-flex sm:hidden">Search</span>
      <span className="pointer-events-none absolute right-1 top-1 hidden select-none items-center gap-1 sm:flex">
        <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-sm font-medium text-muted-foreground">
          ⌘
        </kbd>
        <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
          K
        </kbd>
      </span>
    </Button>
  )
}
