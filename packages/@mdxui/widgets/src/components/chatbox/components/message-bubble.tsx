'use client'

import { cn } from '@/lib/utils'
import type { Message } from '../lib/types'

interface MessageBubbleProps {
  message: Message
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div
      className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] px-4 py-3',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
            : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <span className="text-[10px] opacity-60 mt-1 block">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  )
}
