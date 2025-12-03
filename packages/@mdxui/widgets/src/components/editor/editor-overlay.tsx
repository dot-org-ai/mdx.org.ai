'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { EditorSplitPane } from './editor-split-pane'
import { MobileEditorTabs } from './mobile/mobile-editor-tabs'
import { useIsMobile, usePrefersReducedMotion } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

interface EditorOverlayProps {
  isOpen: boolean
  onClose: () => void
  content: string
  onChange: (content: string) => void
  path: string
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
}

export function EditorOverlay({
  isOpen,
  onClose,
  content,
  onChange,
  path,
  isDirty,
  isSaving,
  onSave,
}: EditorOverlayProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = usePrefersReducedMotion()

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // SSR guard
  if (typeof window === 'undefined') return null

  // Animation variants
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: prefersReducedMotion ? 0 : 0.2 },
    },
    exit: {
      opacity: 0,
      transition: { duration: prefersReducedMotion ? 0 : 0.15 },
    },
  }

  const panelVariants: Variants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : 20,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeIn',
      },
    },
  }

  const mobilePanelVariants: Variants = {
    hidden: { y: '100%' },
    visible: {
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: {
      y: '100%',
      transition: {
        duration: prefersReducedMotion ? 0 : 0.2,
        ease: 'easeIn',
      },
    },
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            variants={isMobile ? mobilePanelVariants : panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Content editor"
            className={cn(
              'fixed z-[9999] overflow-hidden bg-background shadow-2xl',
              // Desktop: inset with rounded corners
              'md:inset-4 md:rounded-xl md:border md:border-border',
              // Mobile: full screen
              'inset-0 md:inset-4'
            )}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center py-2 md:hidden">
                <div className="h-1 w-12 rounded-full bg-muted" />
              </div>
            )}

            {/* Content */}
            <div className={cn('h-full', isMobile && 'h-[calc(100%-24px)]')}>
              {isMobile ? (
                <MobileEditorTabs
                  content={content}
                  onChange={onChange}
                  path={path}
                  isDirty={isDirty}
                  isSaving={isSaving}
                  onSave={onSave}
                  onClose={onClose}
                />
              ) : (
                <EditorSplitPane
                  content={content}
                  onChange={onChange}
                  path={path}
                  isDirty={isDirty}
                  isSaving={isSaving}
                  onSave={onSave}
                  onClose={onClose}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
