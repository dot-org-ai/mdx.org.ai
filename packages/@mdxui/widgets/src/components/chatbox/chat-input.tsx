'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useChatContext } from './chat-provider'
import { cn } from '@/lib/utils'

export function ChatInput() {
  const { sendMessage, isTyping, config } = useChatContext()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [value])

  const handleSubmit = () => {
    if (!value.trim() || isTyping) return
    sendMessage(value.trim())
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={config.placeholder ?? 'Type your message...'}
          disabled={isTyping}
          className={cn(
            'min-h-[40px] max-h-[120px] resize-none',
            'border-0 bg-muted/50 focus-visible:ring-0',
            'text-sm'
          )}
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || isTyping}
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Powered by <span className="font-semibold text-foreground">.do</span> &bull; Responses may not always be accurate
      </p>
    </div>
  )
}
