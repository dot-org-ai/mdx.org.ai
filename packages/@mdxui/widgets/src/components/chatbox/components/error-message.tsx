'use client'

import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorMessageProps {
  error: string
  onRetry?: () => void
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="bg-muted text-muted-foreground px-4 py-3 rounded-2xl rounded-bl-sm max-w-[80%]">
        <p className="text-sm">{error}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="mt-2 h-6 text-xs">
            <RotateCcw className="h-2 w-2" />
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
