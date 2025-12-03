'use client'

import { useEffect, useRef } from 'react'
import { useChatContext } from './chat-provider'
import { TypingIndicator } from './components/typing-indicator'
import { EmailCapture } from './components/email-capture'
import { WelcomeMessage } from './components/welcome-message'
import { MessageBubble } from './components/message-bubble'
import { ErrorMessage } from './components/error-message'

export function ChatMessages() {
  const { messages, isTyping, showEmailCapture, captureEmail, dismissEmailCapture, config, retryLastMessage } =
    useChatContext()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      role="log"
      aria-live="polite"
    >
      <WelcomeMessage message={config.welcomeMessage} />

      {messages.map((message) =>
        message.isError ? (
          <ErrorMessage key={message.id} error={message.content} onRetry={retryLastMessage} />
        ) : (
          <MessageBubble key={message.id} message={message} />
        )
      )}

      {isTyping && <TypingIndicator />}

      {showEmailCapture && <EmailCapture onCapture={captureEmail} onDismiss={dismissEmailCapture} />}
    </div>
  )
}
