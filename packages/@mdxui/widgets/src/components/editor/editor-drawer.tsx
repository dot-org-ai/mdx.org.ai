'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { GripVertical, Smartphone, Tablet, Monitor, X, Save, Loader2 } from 'lucide-react'
import { EditorPane } from './editor/editor-pane'
import { usePrefersReducedMotion, useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Kbd } from '@/components/ui/kbd'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Separator } from '@/components/ui/separator'
import type { Viewport } from '@/lib/types'

interface EditorDrawerProps {
  isOpen: boolean
  onClose: () => void
  content: string
  onChange: (content: string) => void
  path: string
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
}

const MIN_WIDTH = 320
const DEFAULT_WIDTH = 500
const MIN_CONTENT_WIDTH = 375 // Mobile viewport - minimum content area when editor is open

// Viewport widths in pixels (for constraining the page content)
const viewportWidths: Record<Viewport, number | null> = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
}

export function EditorDrawer({
  isOpen,
  onClose,
  content,
  onChange,
  path,
  isDirty,
  isSaving,
  onSave,
}: EditorDrawerProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMobile = useIsMobile() ?? false
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_WIDTH)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [isResizing, setIsResizing] = useState(false)
  const [contentWidth, setContentWidth] = useState(0)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Calculate content width (only relevant on desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateContentWidth = () => {
      // On mobile, drawer is full-screen so content width is 0
      setContentWidth(isMobile ? 0 : window.innerWidth - drawerWidth)
    }
    updateContentWidth()
    window.addEventListener('resize', updateContentWidth)
    return () => window.removeEventListener('resize', updateContentWidth)
  }, [drawerWidth, isMobile])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResizing) {
        onClose()
      }
    },
    [onClose, isResizing]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Resize handling
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = window.innerWidth - MIN_CONTENT_WIDTH
      const newWidth = window.innerWidth - e.clientX
      setDrawerWidth(Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Add cursor style to body during resize
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Apply viewport constraint to page content
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    if (!isOpen) {
      // Reset CSS custom properties when drawer closes
      root.style.removeProperty('--editor-drawer-width')
      root.style.removeProperty('--editor-viewport-width')
      return
    }

    // On mobile, drawer overlays full-screen so don't shrink page content
    if (isMobile) {
      root.style.removeProperty('--editor-drawer-width')
      root.style.removeProperty('--editor-viewport-width')
      return
    }

    // Set CSS custom properties for the drawer (desktop only)
    root.style.setProperty('--editor-drawer-width', `${drawerWidth}px`)

    // Set viewport constraint
    const vpWidth = viewportWidths[viewport]
    if (vpWidth) {
      root.style.setProperty('--editor-viewport-width', `${vpWidth}px`)
    } else {
      root.style.removeProperty('--editor-viewport-width')
    }

    return () => {
      root.style.removeProperty('--editor-drawer-width')
      root.style.removeProperty('--editor-viewport-width')
    }
  }, [isOpen, drawerWidth, viewport, isMobile])

  // Animation variants for slide-in from right
  const drawerVariants: Variants = {
    hidden: {
      x: '100%',
    },
    visible: {
      x: 0,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
        duration: prefersReducedMotion ? 0 : undefined,
      },
    },
    exit: {
      x: '100%',
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300,
        duration: prefersReducedMotion ? 0 : undefined,
      },
    },
  }

  // SSR guard for portal
  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={drawerRef}
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label="Content editor"
          data-editor-drawer-open="true"
          style={isMobile ? undefined : { width: drawerWidth }}
          className={cn(
            'fixed right-0 top-0 z-9999 h-full',
            'flex flex-col',
            'border-l border-border bg-background text-foreground shadow-2xl',
            isResizing && 'select-none',
            // Full-screen on mobile
            isMobile && 'w-full'
          )}
        >
          {/* Resize handle - hidden on mobile */}
          {!isMobile && (
            <div
              onMouseDown={handleResizeStart}
              className={cn(
                'absolute left-0 top-0 z-10 h-full w-px cursor-ew-resize',
                'group flex items-center justify-center',
                'hover:bg-primary/10 active:bg-primary/20',
                'transition-colors',
                isResizing && 'bg-primary/20'
              )}
            >
              <div
                className={cn(
                  'absolute left-0 flex h-10 w-4 -translate-x-1/2 items-center justify-center',
                  'rounded-md border border-border bg-card opacity-0 transition-opacity shadow-sm',
                  'group-hover:opacity-100',
                  isResizing && 'opacity-100'
                )}
              >
                <GripVertical className="size-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Header */}
          <TooltipProvider>
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground truncate max-w-[150px]">
                  {path || 'untitled.mdx'}
                </span>

                {/* Viewport toggles - hidden on mobile (not relevant) */}
                {!isMobile && (
                  <>
                    <Separator orientation="vertical" className="h-5" />

                    <ToggleGroup
                      type="single"
                      size="sm"
                      value={viewport}
                      onValueChange={(value) => value && setViewport(value as Viewport)}
                      aria-label="Preview viewport size"
                    >
                      <ToggleGroupItem value="mobile" aria-label="Mobile view (375px)">
                        <Smartphone className="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="tablet" aria-label="Tablet view (768px)">
                        <Tablet className="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="desktop" aria-label="Desktop view (1280px)">
                        <Monitor className="size-3.5" />
                      </ToggleGroupItem>
                    </ToggleGroup>

                    <Separator orientation="vertical" className="h-5" />

                    {/* Width indicator */}
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {contentWidth}px
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {onSave && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSave}
                        disabled={isSaving || !isDirty}
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
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="flex items-center gap-2">
                        Save <Kbd keys={['⌘', 'S']} />
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close editor"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </TooltipProvider>

          {/* Editor content */}
          <div className="flex-1 overflow-hidden">
            <EditorPane
              content={content}
              onChange={onChange}
              path={path}
              isDirty={isDirty}
              isSaving={isSaving}
              onSave={onSave}
              onClose={onClose}
              hideHeader
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
