'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  onClose: () => void
  title?: string
  avatar?: string
}

export function ChatHeader({ onClose, title = 'Support', avatar = '/org-ai.png' }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Image
            src={avatar}
            alt={title}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">Typically replies instantly</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8"
        aria-label="Close chat"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
