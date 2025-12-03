'use client'

import { useState, useCallback, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast, Toaster } from '@/components/ui/sonner'
import { EditorTrigger } from './editor-trigger'
import { EditorDrawer } from './editor-drawer'
import { UnsavedChangesDialog } from './modals/unsaved-changes-dialog'
import { RecoveryPrompt } from './modals/recovery-prompt'
import { useAutosave } from '@/hooks/use-autosave'
import type { EditorPanelProps } from '@/lib/types'

export function EditorPanel({
  path = '',
  initialContent = '',
  onSave,
  shortcut = 'meta+i',
  showTrigger = true,
}: EditorPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState(initialContent)
  const [savedContent, setSavedContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

  const isDirty = content !== savedContent

  // Autosave hook
  const {
    showRecoveryPrompt,
    recoveredData,
    clearAutosave,
    handleRestore,
    handleDiscardRecovery,
  } = useAutosave(path, content, isDirty, initialContent)

  // Handle recovery restoration
  const onRestore = useCallback(() => {
    const restored = handleRestore()
    if (restored) {
      setContent(restored)
      toast.success('Changes restored')
    }
  }, [handleRestore])

  // Toggle shortcut
  useHotkeys(
    shortcut,
    () => setIsOpen((prev) => !prev),
    {
      enableOnFormTags: false,
      preventDefault: true,
    },
    [shortcut]
  )

  // Save shortcut (when open)
  useHotkeys(
    'meta+s',
    async (e) => {
      if (!isOpen || !isDirty) return
      e.preventDefault()
      await handleSave()
    },
    {
      enableOnFormTags: true,
      enabled: isOpen,
    },
    [isOpen, isDirty, content]
  )

  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave || !isDirty) return

    setIsSaving(true)
    try {
      await onSave(content)
      setSavedContent(content)
      clearAutosave()
      toast.success('Saved successfully')
    } catch (error) {
      toast.error('Failed to save', {
        description: 'Check your connection and try again.',
        action: {
          label: 'Retry',
          onClick: () => handleSave(),
        },
      })
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }, [content, isDirty, onSave, clearAutosave])

  // Close handler with unsaved changes check
  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowUnsavedDialog(true)
    } else {
      setIsOpen(false)
    }
  }, [isDirty])

  // Unsaved changes dialog handlers
  const handleDiscard = useCallback(() => {
    setShowUnsavedDialog(false)
    setContent(savedContent)
    setIsOpen(false)
  }, [savedContent])

  const handleSaveAndClose = useCallback(async () => {
    setShowUnsavedDialog(false)
    await handleSave()
    setIsOpen(false)
  }, [handleSave])

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false)
  }, [])

  // Sync content when initialContent changes (e.g., after external save)
  useEffect(() => {
    if (!isDirty) {
      setContent(initialContent)
      setSavedContent(initialContent)
    }
  }, [initialContent, isDirty])

  return (
    <>
      {/* Toast container */}
      <Toaster position="bottom-right" />

      {/* Trigger button */}
      {showTrigger && (
        <EditorTrigger
          isOpen={isOpen}
          onToggle={() => (isOpen ? handleClose() : setIsOpen(true))}
        />
      )}

      {/* Editor drawer */}
      <EditorDrawer
        isOpen={isOpen}
        onClose={handleClose}
        content={content}
        onChange={setContent}
        path={path}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
      />

      {/* Unsaved changes dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onDiscard={handleDiscard}
        onSaveAndClose={handleSaveAndClose}
        onCancel={handleCancelClose}
      />

      {/* Recovery prompt */}
      <RecoveryPrompt
        open={showRecoveryPrompt}
        timestamp={recoveredData?.timestamp ?? 0}
        onDiscard={handleDiscardRecovery}
        onRestore={onRestore}
      />
    </>
  )
}
