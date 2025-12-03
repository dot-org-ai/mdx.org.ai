'use client'

import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import type { EditorTriggerProps } from '@/lib/types'

export function EditorTrigger({ isOpen, onToggle }: EditorTriggerProps) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  useEffect(() => {
    const onboarded = localStorage.getItem('editor-onboarded') === 'true'

    if (!onboarded) {
      const timer = setTimeout(() => setShowOnboarding(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismissOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem('editor-onboarded', 'true')
  }

  const handleClick = () => {
    if (showOnboarding) {
      handleDismissOnboarding()
    }
    onToggle()
  }

  return (
    <TooltipProvider>
      <Tooltip open={showOnboarding || undefined} delayDuration={400}>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            aria-label={isOpen ? 'Close editor' : 'Edit page content'}
            aria-expanded={isOpen}
            className={cn(
              'fixed bottom-5 left-5 z-9998',
              'flex items-center justify-center',
              'size-11 rounded-full sm:size-9',
              'bg-card/95 backdrop-blur-xl',
              'border border-border',
              'shadow-lg',
              'cursor-pointer select-none',
              'transition-all duration-150',
              'hover:scale-105',
              isPressed && 'scale-95',
              isOpen && 'bg-accent'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center',
                'size-9 rounded-full sm:size-7',
                'transition-colors duration-200',
                'hover:bg-accent',
                isOpen && 'bg-accent'
              )}
            >
              <Pencil className="size-4 text-foreground sm:size-3.5" />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={showOnboarding ? 'top' : 'right'}
          align={showOnboarding ? 'start' : 'center'}
          sideOffset={12}
          className={cn(showOnboarding && 'w-64 p-4')}
        >
          {showOnboarding ? (
            <div>
              <p className="font-medium font-mono">Edit Mode</p>
              <p className="mt-1.5 text-sm opacity-80 py-4 leading-relaxed">
                Edit this page directly. Click here or press{' '}
                <Kbd>⌘ I</Kbd> to open.
              </p>
              <button
                className="mt-3 w-full rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background/90 cursor-pointer"
                onClick={handleDismissOnboarding}
              >
                Got it
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2">
              {isOpen ? 'Close editor' : 'Edit page'}
              <Kbd>⌘I</Kbd>
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
