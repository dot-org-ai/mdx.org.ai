'use client'

import { useState, useEffect } from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { PreviewPane } from './preview/preview-pane'
import { EditorPane } from './editor/editor-pane'

interface EditorSplitPaneProps {
  content: string
  onChange: (content: string) => void
  path: string
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  onClose?: () => void
}

export function EditorSplitPane({
  content,
  onChange,
  path,
  isDirty,
  isSaving,
  onSave,
  onClose,
}: EditorSplitPaneProps) {
  const [defaultLayout, setDefaultLayout] = useState<number[]>([50, 50])

  // Load saved layout from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('editor-panel-layout')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length === 2) {
            setDefaultLayout(parsed)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [])

  const handleLayout = (sizes: number[]) => {
    localStorage.setItem('editor-panel-layout', JSON.stringify(sizes))
  }

  const handleJumpToLine = (line: number) => {
    // This would need to communicate with the EditorPane
    // For now, we'll use a simple approach via event
    window.dispatchEvent(
      new CustomEvent('editor-jump-to-line', { detail: { line } })
    )
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      onLayout={handleLayout}
      className="h-full"
    >
      <ResizablePanel
        defaultSize={defaultLayout[0]}
        minSize={25}
        className="bg-background"
      >
        <PreviewPane content={content} onJumpToLine={handleJumpToLine} />
      </ResizablePanel>

      <ResizableHandle
        withHandle
        className="w-2 bg-transparent transition-colors data-[resize-handle-active]:bg-border hover:bg-border/50"
      />

      <ResizablePanel
        defaultSize={defaultLayout[1]}
        minSize={30}
        className="bg-background"
      >
        <EditorPane
          content={content}
          onChange={onChange}
          path={path}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={onSave}
          onClose={onClose}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
