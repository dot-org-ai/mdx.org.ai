'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  position?: 'bottom-right' | 'bottom-left'
  title?: string
  avatar?: string
}

export function ChatPanel({ isOpen, onClose, position = 'bottom-right', title, avatar }: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Detect mobile and mark as mounted
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    setHasMounted(true)
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const input = panelRef.current.querySelector('textarea')
      input?.focus()
    }
  }, [isOpen])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if dragged down more than 100px or with enough velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
  }

  // Don't render until mounted to avoid hydration mismatch with isMobile
  if (!hasMounted) {
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: isMobile ? '100%' : 20, scale: isMobile ? 1 : 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isMobile ? '100%' : 20, scale: isMobile ? 1 : 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          drag={isMobile ? 'y' : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          className={cn(
            'fixed bottom-24 z-[9999]',
            'w-[380px] max-h-[600px]',
            'flex flex-col',
            'bg-background rounded-2xl',
            'border border-border',
            'shadow-2xl',
            'overflow-hidden',
            position === 'bottom-right' ? 'right-6' : 'left-6',
            // Mobile
            'max-sm:bottom-0 max-sm:right-0 max-sm:left-0',
            'max-sm:w-full max-sm:max-h-[80vh]',
            'max-sm:rounded-b-none'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Chat with support"
        >
          {/* Drag handle indicator for mobile */}
          {isMobile && (
            <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
          )}
          <ChatHeader onClose={onClose} title={title} avatar={avatar} />
          <ChatMessages />
          <ChatInput />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
