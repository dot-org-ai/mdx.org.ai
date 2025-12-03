'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PreviewPane } from '../preview/preview-pane'
import { EditorPane } from '../editor/editor-pane'
import { cn } from '@/lib/utils'

interface MobileEditorTabsProps {
  content: string
  onChange: (content: string) => void
  path: string
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  onClose?: () => void
}

export function MobileEditorTabs({
  content,
  onChange,
  path,
  isDirty,
  isSaving,
  onSave,
  onClose,
}: MobileEditorTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('editor')

  const handleJumpToLine = (line: number) => {
    // Switch to editor tab when jumping to line
    setActiveTab('editor')
    // Dispatch event for editor to handle
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('editor-jump-to-line', { detail: { line } })
      )
    }, 100)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border bg-card h-11">
        <TabsTrigger value="preview" className="rounded-none data-[state=active]:shadow-none">
          Preview
        </TabsTrigger>
        <TabsTrigger value="editor" className="rounded-none data-[state=active]:shadow-none">
          <span className="flex items-center gap-2">
            Editor
            {isDirty && (
              <span className={cn('size-2 rounded-full bg-chart-4')} />
            )}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="preview" className="flex-1 mt-0 data-[state=inactive]:hidden">
        <PreviewPane content={content} onJumpToLine={handleJumpToLine} />
      </TabsContent>

      <TabsContent value="editor" className="flex-1 mt-0 data-[state=inactive]:hidden">
        <EditorPane
          content={content}
          onChange={onChange}
          path={path}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={onSave}
          onClose={onClose}
        />
      </TabsContent>
    </Tabs>
  )
}
