'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatTriggerProps {
  isOpen: boolean
  onToggle: () => void
  unreadCount?: number
  position?: 'bottom-right' | 'bottom-left'
}

export function ChatTrigger({ isOpen, onToggle, unreadCount = 0, position = 'bottom-right' }: ChatTriggerProps) {
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    const hasVisited = localStorage.getItem('chatbox-visited')
    if (!hasVisited) {
      setIsFirstVisit(true)
      localStorage.setItem('chatbox-visited', 'true')
    }
  }, [])

  return (
    <Button
      onClick={onToggle}
      className={cn(
        'fixed z-[9998]',
        'h-14 w-14 rounded-full p-0',
        'bg-primary text-primary-foreground',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        'hover:scale-105',
        isFirstVisit && !isOpen && 'animate-pulse',
        position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'
      )}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <>
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </Button>
  )
}
