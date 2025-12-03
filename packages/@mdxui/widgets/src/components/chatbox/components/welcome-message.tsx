'use client'

interface WelcomeMessageProps {
  message?: string
}

export function WelcomeMessage({
  message = "How can I help you today? I'm here to answer questions about our product.",
}: WelcomeMessageProps) {
  return (
    <div className="bg-muted/50 rounded-2xl p-4 border border-border">
      <div className="flex items-start gap-3">
        <span className="text-2xl">👋</span>
        <div>
          <p className="text-sm font-medium">Hi there!</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}
