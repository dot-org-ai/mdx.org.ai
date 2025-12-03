'use client'

import { Smartphone, Tablet, Monitor, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PreviewHeaderProps, Viewport } from '@/lib/types'

export function PreviewHeader({
  viewport,
  onViewportChange,
  zoom,
  onZoomChange,
  scrollSync,
  onScrollSyncChange,
}: PreviewHeaderProps) {
  return (
    <TooltipProvider>
      <div className="flex h-10 items-center justify-between border-b border-border bg-card px-3">
        <span className="text-sm font-medium text-muted-foreground">Preview</span>

        <div className="flex items-center gap-1">
          {/* Scroll sync toggle */}
          {onScrollSyncChange && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('size-8', scrollSync && 'bg-muted')}
                    onClick={() => onScrollSyncChange(!scrollSync)}
                    aria-label="Toggle scroll sync"
                    aria-pressed={scrollSync}
                  >
                    <Link className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Scroll sync</p>
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="mx-1 h-5" />
            </>
          )}

          {/* Viewport toggles */}
          <ToggleGroup
            type="single"
            value={viewport}
            onValueChange={(value) => value && onViewportChange(value as Viewport)}
            aria-label="Preview viewport size"
          >
            <ToggleGroupItem value="mobile" aria-label="Mobile view (375px)">
              <Smartphone className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="tablet" aria-label="Tablet view (768px)">
              <Tablet className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="desktop" aria-label="Desktop view (1280px)">
              <Monitor className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Zoom selector */}
          <Select
            value={String(zoom)}
            onValueChange={(v) => onZoomChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-20 text-xs" aria-label="Zoom level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50%</SelectItem>
              <SelectItem value="75">75%</SelectItem>
              <SelectItem value="100">100%</SelectItem>
              <SelectItem value="125">125%</SelectItem>
              <SelectItem value="150">150%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </TooltipProvider>
  )
}
