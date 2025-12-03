'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EmailCaptureProps {
  onCapture: (email: string) => Promise<void>
  onDismiss: () => void
}

export function EmailCapture({ onCapture, onDismiss }: EmailCaptureProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    setIsSubmitting(true)
    try {
      await onCapture(email)
    } catch {
      setError('Failed to save email. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Get notified of responses</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            We'll email you if we have follow-up information
          </p>

          <form onSubmit={handleSubmit} className="mt-3 space-y-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-sm"
              disabled={isSubmitting}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting} className="h-8">
                {isSubmitting ? 'Saving...' : 'Submit'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 text-muted-foreground"
              >
                No thanks
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
